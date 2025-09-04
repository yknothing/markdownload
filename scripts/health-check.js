#!/usr/bin/env node
/**
 * Health check script for MarkDownload CI/CD pipeline
 * Validates configuration and basic functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 MarkDownload Health Check');
console.log('===========================\n');

let exitCode = 0;
const results = [];

function checkAndLog(description, condition, details = '') {
  const status = condition ? '✅' : '❌';
  const result = { description, passed: condition, details };
  results.push(result);
  
  console.log(`${status} ${description}`);
  if (details) {
    console.log(`   ${details}`);
  }
  
  if (!condition) {
    exitCode = 1;
  }
}

// 1. Configuration files check
console.log('📋 Configuration Validation');
console.log('---------------------------');

checkAndLog(
  'Jest configuration exists',
  fs.existsSync('jest.config.js'),
  'Jest configuration file found'
);

checkAndLog(
  'Package.json has test scripts',
  fs.existsSync('package.json') && JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts?.test,
  'Test scripts configured'
);

checkAndLog(
  'CI workflow exists',
  fs.existsSync('.github/workflows/ci.yml'),
  'Main CI/CD pipeline configured'
);

checkAndLog(
  'Quality gates workflow exists',
  fs.existsSync('.github/workflows/quality-gates.yml'),
  'Quality gates pipeline configured'
);

checkAndLog(
  'Test setup files exist',
  fs.existsSync('tests/setup.js') && fs.existsSync('tests/mocks/browserMocks.js'),
  'Test environment setup configured'
);

// 2. Dependencies check
console.log('\n📦 Dependencies Validation');
console.log('--------------------------');

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['jest', 'jest-environment-jsdom', 'jest-junit'];
  
  const missingDeps = requiredDeps.filter(dep => !packageJson.devDependencies?.[dep]);
  
  checkAndLog(
    'Required test dependencies installed',
    missingDeps.length === 0,
    missingDeps.length > 0 ? `Missing: ${missingDeps.join(', ')}` : 'All required dependencies present'
  );
} catch (error) {
  checkAndLog('Package.json is readable', false, error.message);
}

// 3. File structure validation
console.log('\n📁 File Structure Validation');
console.log('-----------------------------');

const requiredDirs = ['tests', 'src', 'tests/unit', 'tests/mocks'];
const requiredFiles = [
  'src/manifest.json',
  'tests/setup.js',
  'tests/mocks/browserMocks.js'
];

requiredDirs.forEach(dir => {
  checkAndLog(
    `${dir}/ directory exists`,
    fs.existsSync(dir) && fs.lstatSync(dir).isDirectory(),
    `Required directory structure in place`
  );
});

requiredFiles.forEach(file => {
  checkAndLog(
    `${file} exists`,
    fs.existsSync(file),
    `Required file present`
  );
});

// 4. Basic functionality test
console.log('\n🧪 Basic Functionality Check');
console.log('-----------------------------');

try {
  // Check if Jest can load configuration
  execSync('npx jest --listTests --passWithNoTests', { 
    stdio: 'pipe',
    timeout: 10000
  });
  checkAndLog('Jest configuration loads successfully', true, 'Configuration is valid');
} catch (error) {
  checkAndLog('Jest configuration loads successfully', false, `Configuration error: ${error.message.split('\n')[0]}`);
}

try {
  // Check if manifest.json is valid
  const manifestPath = 'src/manifest.json';
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    checkAndLog('Manifest.json is valid JSON', true, `Version: ${manifest.version || 'unknown'}`);
  } else {
    checkAndLog('Manifest.json is valid JSON', false, 'Manifest file not found');
  }
} catch (error) {
  checkAndLog('Manifest.json is valid JSON', false, 'Invalid JSON format');
}

// 5. Coverage setup validation
console.log('\n📊 Coverage Configuration Check');
console.log('--------------------------------');

try {
  const jestConfig = require('../jest.config.js');
  
  checkAndLog(
    'Coverage collection configured',
    Array.isArray(jestConfig.collectCoverageFrom) && jestConfig.collectCoverageFrom.length > 0,
    `Collecting from ${jestConfig.collectCoverageFrom?.length || 0} patterns`
  );
  
  checkAndLog(
    'Coverage thresholds set',
    jestConfig.coverageThreshold && jestConfig.coverageThreshold.global,
    `Global thresholds configured`
  );
  
  checkAndLog(
    'Coverage reporters configured',
    Array.isArray(jestConfig.coverageReporters) && jestConfig.coverageReporters.includes('lcov'),
    `Reports: ${jestConfig.coverageReporters?.join(', ') || 'none'}`
  );
  
} catch (error) {
  checkAndLog('Jest config is loadable', false, error.message);
}

// 6. Git and CI setup
console.log('\n🔧 CI/CD Setup Validation');
console.log('--------------------------');

try {
  execSync('git status', { stdio: 'pipe' });
  checkAndLog('Git repository initialized', true, 'Repository ready for CI/CD');
} catch (error) {
  checkAndLog('Git repository initialized', false, 'Not a git repository');
}

checkAndLog(
  'GitHub Actions workflows configured',
  fs.readdirSync('.github/workflows').length >= 3,
  `${fs.readdirSync('.github/workflows').length} workflows configured`
);

// 7. Environment configuration
console.log('\n🌍 Environment Configuration');
console.log('-----------------------------');

checkAndLog(
  'Environment example provided',
  fs.existsSync('.env.example'),
  'Environment template available'
);

checkAndLog(
  'Development guide available',
  fs.existsSync('DEVELOPMENT.md'),
  'Developer documentation provided'
);

// Summary
console.log('\n📋 Health Check Summary');
console.log('=======================');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const passRate = Math.round((passed / total) * 100);

console.log(`Status: ${exitCode === 0 ? '✅ HEALTHY' : '❌ ISSUES FOUND'}`);
console.log(`Pass Rate: ${passed}/${total} (${passRate}%)`);

if (exitCode === 0) {
  console.log('\n🎉 All health checks passed! CI/CD pipeline is ready.');
  console.log('💡 Next steps:');
  console.log('   - Run: npm test');
  console.log('   - Commit changes to trigger CI pipeline');
  console.log('   - Review GitHub Actions results');
} else {
  console.log('\n⚠️  Some issues found. Please address them before running CI/CD:');
  results.filter(r => !r.passed).forEach(result => {
    console.log(`   - ${result.description}: ${result.details}`);
  });
}

// Generate JSON report for CI
const report = {
  timestamp: new Date().toISOString(),
  status: exitCode === 0 ? 'healthy' : 'issues_found',
  passRate,
  passed,
  total,
  results
};

fs.writeFileSync('health-check-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Report saved to: health-check-report.json');

process.exit(exitCode);