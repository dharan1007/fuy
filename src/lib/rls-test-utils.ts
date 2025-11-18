/**
 * RLS Testing Utilities
 * Helper functions for testing Row Level Security policies
 */

import { createClient } from '@supabase/supabase-js';

interface TestResult {
  name: string;
  table: string;
  operation: string;
  expected: 'allow' | 'deny';
  actual: 'allow' | 'deny';
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestSuite {
  category: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  totalTime: number;
}

/**
 * Create an authenticated Supabase client for a specific user
 */
export function createAuthenticatedClient(authToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    },
  });

  return client;
}

/**
 * Test SELECT operation with RLS
 */
export async function testSelect(
  client: any,
  table: string,
  filters?: Record<string, any>
): Promise<{ success: boolean; rowCount: number; error?: string }> {
  try {
    let query = client.from(table).select('*');

    // Apply filters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, rowCount: 0, error: error.message };
    }

    return { success: true, rowCount: Array.isArray(data) ? data.length : 0 };
  } catch (error) {
    return {
      success: false,
      rowCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test INSERT operation with RLS
 */
export async function testInsert(
  client: any,
  table: string,
  data: Record<string, any>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: result, error } = await client.from(table).insert([data]);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      id: result?.[0]?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test UPDATE operation with RLS
 */
export async function testUpdate(
  client: any,
  table: string,
  id: string,
  data: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await client
      .from(table)
      .update(data)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test DELETE operation with RLS
 */
export async function testDelete(
  client: any,
  table: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await client.from(table).delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run a single RLS test
 */
export async function runTest(
  name: string,
  table: string,
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  testFn: () => Promise<{ success: boolean; error?: string }>,
  expectedResult: 'allow' | 'deny'
): Promise<TestResult> {
  const startTime = performance.now();

  try {
    const result = await testFn();
    const duration = performance.now() - startTime;

    const passed =
      (result.success && expectedResult === 'allow') ||
      (!result.success && expectedResult === 'deny');

    return {
      name,
      table,
      operation,
      expected: expectedResult,
      actual: result.success ? 'allow' : 'deny',
      passed,
      error: result.error,
      duration,
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      name,
      table,
      operation,
      expected: expectedResult,
      actual: 'deny',
      passed: expectedResult === 'deny',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

/**
 * Generate test report
 */
export function generateTestReport(suites: TestSuite[]): string {
  const totalTests = suites.reduce((sum, s) => sum + s.tests.length, 0);
  const totalPassed = suites.reduce((sum, s) => sum + s.passed, 0);
  const totalFailed = suites.reduce((sum, s) => sum + s.failed, 0);
  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : '0';
  const totalTime = suites.reduce((sum, s) => sum + s.totalTime, 0);

  let report = `
╔════════════════════════════════════════════════════════════════╗
║                    RLS TEST REPORT                             ║
╚════════════════════════════════════════════════════════════════╝

SUMMARY
─────────────────────────────────────────────────────────────────
Total Tests:        ${totalTests}
Passed:             ${totalPassed}
Failed:             ${totalFailed}
Pass Rate:          ${passRate}%
Total Time:         ${(totalTime / 1000).toFixed(2)}s

`;

  for (const suite of suites) {
    report += `
CATEGORY: ${suite.category}
─────────────────────────────────────────────────────────────────
Tests: ${suite.tests.length} | Passed: ${suite.passed} | Failed: ${suite.failed}
Duration: ${(suite.totalTime / 1000).toFixed(2)}s

`;

    for (const test of suite.tests) {
      const status = test.passed ? '✓ PASS' : '✗ FAIL';
      const duration = test.duration.toFixed(0);

      report += `  ${status} | ${test.name}
         Table: ${test.table} | Op: ${test.operation}
         Expected: ${test.expected.toUpperCase()} | Actual: ${test.actual.toUpperCase()}
         Duration: ${duration}ms`;

      if (test.error) {
        report += `\n         Error: ${test.error}`;
      }

      report += '\n';
    }
  }

  report += `
╚════════════════════════════════════════════════════════════════╝
`;

  return report;
}

/**
 * Helper to check RLS policy by attempting operation
 */
export async function checkRLSPolicy(
  client: any,
  table: string,
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  testData?: Record<string, any>
): Promise<{
  allowed: boolean;
  reason: string;
}> {
  try {
    if (operation === 'SELECT') {
      const result = await testSelect(client, table);
      return {
        allowed: result.success,
        reason: result.error || 'Query executed successfully',
      };
    }

    if (operation === 'INSERT' && testData) {
      const result = await testInsert(client, table, testData);
      return {
        allowed: result.success,
        reason: result.error || 'Insert executed successfully',
      };
    }

    return {
      allowed: false,
      reason: 'Invalid operation or missing test data',
    };
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test multiple tables for public read access
 */
export async function testPublicReadAccess(
  unauthenticatedClient: any,
  tables: string[]
): Promise<
  Array<{
    table: string;
    accessible: boolean;
    error?: string;
  }>
> {
  const results = [];

  for (const table of tables) {
    const result = await testSelect(unauthenticatedClient, table);
    results.push({
      table,
      accessible: result.success,
      error: result.error,
    });
  }

  return results;
}

/**
 * Batch test operation across multiple users
 */
export async function batchTestOperation(
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  testDataByUser: Record<string, Record<string, any>>,
  userClients: Record<string, any>
): Promise<Array<{ user: string; success: boolean; error?: string }>> {
  const results = [];

  for (const [user, client] of Object.entries(userClients)) {
    const testData = testDataByUser[user];

    try {
      let result;

      if (operation === 'SELECT') {
        result = await testSelect(client, table, testData);
      } else if (operation === 'INSERT') {
        result = await testInsert(client, table, testData);
      } else if (operation === 'UPDATE' && testData?.id) {
        result = await testUpdate(client, table, testData.id, testData);
      } else if (operation === 'DELETE' && testData?.id) {
        result = await testDelete(client, table, testData.id);
      }

      results.push({
        user,
        success: result?.success || false,
        error: result?.error,
      });
    } catch (error) {
      results.push({
        user,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
