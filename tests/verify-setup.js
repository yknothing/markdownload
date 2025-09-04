#!/usr/bin/env node

/**
 * Verification script for MarkDownload test suite
 * Checks that all components are properly configured and ready for testing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

class TestSetupVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.basePath = process.cwd();
  }

  log(message, color = '') {
    console.log(`${color}${message}${RESET}`);
  }

  success(message) {
    this.passed.push(message);
    this.log(`✓ ${message}`, GREEN);
  }

  error(message) {
    this.errors.push(message);
    this.log(`✗ ${message}`, RED);
  }

  warning(message) {
    this.warnings.push(message);
    this.log(`⚠ ${message}`, YELLOW);
  }

  info(message) {
    this.log(`ℹ ${message}`, BLUE);
  }

  checkFileExists(filePath, description) {
    const fullPath = path.join(this.basePath, filePath);
    if (fs.existsSync(fullPath)) {
      this.success(`${description} exists: ${filePath}`);
      return true;
    } else {
      this.error(`${description} missing: ${filePath}`);
      return false;
    }
  }

  checkDirectoryExists(dirPath, description) {
    const fullPath = path.join(this.basePath, dirPath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      this.success(`${description} directory exists: ${dirPath}`);
      return true;
    } else {
      this.error(`${description} directory missing: ${dirPath}`);
      return false;
    }
  }

  checkPackageJson() {
    this.info('Checking package.json configuration...');
    
    if (!this.checkFileExists('package.json', 'Root package.json')) {
      return false;
    }

    try {
      const packageContent = fs.readFileSync(path.join(this.basePath, 'package.json'), 'utf8');
      const packageJson = JSON.parse(packageContent);

      // Check Jest configuration
      if (packageJson.jest) {
        this.success('Jest configuration found in package.json');
        
        const jestConfig = packageJson.jest;
        if (jestConfig.testEnvironment === 'jsdom') {
          this.success('Jest configured with jsdom environment');
        } else {
          this.warning('Jest environment not set to jsdom');
        }

        if (jestConfig.setupFilesAfterEnv && jestConfig.setupFilesAfterEnv.includes('<rootDir>/tests/setup.js')) {
          this.success('Jest setup file configured correctly');
        } else {
          this.error('Jest setup file not configured');
        }
      } else {
        this.error('Jest configuration missing from package.json');
      }

      // Check required dependencies
      const requiredDevDeps = [
        'jest',
        'jest-environment-jsdom',
        '@babel/core',
        '@babel/preset-env',
        'jsdom'
      ];

      const devDeps = packageJson.devDependencies || {};
      requiredDevDeps.forEach(dep => {
        if (devDeps[dep]) {
          this.success(`Required dependency installed: ${dep}`);
        } else {
          this.error(`Required dependency missing: ${dep}`);
        }
      });

      // Check test scripts
      const scripts = packageJson.scripts || {};
      if (scripts.test) {
        this.success('Test script configured');
      } else {
        this.warning('Test script not configured');
      }

    } catch (error) {
      this.error(`Error reading package.json: ${error.message}`);
      return false;
    }

    return true;
  }

  checkTestStructure() {
    this.info('Checking test directory structure...');

    const requiredDirs = [
      'tests',
      'tests/unit',
      'tests/integration', 
      'tests/mocks',
      'tests/fixtures',
      'tests/utils'
    ];

    requiredDirs.forEach(dir => {
      this.checkDirectoryExists(dir, `${dir.split('/').pop()} tests`);
    });

    const requiredFiles = [
      'tests/setup.js',
      'tests/run-tests.js',
      'tests/README.md',
      'tests/verify-setup.js'
    ];

    requiredFiles.forEach(file => {
      this.checkFileExists(file, `${path.basename(file)}`);
    });
  }

  checkTestFiles() {
    this.info('Checking test files...');

    const testFiles = [
      'tests/unit/background.test.js',
      'tests/unit/filename.test.js',
      'tests/unit/template.test.js',
      'tests/unit/options.test.js',
      'tests/unit/contentScript.test.js',
      'tests/integration/endToEnd.test.js'
    ];

    testFiles.forEach(file => {
      if (this.checkFileExists(file, `Test file`)) {
        this.validateTestFile(file);
      }
    });
  }

  validateTestFile(filePath) {
    try {
      const content = fs.readFileSync(path.join(this.basePath, filePath), 'utf8');
      
      // Check for proper test structure
      if (content.includes('describe(') && content.includes('test(')) {
        this.success(`${path.basename(filePath)} has proper test structure`);
      } else {
        this.warning(`${path.basename(filePath)} may be missing test structure`);
      }

      // Check for imports/requires
      if (content.includes('import') || content.includes('require')) {
        this.success(`${path.basename(filePath)} has proper imports`);
      } else {
        this.warning(`${path.basename(filePath)} may be missing imports`);
      }

    } catch (error) {
      this.error(`Error reading ${filePath}: ${error.message}`);
    }
  }

  checkMockFiles() {
    this.info('Checking mock files...');

    const mockFiles = [
      'tests/mocks/browserMocks.js',
      'tests/mocks/domMocks.js'
    ];

    mockFiles.forEach(file => {
      if (this.checkFileExists(file, `Mock file`)) {
        this.validateMockFile(file);
      }
    });
  }

  validateMockFile(filePath) {
    try {
      const content = fs.readFileSync(path.join(this.basePath, filePath), 'utf8');
      
      if (content.includes('export') && content.includes('jest.fn')) {
        this.success(`${path.basename(filePath)} has proper mock structure`);
      } else {
        this.warning(`${path.basename(filePath)} may be missing proper mock functions`);
      }

    } catch (error) {
      this.error(`Error reading ${filePath}: ${error.message}`);
    }
  }

  checkSourceCode() {
    this.info('Checking source code structure...');

    const sourceFiles = [
      'src/background/background.js',
      'src/contentScript/contentScript.js',
      'src/shared/default-options.js',
      'src/popup/popup.js',
      'src/options/options.js'
    ];

    sourceFiles.forEach(file => {
      this.checkFileExists(file, `Source file`);
    });
  }

  checkDependencies() {
    this.info('Checking Node.js and npm...');

    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      this.success(`Node.js version: ${nodeVersion}`);
      
      // Check if Node version is sufficient (16+)
      const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
      if (majorVersion >= 16) {
        this.success('Node.js version is sufficient (16+)');
      } else {
        this.error('Node.js version should be 16 or higher');
      }

    } catch (error) {
      this.error('Node.js is not installed or not in PATH');
    }

    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      this.success(`npm version: ${npmVersion}`);
    } catch (error) {
      this.error('npm is not installed or not in PATH');
    }

    // Check if node_modules exists
    if (this.checkDirectoryExists('node_modules', 'Node modules')) {
      // Check if Jest is available
      try {
        execSync('npx jest --version', { stdio: 'ignore' });
        this.success('Jest is available via npx');
      } catch (error) {
        this.error('Jest is not available. Run: npm install');
      }
    }
  }

  async runQuickTest() {
    this.info('Running quick test to verify setup...');

    try {
      // Check if Jest can run with our configuration
      execSync('npx jest --version', { stdio: 'ignore' });
      this.success('Jest is working correctly');

      // Try to validate our Jest configuration
      execSync('npx jest --showConfig', { 
        stdio: 'ignore',
        cwd: this.basePath
      });
      this.success('Jest configuration is valid');

      // Check if we can load test utilities
      const testUtilsPath = path.join(this.basePath, 'tests', 'utils', 'testHelpers.js');
      if (fs.existsSync(testUtilsPath)) {
        try {
          // Just check syntax without running
          execSync(`node -c "${testUtilsPath}"`, { stdio: 'ignore' });
          this.success('Test utilities have valid syntax');
        } catch (syntaxError) {
          this.warning(`Test utilities may have syntax issues: ${syntaxError.message}`);
        }
      }

    } catch (error) {
      this.error(`Quick test failed: ${error.message}`);
      this.warning('This may indicate issues with the test setup');
    }
  }

  generateReport() {
    this.log('\n' + '='.repeat(60), BOLD);
    this.log('TEST SETUP VERIFICATION REPORT', BOLD);
    this.log('='.repeat(60), BOLD);

    if (this.passed.length > 0) {
      this.log(`\n${GREEN}${BOLD}✓ PASSED (${this.passed.length})${RESET}`);
      // Don't list all passed items to keep output concise
    }

    if (this.warnings.length > 0) {
      this.log(`\n${YELLOW}${BOLD}⚠ WARNINGS (${this.warnings.length})${RESET}`);
      this.warnings.forEach(warning => {
        this.log(`  • ${warning}`, YELLOW);
      });
    }

    if (this.errors.length > 0) {
      this.log(`\n${RED}${BOLD}✗ ERRORS (${this.errors.length})${RESET}`);
      this.errors.forEach(error => {
        this.log(`  • ${error}`, RED);
      });
    }

    this.log('\n' + '='.repeat(60), BOLD);

    if (this.errors.length === 0) {
      this.log('🎉 Test setup verification PASSED!', GREEN + BOLD);
      this.log('You can now run tests with: npm test', BLUE);
    } else {
      this.log('❌ Test setup verification FAILED!', RED + BOLD);
      this.log('Please fix the errors above before running tests.', RED);
    }

    this.log('='.repeat(60), BOLD);

    return this.errors.length === 0;
  }

  async verify() {
    this.log(`${BOLD}MarkDownload Test Setup Verifier${RESET}\n`);

    this.checkDependencies();
    this.checkPackageJson();
    this.checkTestStructure();
    this.checkTestFiles();
    this.checkMockFiles();
    this.checkSourceCode();
    
    if (this.errors.length === 0) {
      await this.runQuickTest();
    }

    const success = this.generateReport();
    process.exit(success ? 0 : 1);
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  const verifier = new TestSetupVerifier();
  verifier.verify();
}

module.exports = TestSetupVerifier;