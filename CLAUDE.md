# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MarkDownload is a browser extension that converts web pages to Markdown format. It works across Chrome, Firefox, Safari, and Edge browsers. The extension uses Mozilla's Readability.js for content extraction and Turndown for HTML-to-Markdown conversion.

## Core Commands

### Testing
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:boundary     # Boundary condition tests

# Run only changed files (fast feedback)
npm run test:quick

# Debug mode with breakpoints
npm run test:debug

# CI mode (no watch, with coverage)
npm run test:ci

# Performance analysis
npm run test:performance
```

### Building
```bash
# Build the extension (run from root)
npm run build

# Build and test together
npm run build:test

# Start Firefox Developer with live reload (run from root)
npm run start:dev
```

Note: The actual build happens in `src/` directory via `cd src && npm run build`, but the npm scripts at root handle this automatically.

### Coverage & Quality
```bash
# View coverage HTML report
npm run test:coverage:html

# Run quality checks (coverage + lint)
npm run quality:check

# Pre-commit checks
npm run precommit

# Health check script
npm run health-check

# CI validation
npm run ci:validate
```

## Architecture

### Directory Structure

```
src/
├── background/              # Service worker and background scripts
│   ├── core/               # Core modules (initialization, error handling, async utils)
│   ├── business/           # Business logic (download processor)
│   ├── converters/         # HTML-to-Markdown conversion (turndown-manager)
│   ├── download/           # Download management
│   ├── extractors/         # Content extraction utilities
│   ├── api/               # Browser API wrappers
│   ├── polyfills/         # DOM polyfills for service worker
│   ├── background.js      # Main background script (48k lines - being modularized)
│   ├── Readability.js     # Mozilla's content extraction library
│   └── turndown.js        # HTML-to-Markdown converter
├── contentScript/          # Runs in web page context for DOM extraction
├── popup/                  # Extension popup UI
├── options/                # Extension options/settings page
└── shared/                 # Shared utilities and constants

tests/
├── unit/                   # Unit tests for individual components
│   ├── background/        # Tests for background scripts and modules
│   └── template.test.js   # Template variable replacement tests
├── integration/            # Component interaction tests
├── boundary/              # Edge case and error condition tests
├── e2e/                   # Complete user workflow tests
├── fixtures/              # Test data and HTML samples
├── mocks/                 # Browser API and DOM mocks
└── utils/                 # Test utilities and helpers
```

### Key Architectural Patterns

**Modular Service Worker Architecture**: The background script is being refactored from a 5971-line monolith into focused modules:
- `core/`: Initialization, error handling, lifecycle management
- `business/`: Download processing logic
- `converters/`: Turndown service management
- `download/`: Download manager
- `api/`: Browser API abstractions
- `polyfills/`: DOM API simulation for service worker environment

**Message Passing**: Content scripts communicate with background via browser.runtime messaging. The background script handles conversion, template processing, and downloads.

**Template System**: Uses variable replacement in `textReplace()` function supporting:
- Basic variables: `{pageTitle}`, `{byline}`, `{date}`, etc.
- Transformations: `:lower`, `:upper`, `:kebab`, `:snake`, `:camel`, `:pascal`
- Date formatting: `{date:YYYY-MM-DD}`, `{date:MMMM Do YYYY}`
- Keywords processing: `{keywords}`, `{keywords:, }` (custom separator)
- Escaped braces: `\{...\}` for literal text

**Filename Validation**: `generateValidFileName()` ensures safe filenames:
- Removes illegal characters: `/\?<>\\:\*\|":`
- Handles Windows reserved names (CON, PRN, AUX, etc.)
- Truncates to max 255 characters while preserving extension
- Processes custom disallowed characters from options

### Testing Strategy

The test suite follows a comprehensive pyramid with strict coverage requirements:

**Coverage Targets**:
- Global: 85% lines, 80% functions, 75% branches, 85% statements
- Background scripts: 80% lines minimum
- Content scripts: 80% lines minimum

**Quality Gates** (enforced in CI):
- Pass rate: ≥95% of all tests
- Coverage: Must meet minimum thresholds
- Security: No high/critical vulnerabilities
- Performance: <5 minutes total, <1 second per test

**Test Categories**:
1. Unit tests (`tests/unit/`): Individual functions and components
2. Integration tests (`tests/integration/`): Component interactions
3. Boundary tests: Edge cases and error conditions
4. E2E tests (`tests/e2e/`): Complete user workflows

**Progressive Ratchet Strategy**: Coverage thresholds are incrementally raised as coverage improves. Never lower existing thresholds.

## Development Workflow

### Running a Single Test File
```bash
# Run specific test file
npx jest tests/unit/background/functions-unit.test.js

# Run with verbose output
npx jest tests/unit/background/functions-unit.test.js --verbose

# Run tests matching a pattern
npx jest --testNamePattern="filename"
```

### Key Files to Understand

**src/background/background.js**: Main conversion logic (being refactored)
- `convertTabToMarkdown()`: Coordinates the entire conversion process
- `getMarkdown()`: HTML-to-Markdown conversion via Turndown
- `textReplace()`: Template variable substitution
- `generateValidFileName()`: Safe filename generation
- `getImageFilename()`: Extract filenames from image URLs
- `validateUri()`: URL validation and normalization

**src/contentScript/contentScript.js**: DOM extraction
- `getHTMLOfDocument()`: Extract full document HTML
- `getHTMLOfSelection()`: Extract selected text as HTML

**src/shared/default-options.js**: Extension configuration defaults

### Common Issues

**Test Failures**:
- Run locally first: `npm run test:ci`
- Check specific test output in CI logs
- Ensure all mocks are properly configured in `tests/setup.js`

**Coverage Issues**:
- Review HTML report: `npm run test:coverage:html`
- Check `collectCoverageFrom` patterns in jest.config.js
- Third-party libraries are excluded from coverage

**Module Loading**:
- Service worker uses `importScripts()` for module loading
- Load order matters: error handling → DOM polyfill → initialization → business modules
- Browser polyfill (`browser-polyfill.min.js`) provides cross-browser API compatibility

## CI/CD Pipeline

### Workflows

**Continuous Integration** (`.github/workflows/ci.yml`):
- Triggers: Push/PR to main/develop branches
- Stages: pre-checks, security scan, test matrix, build test, performance test, quality gates
- Runs tests across multiple OS/Node versions

**Quality Gates** (`.github/workflows/quality-gates.yml`):
- Triggers: PR/Push + Daily at 6 AM UTC
- Scoring: 40% pass rate, 35% coverage, 25% performance
- Grades: A+ (90+), A (80+), B (70+), C (60+), F (<60)
- Automated PR comments with detailed reports

**Release Pipeline** (`.github/workflows/release.yml`):
- Triggers: Version tags or manual dispatch
- Builds artifacts for all browsers
- Creates GitHub releases
- Prepares store submissions

### Branch Protection
- Main and develop branches require status checks
- Minimum 1 reviewer for PRs
- Up-to-date branches before merge
- No force pushes

## Code Style

- 2-space indentation for JavaScript and JSON
- Single quotes for strings
- Directories: kebab-case
- Exports: camelCase
- Constructors/factories: PascalCase
- Order imports from lowest to highest dependency weight
- Place shared utilities in `src/shared/`

## External Dependencies

- **Readability.js** (v0.5.0): Mozilla's article extraction library (Apache 2.0)
- **Turndown** (v7.1.3): HTML-to-Markdown converter (MIT)
- **Moment.js** (v2.29.4): Date formatting in templates
- **browser-polyfill**: Cross-browser WebExtension API compatibility

## Security Considerations

- `validateUri()`: Handles absolute URLs, relative paths, protocol-relative URLs
- `generateValidFileName()`: Prevents directory traversal, handles reserved names
- Data URL handling: MIME type inference, proper extension mapping
- All downloaded content goes through validation before writing to disk

## Obsidian Integration

The extension supports Obsidian integration via the "Advanced Obsidian URI" plugin. Configuration in options page under "Obsidian integration" section.

## Browser Compatibility

- Chrome: Standard Web Extensions API
- Firefox: Some API differences handled by polyfill
- Safari: Additional Xcode project configuration required
- Edge: Chrome-compatible

Different browsers may require manifest adjustments handled in the build process.

## Performance Standards

- Test execution: <5 minutes total
- Individual tests: <1 second (flagged if slower)
- Memory usage: Monitored for leaks
- Suite completion target: <2 minutes for full suite
