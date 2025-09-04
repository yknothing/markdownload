const fs = require('fs');
const path = require('path');

/**
 * Jest test results processor for custom analysis and reporting
 */
module.exports = (results) => {
  const {
    numFailedTestSuites,
    numFailedTests,
    numPassedTestSuites,
    numPassedTests,
    numPendingTestSuites,
    numPendingTests,
    numTotalTestSuites,
    numTotalTests,
    startTime,
    success,
    testResults
  } = results;

  // Calculate metrics
  const totalTime = results.testResults.reduce((acc, result) => acc + (result.perfStats.end - result.perfStats.start), 0);
  const averageTime = totalTime / numTotalTests || 0;
  const passRate = ((numPassedTests / numTotalTests) * 100) || 0;
  const failureRate = ((numFailedTests / numTotalTests) * 100) || 0;

  // Categorize test results by type
  const testCategories = {
    unit: { passed: 0, failed: 0, total: 0 },
    integration: { passed: 0, failed: 0, total: 0 },
    e2e: { passed: 0, failed: 0, total: 0 },
    boundary: { passed: 0, failed: 0, total: 0 },
    other: { passed: 0, failed: 0, total: 0 }
  };

  // Slow tests analysis
  const slowTests = [];

  testResults.forEach(suite => {
    const suitePath = suite.testFilePath;
    let category = 'other';

    if (suitePath.includes('/unit/')) category = 'unit';
    else if (suitePath.includes('/integration/')) category = 'integration';
    else if (suitePath.includes('/e2e/')) category = 'e2e';
    else if (suitePath.includes('boundary')) category = 'boundary';

    suite.testResults.forEach(test => {
      testCategories[category].total++;
      if (test.status === 'passed') {
        testCategories[category].passed++;
      } else if (test.status === 'failed') {
        testCategories[category].failed++;
      }

      // Track slow tests (over 1 second)
      if (test.duration && test.duration > 1000) {
        slowTests.push({
          name: test.fullName,
          duration: test.duration,
          file: path.relative(process.cwd(), suitePath)
        });
      }
    });
  });

  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      success,
      totalTests: numTotalTests,
      passedTests: numPassedTests,
      failedTests: numFailedTests,
      pendingTests: numPendingTests,
      totalSuites: numTotalTestSuites,
      passedSuites: numPassedTestSuites,
      failedSuites: numFailedTestSuites,
      pendingSuites: numPendingTestSuites,
      passRate: Math.round(passRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100
    },
    performance: {
      totalTime: Math.round(totalTime),
      averageTime: Math.round(averageTime * 100) / 100,
      slowTests: slowTests.sort((a, b) => b.duration - a.duration).slice(0, 10)
    },
    categories: testCategories,
    ciEnvironment: {
      isCI: process.env.CI === 'true',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  // Write detailed report
  const reportsDir = path.join(process.cwd(), 'coverage');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(reportsDir, 'test-analysis.json'),
    JSON.stringify(report, null, 2)
  );

  // Generate markdown summary
  const markdownReport = generateMarkdownReport(report);
  fs.writeFileSync(
    path.join(reportsDir, 'test-summary.md'),
    markdownReport
  );

  // Console output for CI
  if (process.env.CI) {
    console.log('\n=== Test Analysis Summary ===');
    console.log(`Pass Rate: ${report.summary.passRate}%`);
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Average Test Time: ${report.performance.averageTime}ms`);
    
    if (slowTests.length > 0) {
      console.log('\n⚠️  Slow Tests Detected:');
      slowTests.slice(0, 3).forEach(test => {
        console.log(`  - ${test.name}: ${test.duration}ms`);
      });
    }
  }

  return results;
};

function generateMarkdownReport(report) {
  const { summary, performance, categories } = report;

  return `# Test Execution Report

Generated: ${report.timestamp}

## Summary
- **Success**: ${summary.success ? '✅ PASS' : '❌ FAIL'}
- **Pass Rate**: ${summary.passRate}%
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passedTests}
- **Failed**: ${summary.failedTests}
- **Pending**: ${summary.pendingTests}

## Performance
- **Total Execution Time**: ${performance.totalTime}ms
- **Average Test Time**: ${performance.averageTime}ms

${performance.slowTests.length > 0 ? `### Slow Tests (>1s)
${performance.slowTests.map(test => `- **${test.name}**: ${test.duration}ms (${test.file})`).join('\n')}` : ''}

## Test Categories
${Object.entries(categories).map(([category, stats]) => 
  `### ${category.toUpperCase()}
- Total: ${stats.total}
- Passed: ${stats.passed}
- Failed: ${stats.failed}
- Pass Rate: ${stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%`
).join('\n\n')}

## Environment
- **CI**: ${report.ciEnvironment.isCI}
- **Node Version**: ${report.ciEnvironment.nodeVersion}
- **Platform**: ${report.ciEnvironment.platform} ${report.ciEnvironment.arch}
`;
}