/**
 * Custom Jest Reporter - Replaces deprecated testResultsProcessor
 * 
 * This reporter implements the Jest 29+ Reporter interface and reuses the logic
 * from the existing results-processor.js file while adhering to modern Jest practices.
 * 
 * Key features:
 * - Backwards compatible with existing analysis logic
 * - Implements proper Jest Reporter interface
 * - Supports both development and CI environments
 * - Maintains existing report generation functionality
 */

const fs = require('fs');
const path = require('path');

class MarkDownloadTestReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options || {};
    this.isCI = process.env.CI === 'true';
  }

  /**
   * Called when a test run completes
   */
  onRunComplete(contexts, results) {
    try {
      // Reuse existing results processing logic
      const processResults = require('./results-processor');
      
      // Process results using existing logic
      const processedResults = processResults(results);
      
      // Additional reporter-specific functionality can be added here
      this.logSummary(results);
      
      return processedResults;
    } catch (error) {
      console.error('Error in custom reporter:', error);
      return results;
    }
  }

  /**
   * Optional: Called when a test starts
   */
  onTestStart(test) {
    // Implement if needed for start-time logging
  }

  /**
   * Optional: Called when a test completes
   */
  onTestResult(test, testResult, aggregatedResult) {
    // Implement if needed for per-test logging
  }

  /**
   * Log summary information specific to reporter behavior
   */
  logSummary(results) {
    if (!this.isCI && this.globalConfig.verbose) {
      console.log('\\n=== Custom Reporter Summary ===');
      console.log(`Test Suites: ${results.numTotalTestSuites} total, ${results.numPassedTestSuites} passed, ${results.numFailedTestSuites} failed`);
      console.log(`Tests:       ${results.numTotalTests} total, ${results.numPassedTests} passed, ${results.numFailedTests} failed`);
      
      // Calculate and display execution time
      const totalTime = results.testResults.reduce((acc, result) => {
        return acc + (result.perfStats ? (result.perfStats.end - result.perfStats.start) : 0);
      }, 0);
      
      if (totalTime > 0) {
        console.log(`Time:        ${Math.round(totalTime / 1000 * 100) / 100}s`);
      }
    }
  }

  /**
   * Optional: Get last error for Jest internal usage
   */
  getLastError() {
    return null;
  }
}

// Export the reporter class for Jest
module.exports = MarkDownloadTestReporter;