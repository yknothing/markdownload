#!/usr/bin/env node

/**
 * Coverage Analysis Script for MarkDownload
 * Analyzes test coverage and provides recommendations for achieving 85% branch coverage
 */

const fs = require('fs');
const path = require('path');

function analyzeCoverage() {
  console.log('🔍 MarkDownload Coverage Analysis');
  console.log('=' .repeat(50));
  
  // Check if coverage files exist
  const coverageDir = path.join(process.cwd(), 'coverage');
  const jsonCoveragePath = path.join(coverageDir, 'coverage-final.json');
  const lcovInfoPath = path.join(coverageDir, 'lcov.info');
  
  if (!fs.existsSync(coverageDir)) {
    console.log('❌ No coverage directory found. Run npm run test:coverage first.');
    return;
  }
  
  if (!fs.existsSync(jsonCoveragePath)) {
    console.log('❌ No coverage-final.json found. Run coverage with JSON reporter.');
    return;
  }
  
  try {
    const coverageData = JSON.parse(fs.readFileSync(jsonCoveragePath, 'utf8'));
    
    console.log('\n📊 Coverage Summary:');
    console.log('-'.repeat(30));
    
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;
    
    const fileAnalysis = [];
    
    for (const [filePath, coverage] of Object.entries(coverageData)) {
      const relativePath = path.relative(process.cwd(), filePath);
      
      const statements = coverage.s || {};
      const branches = coverage.b || {};
      const functions = coverage.f || {};
      
      const statementCount = Object.keys(statements).length;
      const coveredStmts = Object.values(statements).filter(count => count > 0).length;
      
      const branchCount = Object.values(branches).reduce((total, branchArray) => 
        total + (branchArray ? branchArray.length : 0), 0);
      const coveredBrnch = Object.values(branches).reduce((total, branchArray) => 
        total + (branchArray ? branchArray.filter(count => count > 0).length : 0), 0);
      
      const functionCount = Object.keys(functions).length;
      const coveredFuncs = Object.values(functions).filter(count => count > 0).length;
      
      const lineCount = Object.keys(coverage.statementMap || {}).length;
      const coveredLns = Object.values(statements).filter(count => count > 0).length;
      
      totalStatements += statementCount;
      coveredStatements += coveredStmts;
      totalBranches += branchCount;
      coveredBranches += coveredBrnch;
      totalFunctions += functionCount;
      coveredFunctions += coveredFuncs;
      totalLines += lineCount;
      coveredLines += coveredLns;
      
      const stmtPercent = statementCount > 0 ? (coveredStmts / statementCount * 100).toFixed(2) : 0;
      const branchPercent = branchCount > 0 ? (coveredBrnch / branchCount * 100).toFixed(2) : 0;
      const funcPercent = functionCount > 0 ? (coveredFuncs / functionCount * 100).toFixed(2) : 0;
      
      fileAnalysis.push({
        file: relativePath,
        statements: { covered: coveredStmts, total: statementCount, percent: stmtPercent },
        branches: { covered: coveredBrnch, total: branchCount, percent: branchPercent },
        functions: { covered: coveredFuncs, total: functionCount, percent: funcPercent },
      });
    }
    
    const totalStmtPercent = totalStatements > 0 ? (coveredStatements / totalStatements * 100).toFixed(2) : 0;
    const totalBranchPercent = totalBranches > 0 ? (coveredBranches / totalBranches * 100).toFixed(2) : 0;
    const totalFuncPercent = totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100).toFixed(2) : 0;
    const totalLinePercent = totalLines > 0 ? (coveredLines / totalLines * 100).toFixed(2) : 0;
    
    console.log(`Overall Coverage:`);
    console.log(`  Statements: ${totalStmtPercent}% (${coveredStatements}/${totalStatements})`);
    console.log(`  Branches:   ${totalBranchPercent}% (${coveredBranches}/${totalBranches}) ${totalBranchPercent >= 85 ? '✅' : '❌'}`);
    console.log(`  Functions:  ${totalFuncPercent}% (${coveredFunctions}/${totalFunctions})`);
    console.log(`  Lines:      ${totalLinePercent}% (${coveredLines}/${totalLines})`);
    
    console.log('\n📁 File-by-File Analysis:');
    console.log('-'.repeat(30));
    
    // Sort by branch coverage (lowest first - needs most attention)
    fileAnalysis.sort((a, b) => parseFloat(a.branches.percent) - parseFloat(b.branches.percent));
    
    fileAnalysis.slice(0, 10).forEach(file => {
      const indicator = parseFloat(file.branches.percent) >= 85 ? '✅' : '❌';
      console.log(`${indicator} ${file.file}`);
      console.log(`   Branches: ${file.branches.percent}% (${file.branches.covered}/${file.branches.total})`);
      console.log(`   Statements: ${file.statements.percent}%`);
      console.log(`   Functions: ${file.functions.percent}%`);
      console.log('');
    });
    
    console.log('\n🎯 Recommendations to Reach 85% Branch Coverage:');
    console.log('-'.repeat(50));
    
    if (totalBranchPercent < 85) {
      const neededBranches = Math.ceil(totalBranches * 0.85) - coveredBranches;
      console.log(`🔢 Need ${neededBranches} more covered branches to reach 85%`);
      console.log(`📈 Current: ${totalBranchPercent}% | Target: 85% | Gap: ${(85 - totalBranchPercent).toFixed(2)}%`);
      
      console.log('\n🎯 Priority Files (lowest branch coverage first):');
      fileAnalysis.slice(0, 5).forEach((file, index) => {
        if (parseFloat(file.branches.percent) < 85) {
          console.log(`${index + 1}. ${file.file}`);
          console.log(`   Current branch coverage: ${file.branches.percent}%`);
          console.log(`   Uncovered branches: ${file.branches.total - file.branches.covered}`);
        }
      });
      
      console.log('\n📝 Specific Actions:');
      console.log('   1. Add tests for error handling paths');
      console.log('   2. Test all conditional branches (if/else, switch cases)');
      console.log('   3. Test exception handling and edge cases');
      console.log('   4. Add integration tests that exercise real code paths');
      console.log('   5. Test async/await error scenarios');
      console.log('   6. Mock fewer dependencies to exercise actual source code');
    } else {
      console.log('🎉 Congratulations! You have achieved 85% branch coverage!');
    }
    
    console.log('\n🔗 Coverage Reports:');
    console.log('-'.repeat(20));
    console.log(`📂 HTML Report: file://${path.join(coverageDir, 'lcov-report', 'index.html')}`);
    console.log(`📄 LCOV Report: ${lcovInfoPath}`);
    console.log(`📊 JSON Report: ${jsonCoveragePath}`);
    
    console.log('\n💡 Quick Commands:');
    console.log('-'.repeat(15));
    console.log('npm run coverage:serve    # Start HTTP server for HTML report');
    console.log('npm run test:coverage:html # Generate and open HTML report');
    console.log('npm run test:coverage:watch # Watch mode with coverage');
    
  } catch (error) {
    console.error('❌ Error analyzing coverage:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  analyzeCoverage();
}

module.exports = { analyzeCoverage };