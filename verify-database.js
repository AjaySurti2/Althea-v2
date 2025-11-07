/**
 * Database Connection and Schema Verification Script
 *
 * This script verifies:
 * 1. Supabase connection is working
 * 2. Required tables exist
 * 3. Storage buckets are configured
 * 4. RLS policies are in place
 *
 * Run with: node verify-database.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Expected tables from schema
const EXPECTED_TABLES = [
  'profiles',
  'leads',
  'family_members',
  'patients',
  'sessions',
  'files',
  'parsed_documents',
  'lab_reports',
  'test_results',
  'health_metrics',
  'health_insights',
  'user_insight_preferences',
  'report_generation_history',
  'health_reports',
  'report_pdfs',
  'family_patterns',
  'family_health_analytics',
  'ai_summaries',
  'reminders'
];

// Expected storage buckets
const EXPECTED_BUCKETS = [
  'medical-files',
  'report-pdfs',
  'health-reports'
];

async function verifyConnection() {
  console.log('🔍 Verifying Supabase connection...\n');

  try {
    // Test connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);

    if (error && error.message.includes('relation "public.profiles" does not exist')) {
      console.log('⚠️  Connection successful, but tables not created yet');
      console.log('📝 Run migrations to create schema:');
      console.log('   npx supabase db push\n');
      return { connected: true, tablesExist: false };
    } else if (error) {
      console.error('❌ Connection error:', error.message);
      return { connected: false, tablesExist: false };
    }

    console.log('✅ Database connection successful\n');
    return { connected: true, tablesExist: true };
  } catch (err) {
    console.error('❌ Failed to connect:', err.message);
    return { connected: false, tablesExist: false };
  }
}

async function verifyTables() {
  console.log('🔍 Checking database tables...\n');

  try {
    // Query to get all tables in public schema
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `
    });

    if (error) {
      // Try alternative method
      const tables = [];
      for (const table of EXPECTED_TABLES) {
        const { error: tableError } = await supabase
          .from(table)
          .select('count')
          .limit(1);

        if (!tableError) {
          tables.push(table);
        }
      }

      console.log(`✅ Found ${tables.length}/${EXPECTED_TABLES.length} expected tables`);

      const missingTables = EXPECTED_TABLES.filter(t => !tables.includes(t));
      if (missingTables.length > 0) {
        console.log('\n⚠️  Missing tables:');
        missingTables.forEach(table => console.log(`   - ${table}`));
        console.log('\n📝 Apply migrations to create missing tables');
      }

      return tables;
    }

    const existingTables = data?.map(row => row.table_name) || [];
    console.log(`✅ Found ${existingTables.length} tables in database`);

    const ourTables = existingTables.filter(t => EXPECTED_TABLES.includes(t));
    console.log(`✅ Found ${ourTables.length}/${EXPECTED_TABLES.length} expected tables\n`);

    if (ourTables.length < EXPECTED_TABLES.length) {
      const missing = EXPECTED_TABLES.filter(t => !ourTables.includes(t));
      console.log('⚠️  Missing tables:');
      missing.forEach(table => console.log(`   - ${table}`));
      console.log('\n📝 Apply migrations to create missing tables\n');
    }

    return ourTables;
  } catch (err) {
    console.error('❌ Error checking tables:', err.message);
    return [];
  }
}

async function verifyStorageBuckets() {
  console.log('🔍 Checking storage buckets...\n');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Error listing buckets:', error.message);
      return [];
    }

    console.log(`✅ Found ${buckets.length} storage buckets`);

    const bucketNames = buckets.map(b => b.name);
    const ourBuckets = bucketNames.filter(b => EXPECTED_BUCKETS.includes(b));
    console.log(`✅ Found ${ourBuckets.length}/${EXPECTED_BUCKETS.length} expected buckets\n`);

    if (ourBuckets.length < EXPECTED_BUCKETS.length) {
      const missing = EXPECTED_BUCKETS.filter(b => !ourBuckets.includes(b));
      console.log('⚠️  Missing buckets:');
      missing.forEach(bucket => console.log(`   - ${bucket}`));
      console.log('\n📝 Apply storage migrations to create missing buckets\n');
    } else {
      console.log('Existing buckets:');
      ourBuckets.forEach(bucket => {
        const bucketInfo = buckets.find(b => b.name === bucket);
        console.log(`   - ${bucket} (${bucketInfo.public ? 'public' : 'private'})`);
      });
      console.log();
    }

    return ourBuckets;
  } catch (err) {
    console.error('❌ Error checking storage:', err.message);
    return [];
  }
}

async function verifyRLS() {
  console.log('🔍 Checking Row Level Security (RLS)...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `
    });

    if (error) {
      console.log('⚠️  Unable to check RLS status (requires service role key)');
      console.log('   RLS should be enabled on all tables\n');
      return;
    }

    const tables = data || [];
    const rlsEnabled = tables.filter(t => t.rowsecurity);
    const rlsDisabled = tables.filter(t => !t.rowsecurity);

    console.log(`✅ RLS enabled on ${rlsEnabled.length} tables`);

    if (rlsDisabled.length > 0) {
      console.log(`\n⚠️  RLS disabled on ${rlsDisabled.length} tables:`);
      rlsDisabled.forEach(table => console.log(`   - ${table.tablename}`));
      console.log('\n⚠️  This is a security risk! Enable RLS on all user data tables\n');
    } else {
      console.log('✅ All tables have RLS enabled\n');
    }
  } catch (err) {
    console.log('⚠️  Unable to verify RLS:', err.message, '\n');
  }
}

async function getMigrationStatus() {
  console.log('🔍 Checking migration status...\n');

  try {
    const { data, error } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version')
      .order('version', { ascending: false });

    if (error) {
      console.log('⚠️  Unable to check migrations (table may not exist yet)\n');
      return 0;
    }

    const appliedCount = data?.length || 0;
    console.log(`✅ ${appliedCount} migrations applied`);

    if (appliedCount > 0) {
      console.log(`   Latest: ${data[0].version}\n`);
    } else {
      console.log('   No migrations applied yet\n');
    }

    return appliedCount;
  } catch (err) {
    console.log('⚠️  Unable to check migration status\n');
    return 0;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Althea Health - Database Verification Tool');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📋 Configuration:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Project: ${supabaseUrl.split('//')[1].split('.')[0]}\n`);

  const { connected, tablesExist } = await verifyConnection();

  if (!connected) {
    console.log('\n❌ Database connection failed!');
    console.log('📝 Check your .env file and network connection\n');
    process.exit(1);
  }

  if (!tablesExist) {
    console.log('📝 Next steps:');
    console.log('   1. Apply migrations: npx supabase db push');
    console.log('   2. Run this script again to verify\n');
    process.exit(0);
  }

  const tables = await verifyTables();
  const buckets = await verifyStorageBuckets();
  await verifyRLS();
  const migrationsApplied = await getMigrationStatus();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`✅ Database connection: Working`);
  console.log(`✅ Tables: ${tables.length}/${EXPECTED_TABLES.length}`);
  console.log(`✅ Storage buckets: ${buckets.length}/${EXPECTED_BUCKETS.length}`);
  console.log(`✅ Migrations applied: ${migrationsApplied}`);

  const allGood =
    tables.length === EXPECTED_TABLES.length &&
    buckets.length === EXPECTED_BUCKETS.length;

  if (allGood) {
    console.log('\n🎉 Database is fully configured and ready to use!\n');
  } else {
    console.log('\n⚠️  Database setup incomplete. Apply missing migrations.\n');
  }
}

main().catch(console.error);
