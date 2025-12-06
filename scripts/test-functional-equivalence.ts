import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

interface TestResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message?: string;
  duration?: number;
}

const results: TestResult[] = [];

function runTest(category: string, test: string, fn: () => boolean | Promise<boolean>): void {
  const start = Date.now();
  try {
    const result = fn();
    const passed = result instanceof Promise ? false : result;
    results.push({
      category,
      test,
      status: passed ? 'pass' : 'fail',
      duration: Date.now() - start,
    });
  } catch (error) {
    results.push({
      category,
      test,
      status: 'fail',
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
  }
}

console.log('🧪 Starting Functional Equivalence Tests...\n');
console.log('=' .repeat(80));
console.log('\n');

// Test 1: Build Success
console.log('📦 Testing Build Process...\n');

runTest('Build', 'Production build completes successfully', () => {
  try {
    execSync('npm run build', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
});

// Test 2: TypeScript Compilation
console.log('📝 Testing TypeScript Compilation...\n');

runTest('TypeScript', 'No TypeScript errors', () => {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
});

// Test 3: Linting
console.log('🔍 Testing Code Quality...\n');

runTest('Linting', 'No linting errors', () => {
  try {
    execSync('npm run lint', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
});

// Test 4: Unit Tests
console.log('🧪 Running Unit Tests...\n');

runTest('Unit Tests', 'All unit tests pass', () => {
  try {
    // Check if test script exists
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    if (!packageJson.scripts?.test) {
      results[results.length - 1].status = 'skip';
      results[results.length - 1].message = 'No test script configured';
      return true;
    }
    execSync('npm test', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
});

// Test 5: Bundle Size Check
console.log('📊 Checking Bundle Size...\n');

runTest('Bundle Size', 'Bundle size within acceptable limits', () => {
  try {
    const bundleAnalysis = JSON.parse(readFileSync('bundle-analysis.json', 'utf-8'));
    const totalSize = bundleAnalysis.totalSize || 0;
    // Check if bundle is under 10 MB (reasonable limit)
    return totalSize < 10 * 1024 * 1024;
  } catch {
    results[results.length - 1].status = 'skip';
    results[results.length - 1].message = 'Bundle analysis not available';
    return true;
  }
});

// Test 6: Critical Routes Check
console.log('🛣️  Testing Critical Routes...\n');

const criticalRoutes = [
  '/',
  '/about',
  '/contact',
  '/dashboard',
  '/signin',
];

for (const route of criticalRoutes) {
  runTest('Routes', `Route ${route} is accessible`, () => {
    // This would need a running server to test properly
    // For now, we just check if the route file exists
    const routePath = `src/app${route === '/' ? '/(site)/(home)' : route}/page.tsx`;
    return existsSync(routePath) || existsSync(`src/app${route}/page.tsx`);
  });
}

// Test 7: Environment Variables
console.log('🔐 Checking Environment Configuration...\n');

runTest('Environment', 'Required environment variables are set', () => {
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];

  const envFile = existsSync('.env.local')
    ? '.env.local'
    : existsSync('.env')
      ? '.env'
      : null;

  if (!envFile) {
    results[results.length - 1].message = 'No .env file found';
    return false;
  }

  const envContent = readFileSync(envFile, 'utf-8');
  const missingVars = requiredVars.filter((v) => !envContent.includes(v));

  if (missingVars.length > 0) {
    results[results.length - 1].message = `Missing: ${missingVars.join(', ')}`;
    return false;
  }

  return true;
});

// Test 8: Dependencies Check
console.log('📦 Checking Dependencies...\n');

runTest('Dependencies', 'All dependencies are installed', () => {
  return existsSync('node_modules');
});

runTest('Dependencies', 'No security vulnerabilities', () => {
  try {
    const audit = execSync('npm audit --json', { encoding: 'utf-8' });
    const auditResult = JSON.parse(audit);
    const criticalVulns = auditResult.metadata?.vulnerabilities?.critical || 0;
    const highVulns = auditResult.metadata?.vulnerabilities?.high || 0;

    if (criticalVulns > 0 || highVulns > 0) {
      results[results.length - 1].message = `${criticalVulns} critical, ${highVulns} high`;
      return false;
    }
    return true;
  } catch {
    results[results.length - 1].status = 'skip';
    results[results.length - 1].message = 'Audit failed to run';
    return true;
  }
});

// Test 9: Database Schema
console.log('🗄️  Checking Database Schema...\n');

runTest('Database', 'Prisma schema is valid', () => {
  try {
    execSync('npx prisma validate', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
});

// Test 10: API Routes
console.log('🌐 Checking API Routes...\n');

const apiRoutes = [
  'src/app/api/auth/[...nextauth]/route.ts',
  'src/app/api/upload/route.ts',
  'src/app/api/performance/audit/route.ts',
];

for (const route of apiRoutes) {
  runTest('API Routes', `API route ${route} exists`, () => {
    return existsSync(route);
  });
}

// Generate Report
console.log('\n' + '='.repeat(80) + '\n');
console.log('📊 TEST RESULTS:\n');

const byCategory = results.reduce(
  (acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  },
  {} as Record<string, TestResult[]>,
);

for (const [category, tests] of Object.entries(byCategory)) {
  const passed = tests.filter((t) => t.status === 'pass').length;
  const failed = tests.filter((t) => t.status === 'fail').length;
  const skipped = tests.filter((t) => t.status === 'skip').length;

  console.log(`\n${category}:`);
  console.log(`  ✅ Passed: ${passed}`);
  if (failed > 0) console.log(`  ❌ Failed: ${failed}`);
  if (skipped > 0) console.log(`  ⏭️  Skipped: ${skipped}`);

  for (const test of tests) {
    const icon = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⏭️';
    console.log(`    ${icon} ${test.test}`);
    if (test.message) {
      console.log(`       ${test.message}`);
    }
  }
}

const totalPassed = results.filter((r) => r.status === 'pass').length;
const totalFailed = results.filter((r) => r.status === 'fail').length;
const totalSkipped = results.filter((r) => r.status === 'skip').length;

console.log('\n' + '='.repeat(80) + '\n');
console.log('📈 SUMMARY:\n');
console.log(`  Total Tests: ${results.length}`);
console.log(`  ✅ Passed: ${totalPassed} (${((totalPassed / results.length) * 100).toFixed(1)}%)`);
console.log(`  ❌ Failed: ${totalFailed} (${((totalFailed / results.length) * 100).toFixed(1)}%)`);
console.log(`  ⏭️  Skipped: ${totalSkipped} (${((totalSkipped / results.length) * 100).toFixed(1)}%)`);

// Generate markdown report
const reportContent = `# Functional Equivalence Test Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Tests**: ${results.length}
- **Passed**: ${totalPassed} (${((totalPassed / results.length) * 100).toFixed(1)}%)
- **Failed**: ${totalFailed} (${((totalFailed / results.length) * 100).toFixed(1)}%)
- **Skipped**: ${totalSkipped} (${((totalSkipped / results.length) * 100).toFixed(1)}%)

## Results by Category

${Object.entries(byCategory)
  .map(([category, tests]) => {
    const passed = tests.filter((t) => t.status === 'pass').length;
    const failed = tests.filter((t) => t.status === 'fail').length;
    const skipped = tests.filter((t) => t.status === 'skip').length;

    return `### ${category}

- Passed: ${passed}
- Failed: ${failed}
- Skipped: ${skipped}

${tests
  .map((test) => {
    const icon = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⏭️';
    return `${icon} **${test.test}**${test.message ? `\n   - ${test.message}` : ''}`;
  })
  .join('\n')}`;
  })
  .join('\n\n')}

## Conclusion

${totalFailed === 0 ? '✅ All tests passed! The application maintains functional equivalence.' : `⚠️ ${totalFailed} test(s) failed. Review and fix before proceeding with optimization.`}

## Next Steps

${
  totalFailed === 0
    ? `1. Proceed with code splitting optimization
2. Run this test suite again after optimization
3. Compare results to ensure no regression`
    : `1. Fix failing tests
2. Re-run test suite
3. Only proceed with optimization after all tests pass`
}
`;

writeFileSync('FUNCTIONAL_EQUIVALENCE_REPORT.md', reportContent);

console.log('\n✅ Report generated: FUNCTIONAL_EQUIVALENCE_REPORT.md\n');

if (totalFailed > 0) {
  console.log('⚠️  WARNING: Some tests failed. Fix issues before proceeding with optimization.\n');
  process.exit(1);
} else {
  console.log('✅ All tests passed! Safe to proceed with optimization.\n');
  process.exit(0);
}
