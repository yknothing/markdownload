#!/usr/bin/env node

/**
 * Coverage File Summary Generator
 * 
 * Generates per-file coverage metrics from Jest coverage output
 * Used for module-level coverage verification as required by Phase 4 audit
 * 
 * Usage: node scripts/coverage-file-summary.js
 * Output: coverage/file-summary.json
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_DIR = path.join(__dirname, '../coverage');
const COVERAGE_FINAL = path.join(COVERAGE_DIR, 'coverage-final.json');
const OUTPUT_FILE = path.join(COVERAGE_DIR, 'file-summary.json');

/**
 * Calculate coverage percentage
 * @param {number} covered 
 * @param {number} total 
 * @returns {number} Coverage percentage rounded to 2 decimal places
 */
function calculatePercentage(covered, total) {
  if (total === 0) return 0;
  return Math.round((covered / total) * 10000) / 100;
}

/**
 * Extract coverage metrics from file data
 * @param {Object} fileData Coverage data for a single file
 * @returns {Object} Calculated coverage metrics
 */
function extractFileMetrics(fileData) {
  // Lines coverage - use statement map positions
  const statementMap = fileData.statementMap || {};
  const statements = fileData.s || {};
  const totalLines = Object.keys(statementMap).length;
  const coveredLines = Object.values(statements).filter(hits => hits > 0).length;
  
  // Statements coverage
  const totalStatements = Object.keys(statements).length;
  const coveredStatements = Object.values(statements).filter(hits => hits > 0).length;
  
  // Functions coverage
  const functions = fileData.f || {};
  const totalFunctions = Object.keys(functions).length;
  const coveredFunctions = Object.values(functions).filter(hits => hits > 0).length;
  
  // Branches coverage
  const branches = fileData.b || {};
  let totalBranches = 0;
  let coveredBranches = 0;
  
  Object.values(branches).forEach(branch => {
    if (Array.isArray(branch)) {
      totalBranches += branch.length;
      coveredBranches += branch.filter(hits => hits > 0).length;
    }
  });
  
  return {
    lines: {
      total: totalLines,
      covered: coveredLines,
      percentage: calculatePercentage(coveredLines, totalLines)
    },
    statements: {
      total: totalStatements,
      covered: coveredStatements,
      percentage: calculatePercentage(coveredStatements, totalStatements)
    },
    functions: {
      total: totalFunctions,
      covered: coveredFunctions,
      percentage: calculatePercentage(coveredFunctions, totalFunctions)
    },
    branches: {
      total: totalBranches,
      covered: coveredBranches,
      percentage: calculatePercentage(coveredBranches, totalBranches)
    }
  };
}

/**
 * Main function to process coverage data and generate file summary
 */
function generateFileSummary() {
  console.log('📊 Generating per-file coverage summary...');
  
  // Check if coverage file exists
  if (!fs.existsSync(COVERAGE_FINAL)) {
    console.error('❌ Coverage file not found:', COVERAGE_FINAL);
    console.error('   Run tests with coverage first: npm run test:hybrid:coverage');
    process.exit(1);
  }
  
  try {
    // Read coverage data
    const coverageData = JSON.parse(fs.readFileSync(COVERAGE_FINAL, 'utf8'));
    
    // Process each file
    const fileSummary = {};
    const overallTotals = {
      lines: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 }
    };
    
    for (const [filePath, fileData] of Object.entries(coverageData)) {
      // Skip files outside src/ directory
      if (!filePath.includes('/src/')) {
        continue;
      }
      
      // Extract relative path from src/
      const srcIndex = filePath.indexOf('/src/');
      const relativePath = filePath.substring(srcIndex + 1);
      
      // Calculate metrics
      const metrics = extractFileMetrics(fileData);
      fileSummary[relativePath] = metrics;
      
      // Add to overall totals
      overallTotals.lines.total += metrics.lines.total;
      overallTotals.lines.covered += metrics.lines.covered;
      overallTotals.statements.total += metrics.statements.total;
      overallTotals.statements.covered += metrics.statements.covered;
      overallTotals.functions.total += metrics.functions.total;
      overallTotals.functions.covered += metrics.functions.covered;
      overallTotals.branches.total += metrics.branches.total;
      overallTotals.branches.covered += metrics.branches.covered;
    }
    
    // Calculate overall percentages
    const overallMetrics = {
      lines: {
        ...overallTotals.lines,
        percentage: calculatePercentage(overallTotals.lines.covered, overallTotals.lines.total)
      },
      statements: {
        ...overallTotals.statements,
        percentage: calculatePercentage(overallTotals.statements.covered, overallTotals.statements.total)
      },
      functions: {
        ...overallTotals.functions,
        percentage: calculatePercentage(overallTotals.functions.covered, overallTotals.functions.total)
      },
      branches: {
        ...overallTotals.branches,
        percentage: calculatePercentage(overallTotals.branches.covered, overallTotals.branches.total)
      }
    };
    
    // Create output structure
    const output = {
      metadata: {
        generated: new Date().toISOString(),
        totalFiles: Object.keys(fileSummary).length,
        tool: 'coverage-file-summary.js'
      },
      overall: overallMetrics,
      files: fileSummary
    };
    
    // Write output file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    
    console.log(`✅ File summary generated: ${OUTPUT_FILE}`);
    console.log(`📄 Files processed: ${Object.keys(fileSummary).length}`);
    console.log(`📊 Overall coverage: ${overallMetrics.lines.percentage}% lines`);
    
    // Highlight key modules for Phase 4 verification
    const keyModules = [
      'src/background/service-worker.js',
      'src/background/background.js'
    ];
    
    console.log('\n🎯 Key Module Coverage:');
    keyModules.forEach(module => {
      if (fileSummary[module]) {
        const metrics = fileSummary[module];
        console.log(`   ${module}: ${metrics.lines.percentage}% lines (${metrics.lines.covered}/${metrics.lines.total})`);
      } else {
        console.log(`   ${module}: ❌ Not found in coverage data`);
      }
    });
    
    // Show top 5 covered files
    console.log('\n📈 Top Covered Files:');
    const sortedFiles = Object.entries(fileSummary)
      .sort((a, b) => b[1].lines.percentage - a[1].lines.percentage)
      .slice(0, 5);
    
    sortedFiles.forEach(([file, metrics]) => {
      console.log(`   ${file}: ${metrics.lines.percentage}% lines (${metrics.lines.covered}/${metrics.lines.total})`);
    });
    
    // Show files needing attention (low coverage)
    console.log('\n⚠️  Files Needing Attention (<30% coverage):');
    const lowCoverageFiles = Object.entries(fileSummary)
      .filter(([, metrics]) => metrics.lines.percentage < 30 && metrics.lines.total > 0)
      .sort((a, b) => a[1].lines.percentage - b[1].lines.percentage);
    
    if (lowCoverageFiles.length === 0) {
      console.log('   🎉 No files with low coverage!');
    } else {
      lowCoverageFiles.slice(0, 10).forEach(([file, metrics]) => {
        console.log(`   ${file}: ${metrics.lines.percentage}% lines (${metrics.lines.covered}/${metrics.lines.total})`);
      });
      if (lowCoverageFiles.length > 10) {
        console.log(`   ... and ${lowCoverageFiles.length - 10} more files`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error processing coverage data:', error.message);
    process.exit(1);
  }
}

// Add to package.json scripts as coverage:file-summary
if (require.main === module) {
  generateFileSummary();
}

module.exports = { generateFileSummary, calculatePercentage, extractFileMetrics };
