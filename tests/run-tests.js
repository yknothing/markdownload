#!/usr/bin/env node

/**
 * Test runner script for MarkDownload
 * Provides various testing modes and configurations
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const TEST_CONFIGS = {
  unit: {
    testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
    displayName: 'Unit Tests',
    color: '\x1b[34m' // Blue
  },
  integration: {
    testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
    displayName: 'Integration Tests',
    color: '\x1b[35m' // Magenta
  },
  all: {
    testMatch: [
      '<rootDir>/tests/unit/**/*.test.js',
      '<rootDir>/tests/integration/**/*.test.js'
    ],
    displayName: 'All Tests',
    color: '\x1b[36m' // Cyan
  }
};

// Base configuration is now loaded from jest.base.config.js (Single Source of Truth)
// This eliminates configuration duplication and ensures consistency

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

class TestRunner {
  constructor() {
    this.args = process.argv.slice(2);
    this.options = this.parseArgs();
  }

  parseArgs() {
    const options = {
      mode: 'all',
      watch: false,
      coverage: false,
      debug: false,
      silent: false,
      bail: false,
      updateSnapshots: false,
      maxWorkers: undefined,
      testNamePattern: undefined,
      setupOnly: false
    };

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      
      switch (arg) {
        case '--unit':
        case '-u':
          options.mode = 'unit';
          break;
        case '--integration':
        case '-i':
          options.mode = 'integration';
          break;
        case '--all':
        case '-a':
          options.mode = 'all';
          break;
        case '--watch':
        case '-w':
          options.watch = true;
          break;
        case '--coverage':
        case '-c':
          options.coverage = true;
          break;
        case '--debug':
        case '-d':
          options.debug = true;
          break;
        case '--silent':
        case '-s':
          options.silent = true;
          break;
        case '--bail':
        case '-b':
          options.bail = true;
          break;
        case '--updateSnapshots':
        case '-U':
          options.updateSnapshots = true;
          break;
        case '--maxWorkers':
          options.maxWorkers = this.args[++i];
          break;
        case '--testNamePattern':
        case '-t':
          options.testNamePattern = this.args[++i];
          break;
        case '--setup-only':
          options.setupOnly = true;
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (arg.startsWith('--')) {
            console.warn(`${YELLOW}Warning: Unknown option ${arg}${RESET}`);
          }
      }
    }

    return options;
  }

  showHelp() {
    console.log(`${BOLD}MarkDownload Test Runner${RESET}

${BOLD}Usage:${RESET}
  node tests/run-tests.js [options]

${BOLD}Test Modes:${RESET}
  -u, --unit           Run unit tests only
  -i, --integration    Run integration tests only  
  -a, --all            Run all tests (default)

${BOLD}Options:${RESET}
  -w, --watch          Watch files and re-run tests
  -c, --coverage       Generate coverage report
  -d, --debug          Enable debug mode
  -s, --silent         Run tests silently
  -b, --bail           Stop on first test failure
  -U, --updateSnapshots Update test snapshots
  -t, --testNamePattern Run tests matching pattern
  --maxWorkers <n>     Set maximum worker processes
  --setup-only         Only run test setup, don't execute tests
  -h, --help           Show this help

${BOLD}Examples:${RESET}
  node tests/run-tests.js --unit --coverage
  node tests/run-tests.js --integration --watch
  node tests/run-tests.js --testNamePattern "filename"
  node tests/run-tests.js --debug --bail

${BOLD}Environment Variables:${RESET}
  CI=true              Enable CI mode (non-interactive)
  DEBUG=true           Enable debug output
  JEST_WORKERS=n       Override worker count
`);
  }

  async checkPrerequisites() {
    const errors = [];

    // Check if Jest is installed
    try {
      execSync('npx jest --version', { stdio: 'ignore' });
    } catch (error) {
      errors.push('Jest is not installed. Run: npm install');
    }

    // Check if test files exist
    const testDir = path.join(process.cwd(), 'tests');
    if (!fs.existsSync(testDir)) {
      errors.push('Tests directory does not exist');
    }

    // Check setup file
    const setupFile = path.join(testDir, 'setup.js');
    if (!fs.existsSync(setupFile)) {
      errors.push('Test setup file is missing: tests/setup.js');
    }

    if (errors.length > 0) {
      console.error(`${RED}${BOLD}Prerequisites Check Failed:${RESET}`);
      errors.forEach(error => console.error(`  ${RED}✗${RESET} ${error}`));
      process.exit(1);
    }

    console.log(`${GREEN}✓${RESET} Prerequisites check passed`);
  }

  generateJestConfig() {
    const testConfig = TEST_CONFIGS[this.options.mode];
    const baseConfig = require(path.join(process.cwd(), 'jest.base.config.js'));
    
    const config = {
      ...baseConfig,
      testMatch: testConfig.testMatch,
      displayName: testConfig.displayName
    };

    // Add coverage configuration if requested
    if (this.options.coverage) {
      config.collectCoverage = true;
      config.coverageDirectory = 'coverage';
      config.coverageReporters = ['text', 'text-summary', 'lcov', 'html', 'json', 'json-summary'];
      // Coverage thresholds are maintained in base config
    }

    // Debug configuration - override base config exit strategy
    if (this.options.debug) {
      config.verbose = true;
      config.detectOpenHandles = true;
      config.forceExit = false;
    }

    // Use custom reporter instead of deprecated testResultsProcessor
    config.reporters = [
      'default',
      ['<rootDir>/tests/utils/custom-reporter.js', {}]
    ];

    return config;
  }

  buildJestArgs() {
    const args = [];

    if (this.options.watch) {
      args.push('--watch');
    }

    if (this.options.silent) {
      args.push('--silent');
    }

    if (this.options.bail) {
      args.push('--bail');
    }

    if (this.options.updateSnapshots) {
      args.push('--updateSnapshots');
    }

    if (this.options.testNamePattern) {
      args.push('--testNamePattern', this.options.testNamePattern);
    }

    if (this.options.maxWorkers) {
      args.push('--maxWorkers', this.options.maxWorkers);
    }

    // CI environment handling
    if (process.env.CI === 'true') {
      args.push('--ci', '--watchman=false');
    }

    return args;
  }

  async setupTestEnvironment() {
    console.log(`${YELLOW}Setting up test environment...${RESET}`);

    // Create temp directory for test fixtures
    const tempDir = '/tmp/markdownload-tests';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`${GREEN}✓${RESET} Created temp directory: ${tempDir}`);
    }

    // Verify test fixtures
    const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
    if (fs.existsSync(fixturesDir)) {
      console.log(`${GREEN}✓${RESET} Test fixtures found`);
    } else {
      console.warn(`${YELLOW}Warning: Test fixtures directory not found${RESET}`);
    }

    console.log(`${GREEN}✓${RESET} Test environment setup complete`);
  }

  async runTests() {
    const testConfig = TEST_CONFIGS[this.options.mode];
    console.log(`${testConfig.color}${BOLD}Running ${testConfig.displayName}${RESET}\n`);

    // Generate Jest configuration
    const jestConfig = this.generateJestConfig();
    const configFile = path.join(process.cwd(), 'jest.config.temp.json');
    
    try {
      fs.writeFileSync(configFile, JSON.stringify(jestConfig, null, 2));
      
      const jestArgs = [
        '--config', configFile,
        ...this.buildJestArgs()
      ];

      console.log(`${BOLD}Jest Command:${RESET} npx jest ${jestArgs.join(' ')}\n`);

      // Run Jest
      const jestProcess = spawn('npx', ['jest', ...jestArgs], {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          DEBUG: this.options.debug ? 'true' : process.env.DEBUG
        }
      });

      return new Promise((resolve, reject) => {
        jestProcess.on('close', (code) => {
          // Clean up temp config file
          if (fs.existsSync(configFile)) {
            fs.unlinkSync(configFile);
          }

          if (code === 0) {
            console.log(`\n${GREEN}${BOLD}Tests completed successfully!${RESET}`);
            resolve(code);
          } else {
            console.log(`\n${RED}${BOLD}Tests failed with exit code ${code}${RESET}`);
            reject(new Error(`Tests failed with code ${code}`));
          }
        });

        jestProcess.on('error', (error) => {
          console.error(`${RED}Failed to start Jest: ${error.message}${RESET}`);
          reject(error);
        });
      });

    } catch (error) {
      console.error(`${RED}Error running tests: ${error.message}${RESET}`);
      throw error;
    }
  }

  async run() {
    try {
      console.log(`${BOLD}MarkDownload Test Runner${RESET}\n`);

      if (this.options.setupOnly) {
        await this.checkPrerequisites();
        await this.setupTestEnvironment();
        console.log(`${GREEN}${BOLD}Setup completed successfully!${RESET}`);
        return;
      }

      await this.checkPrerequisites();
      await this.setupTestEnvironment();
      await this.runTests();

    } catch (error) {
      console.error(`${RED}${BOLD}Test run failed: ${error.message}${RESET}`);
      process.exit(1);
    }
  }
}

// Run the test runner
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = TestRunner;
