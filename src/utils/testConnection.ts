import { supabase } from '../lib/supabase';

/**
 * Test Supabase database connection
 * Returns connection status and any errors
 */
export async function testSupabaseConnection() {
  try {
    // Test 1: Check if client is initialized
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    console.log('✓ Supabase client initialized');

    // Test 2: Check environment variables
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Missing environment variables');
    }
    console.log('✓ Environment variables loaded');
    console.log('  URL:', url);
    console.log('  Key length:', key.length, 'characters');

    // Test 3: Verify connection with a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('✗ Connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }

    console.log('✓ Successfully connected to Supabase database');
    return {
      success: true,
      message: 'Connection successful',
      data
    };

  } catch (error) {
    console.error('✗ Connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
}

/**
 * Test authentication functionality
 */
export async function testAuth() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('✗ Auth test failed:', error.message);
      return { success: false, error: error.message };
    }

    if (data.session) {
      console.log('✓ User is authenticated');
      console.log('  User ID:', data.session.user.id);
      console.log('  Email:', data.session.user.email);
    } else {
      console.log('ℹ No active session');
    }

    return {
      success: true,
      authenticated: !!data.session,
      session: data.session
    };

  } catch (error) {
    console.error('✗ Auth error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run all connection tests
 */
export async function runAllTests() {
  console.log('🔍 Running Supabase connection tests...\n');

  const connectionTest = await testSupabaseConnection();
  const authTest = await testAuth();

  console.log('\n📊 Test Results:');
  console.log('  Connection:', connectionTest.success ? '✓' : '✗');
  console.log('  Authentication:', authTest.success ? '✓' : '✗');

  return {
    connection: connectionTest,
    auth: authTest,
    allPassed: connectionTest.success && authTest.success
  };
}
