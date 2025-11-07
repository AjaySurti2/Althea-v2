/**
 * Data Migration Script: Bolt DB → New Supabase Project
 *
 * This script helps migrate data from your Bolt DB project to the new
 * collaborator Supabase project without duplicating the schema.
 *
 * IMPORTANT: This script requires connection details for BOTH databases.
 *
 * Usage:
 * 1. Set environment variables for both databases
 * 2. Run: node migrate-data-from-bolt.js
 *
 * Environment Variables Required:
 * - BOLT_SUPABASE_URL - Your original Bolt DB project URL
 * - BOLT_SUPABASE_SERVICE_KEY - Bolt DB service role key
 * - VITE_SUPABASE_URL - New collaborator project URL (from .env)
 * - SUPABASE_SERVICE_ROLE_KEY - New project service key (from .env)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Source database (Bolt DB)
const boltUrl = process.env.BOLT_SUPABASE_URL;
const boltKey = process.env.BOLT_SUPABASE_SERVICE_KEY;

// Target database (New collaborator project)
const targetUrl = process.env.VITE_SUPABASE_URL;
const targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!boltUrl || !boltKey) {
  console.error('❌ Missing Bolt DB credentials!');
  console.error('Set BOLT_SUPABASE_URL and BOLT_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

if (!targetUrl || !targetKey) {
  console.error('❌ Missing target database credentials!');
  console.error('Check your .env file');
  process.exit(1);
}

const boltDb = createClient(boltUrl, boltKey);
const targetDb = createClient(targetUrl, targetKey);

// Tables to migrate in dependency order
const MIGRATION_ORDER = [
  // Level 1: No dependencies
  'profiles',
  'leads',

  // Level 2: Depends on profiles/users
  'family_members',
  'user_insight_preferences',

  // Level 3: Depends on family_members
  'patients',
  'sessions',

  // Level 4: Depends on sessions
  'files',
  'health_reports',

  // Level 5: Depends on files/sessions
  'parsed_documents',
  'lab_reports',
  'health_insights',

  // Level 6: Depends on lab_reports
  'test_results',

  // Level 7: Other tables
  'health_metrics',
  'family_patterns',
  'family_health_analytics',
  'ai_summaries',
  'report_pdfs',
  'report_generation_history',
  'reminders'
];

async function checkConnections() {
  console.log('🔍 Verifying database connections...\n');

  try {
    // Check Bolt DB
    const { error: boltError } = await boltDb
      .from('profiles')
      .select('count')
      .limit(1);

    if (boltError) {
      console.error('❌ Cannot connect to Bolt DB:', boltError.message);
      return false;
    }
    console.log('✅ Bolt DB connection: OK');

    // Check Target DB
    const { error: targetError } = await targetDb
      .from('profiles')
      .select('count')
      .limit(1);

    if (targetError && targetError.message.includes('does not exist')) {
      console.error('❌ Target database schema not initialized!');
      console.error('   Run migrations first: npx supabase db push');
      return false;
    } else if (targetError) {
      console.error('❌ Cannot connect to target DB:', targetError.message);
      return false;
    }
    console.log('✅ Target DB connection: OK\n');

    return true;
  } catch (err) {
    console.error('❌ Connection check failed:', err.message);
    return false;
  }
}

async function getRowCount(client, table) {
  try {
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

async function migrateTable(tableName) {
  console.log(`\n📦 Migrating table: ${tableName}`);

  try {
    // Get source data count
    const sourceCount = await getRowCount(boltDb, tableName);
    console.log(`   Source rows: ${sourceCount}`);

    if (sourceCount === 0) {
      console.log('   ⏭️  Skipping (no data)');
      return { success: true, migrated: 0 };
    }

    // Get target data count
    const targetCount = await getRowCount(targetDb, tableName);
    console.log(`   Target rows: ${targetCount}`);

    // Fetch all data from source
    const { data: sourceData, error: fetchError } = await boltDb
      .from(tableName)
      .select('*');

    if (fetchError) {
      console.error(`   ❌ Error fetching data: ${fetchError.message}`);
      return { success: false, migrated: 0 };
    }

    if (!sourceData || sourceData.length === 0) {
      console.log('   ⏭️  No data to migrate');
      return { success: true, migrated: 0 };
    }

    // Insert data into target in batches
    const BATCH_SIZE = 100;
    let migrated = 0;

    for (let i = 0; i < sourceData.length; i += BATCH_SIZE) {
      const batch = sourceData.slice(i, i + BATCH_SIZE);

      const { error: insertError } = await targetDb
        .from(tableName)
        .insert(batch);

      if (insertError) {
        // Check if error is due to duplicate key
        if (insertError.message.includes('duplicate') ||
            insertError.message.includes('already exists')) {
          console.log(`   ⚠️  Some records already exist (skipping duplicates)`);
          migrated += batch.length;
        } else {
          console.error(`   ❌ Error inserting batch: ${insertError.message}`);
          return { success: false, migrated };
        }
      } else {
        migrated += batch.length;
      }

      // Progress indicator
      if (sourceData.length > 100) {
        const progress = Math.round((migrated / sourceData.length) * 100);
        console.log(`   Progress: ${progress}% (${migrated}/${sourceData.length})`);
      }
    }

    console.log(`   ✅ Migrated ${migrated} rows`);
    return { success: true, migrated };

  } catch (err) {
    console.error(`   ❌ Migration failed: ${err.message}`);
    return { success: false, migrated: 0 };
  }
}

async function migrateStorageFiles(bucketName) {
  console.log(`\n📦 Migrating storage bucket: ${bucketName}`);

  try {
    // List files in source bucket
    const { data: files, error: listError } = await boltDb.storage
      .from(bucketName)
      .list();

    if (listError) {
      if (listError.message.includes('not found')) {
        console.log('   ⏭️  Bucket does not exist in source');
        return { success: true, migrated: 0 };
      }
      console.error(`   ❌ Error listing files: ${listError.message}`);
      return { success: false, migrated: 0 };
    }

    if (!files || files.length === 0) {
      console.log('   ⏭️  No files to migrate');
      return { success: true, migrated: 0 };
    }

    console.log(`   Found ${files.length} files`);

    let migrated = 0;

    for (const file of files) {
      // Download file from source
      const { data: fileData, error: downloadError } = await boltDb.storage
        .from(bucketName)
        .download(file.name);

      if (downloadError) {
        console.error(`   ❌ Error downloading ${file.name}: ${downloadError.message}`);
        continue;
      }

      // Upload file to target
      const { error: uploadError } = await targetDb.storage
        .from(bucketName)
        .upload(file.name, fileData, {
          upsert: true,
          contentType: file.metadata?.mimetype
        });

      if (uploadError) {
        console.error(`   ❌ Error uploading ${file.name}: ${uploadError.message}`);
      } else {
        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   Progress: ${migrated}/${files.length} files`);
        }
      }
    }

    console.log(`   ✅ Migrated ${migrated}/${files.length} files`);
    return { success: true, migrated };

  } catch (err) {
    console.error(`   ❌ Storage migration failed: ${err.message}`);
    return { success: false, migrated: 0 };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Althea Health - Data Migration Tool');
  console.log('  Bolt DB → New Collaborator Project');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📋 Configuration:');
  console.log(`   Source: ${boltUrl.split('//')[1].split('.')[0]}`);
  console.log(`   Target: ${targetUrl.split('//')[1].split('.')[0]}\n`);

  console.log('⚠️  WARNING: This will copy data from Bolt DB to new database');
  console.log('⚠️  Ensure target database schema is initialized!\n');

  // Check connections
  const connected = await checkConnections();
  if (!connected) {
    console.error('\n❌ Migration aborted due to connection issues\n');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Starting Data Migration');
  console.log('═══════════════════════════════════════════════════════');

  const results = {
    tables: {},
    storage: {}
  };

  // Migrate tables in dependency order
  for (const table of MIGRATION_ORDER) {
    const result = await migrateTable(table);
    results.tables[table] = result;
  }

  // Migrate storage buckets
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Migrating Storage Buckets');
  console.log('═══════════════════════════════════════════════════════');

  const buckets = ['medical-files', 'report-pdfs', 'health-reports'];
  for (const bucket of buckets) {
    const result = await migrateStorageFiles(bucket);
    results.storage[bucket] = result;
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Migration Summary');
  console.log('═══════════════════════════════════════════════════════\n');

  let totalRows = 0;
  let successfulTables = 0;

  console.log('Tables:');
  for (const [table, result] of Object.entries(results.tables)) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${table}: ${result.migrated} rows`);
    if (result.success) successfulTables++;
    totalRows += result.migrated;
  }

  console.log('\nStorage:');
  let totalFiles = 0;
  for (const [bucket, result] of Object.entries(results.storage)) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${bucket}: ${result.migrated} files`);
    totalFiles += result.migrated;
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`✅ Migrated ${totalRows} rows across ${successfulTables} tables`);
  console.log(`✅ Migrated ${totalFiles} files across storage buckets`);
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📝 Next steps:');
  console.log('   1. Verify data in target database');
  console.log('   2. Test application functionality');
  console.log('   3. Update production environment variables');
  console.log('   4. Monitor for any issues\n');
}

main().catch(console.error);
