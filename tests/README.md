# MarkDownload Test Suite

This directory contains a comprehensive test suite for the MarkDownload browser extension, designed to test the real functionality rather than using mock implementations.

## 🏗️ Architecture Overview

The test suite is designed to test the actual MarkDownload source code with the following structure:

```
tests/
├── setup.js                 # Jest configuration and global mocks
├── run-tests.js             # Custom test runner script
├── README.md               # This documentation
├── unit/                   # Unit tests for individual components
│   ├── background.test.js     # Core conversion logic tests
│   ├── contentScript.test.js  # DOM processing and content extraction
│   ├── filename.test.js      # Filename generation and security
│   ├── options.test.js       # Options management and storage
│   └── template.test.js      # Template variable replacement
├── integration/            # End-to-end integration tests
│   └── endToEnd.test.js     # Complete workflow testing
├── mocks/                  # Mock implementations for testing
│   ├── browserMocks.js      # Browser extension API mocks
│   └── domMocks.js          # DOM and third-party library mocks
├── fixtures/               # Test data and HTML samples
│   └── htmlSamples.js       # Various HTML documents for testing
└── utils/                  # Test utility functions
    └── testHelpers.js       # Common test utilities and helpers
```

## 🚀 Getting Started

### Prerequisites

1. **Node.js and npm**: Ensure you have Node.js 16+ installed
2. **Dependencies**: Install the required testing dependencies:

```bash
npm install
```

### Running Tests

#### Using the custom test runner (recommended):

```bash
# Run all tests
node tests/run-tests.js

# Run only unit tests
node tests/run-tests.js --unit

# Run only integration tests  
node tests/run-tests.js --integration

# Run tests with coverage report
node tests/run-tests.js --coverage

# Run tests in watch mode
node tests/run-tests.js --watch

# Run specific test pattern
node tests/run-tests.js --testNamePattern "filename"

# Debug mode with detailed output
node tests/run-tests.js --debug

# Show help
node tests/run-tests.js --help
```

#### Using npm scripts:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Debug tests
npm run test:debug
```

#### Using Jest directly:

```bash
# Run all tests
npx jest

# Run with coverage
npx jest --coverage

# Run specific test file
npx jest tests/unit/background.test.js

# Run tests matching pattern
npx jest --testNamePattern="filename"
```

## 📋 Test Categories

### Unit Tests

Located in `tests/unit/`, these tests focus on individual components:

#### `background.test.js`
Tests the core conversion logic from `src/background/background.js`:
- HTML to Markdown conversion using TurndownService
- Image processing and download logic
- Template variable replacement
- Article extraction from DOM
- File naming and sanitization
- Error handling and edge cases

Key test scenarios:
- Simple HTML to Markdown conversion
- Complex articles with code blocks, images, and tables
- Template frontmatter and backmatter processing
- Image style handling (markdown, obsidian, base64)
- Filename generation with illegal characters
- Math formula processing (MathJax, KaTeX)

#### `filename.test.js`
Tests filename generation and security from the `generateValidFileName` function:
- Illegal character removal (`/\?<>\\:\*\|":`)
- Unicode and international character handling
- Custom disallowed character processing
- Whitespace normalization and trimming
- Security considerations (directory traversal, reserved names)
- Performance with large inputs

#### `template.test.js`
Tests template variable replacement from the `textReplace` function:
- Basic variable substitution (`{pageTitle}`, `{byline}`)
- Case transformations (`:lower`, `:upper`, `:kebab`, `:snake`, `:camel`)
- Date formatting (`{date:YYYY-MM-DD}`, etc.)
- Keywords processing (`{keywords}` with custom separators)
- Complex template scenarios (frontmatter, Obsidian templates)
- Error handling with malformed templates

#### `options.test.js`
Tests options management from `src/shared/default-options.js`:
- Default option loading and validation
- Storage synchronization and error handling
- Option merging with user preferences
- Browser compatibility checks
- Obsidian integration settings
- Performance and concurrent access

#### `contentScript.test.js`
Tests DOM processing from `src/contentScript/contentScript.js`:
- HTML document extraction (`getHTMLOfDocument`)
- Hidden element removal with content preservation
- Text selection extraction (`getHTMLOfSelection`)
- Base element and title tag handling
- Clipboard operations
- Download link generation

### Integration Tests

Located in `tests/integration/`, these tests verify complete workflows:

#### `endToEnd.test.js`
Tests complete user workflows from DOM to download:
- Full article processing pipeline
- Download workflows (downloads API vs. content script)
- Context menu interactions
- Keyboard shortcut handling
- Multi-tab operations
- Error recovery scenarios
- Obsidian integration workflows

## 🧪 Test Data and Fixtures

### HTML Samples (`tests/fixtures/htmlSamples.js`)

The test suite includes various HTML documents for comprehensive testing:

- **Simple Article**: Basic HTML structure with headings, paragraphs, and formatting
- **Complex Article**: Technical article with code blocks, images, tables, and math
- **Image-Heavy Article**: Document with various image types and sources
- **Math-Heavy Article**: Article with MathJax and KaTeX formulas
- **Code-Heavy Article**: Programming tutorial with multiple code languages
- **Obsidian-Formatted**: Note-taking optimized content
- **Malformed HTML**: Test error handling with invalid markup
- **Empty Article**: Edge case testing with minimal content

### Mock Data

- **Browser APIs**: Comprehensive mocking of Chrome/Firefox extension APIs
- **DOM APIs**: Mocking of DOM manipulation and selection APIs
- **Third-party Libraries**: Mocks for TurndownService, Readability, Moment.js
- **Network Requests**: Image download simulation and error scenarios

## 🛠️ Testing Philosophy

### Real Functionality Testing

This test suite is designed to test the **actual MarkDownload functionality** rather than mocked implementations:

1. **Source Code Integration**: Tests import and execute real functions from the source code
2. **Realistic Data**: Uses actual HTML samples that MarkDownload would encounter
3. **Browser API Simulation**: Mocks browser APIs while preserving real business logic
4. **End-to-End Validation**: Verifies complete workflows from user action to final output

### Test Quality Standards

- **Coverage Goals**: Maintain >70% code coverage across all metrics
- **Performance**: Each test should complete in <1 second
- **Isolation**: Tests are independent and can run in any order
- **Error Handling**: Comprehensive testing of error scenarios and edge cases
- **Cross-Browser**: Tests simulate behavior across Chrome, Firefox, and Safari

## 🔧 Configuration

### Jest Configuration

The test environment is configured with:
- **Environment**: jsdom for DOM simulation
- **Setup**: Global mocks and utilities loaded before tests
- **Timeout**: 10 seconds per test (configurable)
- **Module Mapping**: Source code import paths
- **Coverage**: Detailed reporting with thresholds

### Environment Variables

- `CI=true`: Enable continuous integration mode
- `DEBUG=true`: Enable detailed debug output
- `JEST_WORKERS=n`: Control parallel test execution

## 🐛 Debugging Tests

### Debug Mode

Run tests with detailed output:
```bash
node tests/run-tests.js --debug
```

This enables:
- Verbose Jest output
- Console logs from tests
- Open handle detection
- Extended error information

### Individual Test Debugging

Run a specific test file:
```bash
npx jest tests/unit/background.test.js --verbose
```

### Chrome DevTools Debugging

For debugging with Chrome DevTools:
```bash
npm run test:debug
```

Then open `chrome://inspect` in Chrome and click "inspect" on the Node.js process.

## 📊 Coverage Reports

Generate coverage reports to identify untested code:

```bash
# Generate HTML coverage report
npm run test:coverage

# View report
open coverage/lcov-report/index.html
```

Coverage reports include:
- **Line Coverage**: Percentage of executed code lines
- **Branch Coverage**: Percentage of executed conditional branches
- **Function Coverage**: Percentage of called functions
- **Statement Coverage**: Percentage of executed statements

## 🔄 Continuous Integration

The test suite is designed for CI environments:

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v1
```

### CI Environment Configuration

- Tests run without watch mode
- Coverage reports are generated
- All output is captured for analysis
- Exit codes properly indicate success/failure

## 🤝 Contributing

### Adding New Tests

1. **Choose the appropriate category** (unit vs. integration)
2. **Follow naming conventions**: `*.test.js` for test files
3. **Use descriptive test names**: Clearly describe what is being tested
4. **Include edge cases**: Test error conditions and boundary cases
5. **Maintain isolation**: Each test should be independent
6. **Update documentation**: Add details about new test scenarios

### Test Writing Guidelines

```javascript
describe('Component Name', () => {
  beforeEach(() => {
    // Setup test environment
    setupTestEnvironment();
  });

  afterEach(() => {
    // Clean up after tests
    resetTestEnvironment();
  });

  describe('specific functionality', () => {
    test('should handle normal case', () => {
      // Arrange
      const input = createTestData();
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });

    test('should handle error case', () => {
      // Test error scenarios
      expect(() => functionUnderTest(invalidInput)).toThrow();
    });
  });
});
```

### Mock Guidelines

1. **Mock external dependencies**: Browser APIs, network requests
2. **Preserve business logic**: Don't mock the code being tested
3. **Realistic behavior**: Mocks should behave like real APIs
4. **Error scenarios**: Include failure modes in mocks

## 🔍 Troubleshooting

### Common Issues

#### Tests fail with "Cannot find module" errors
- Verify all dependencies are installed: `npm install`
- Check Jest module name mapping configuration

#### Browser API errors  
- Ensure browser mocks are properly set up in `tests/setup.js`
- Check that all used APIs are included in `tests/mocks/browserMocks.js`

#### Timeout errors
- Increase test timeout in Jest configuration
- Check for unresolved promises in test code
- Verify async/await usage is correct

#### Coverage threshold failures
- Review uncovered code in coverage reports
- Add tests for uncovered branches and functions
- Adjust coverage thresholds if necessary

### Getting Help

1. **Check existing issues**: Review test failures and error messages
2. **Debug individual tests**: Run single test files to isolate issues  
3. **Enable debug mode**: Use `--debug` flag for detailed output
4. **Review mock behavior**: Ensure mocks match expected API behavior

## 📈 Performance Monitoring

### Test Performance

- **Individual test timeout**: 10 seconds (configurable)
- **Suite completion time**: Target <2 minutes for full suite
- **Memory usage**: Monitor for memory leaks in long-running tests
- **Worker utilization**: Optimize parallel test execution

### Benchmarking

Run performance benchmarks:
```bash
# Time the test suite
time npm test

# Profile memory usage
node --inspect tests/run-tests.js --unit
```

## 🎯 Future Improvements

### Planned Enhancements

1. **Visual regression testing**: Screenshot comparison for UI components
2. **Performance testing**: Benchmark conversion speed with large documents
3. **Cross-browser testing**: Automated testing in multiple browsers
4. **E2E testing**: Selenium/Puppeteer tests with real browser instances
5. **Accessibility testing**: Verify keyboard navigation and screen readers

### Test Suite Evolution

- **Continuous refinement**: Regular review and improvement of test coverage
- **New feature testing**: Add tests for new MarkDownload features
- **Performance optimization**: Improve test execution speed
- **Better error reporting**: Enhanced diagnostic information for failures