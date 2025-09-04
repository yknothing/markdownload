# Development Guide

This guide covers the development workflow, testing strategies, and CI/CD processes for MarkDownload.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/deathau/markdownload.git
cd markdownload
npm install

# Run tests
npm test
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage

# Build extension
cd src
npm install
npm run build
```

## Development Workflow

### 1. Environment Setup

Copy environment template:
```bash
cp .env.example .env
```

Configure your development environment variables as needed.

### 2. Testing Strategy

Our testing approach follows a comprehensive pyramid:

#### Unit Tests (`tests/unit/`)
- **Purpose**: Test individual functions and components
- **Coverage Target**: >90%
- **Run**: `npm run test:unit`

#### Integration Tests (`tests/integration/`)
- **Purpose**: Test component interactions and workflows
- **Coverage Target**: >80%
- **Run**: `npm run test:integration`

#### Boundary Tests (`tests/*boundary*.test.js`)
- **Purpose**: Test edge cases and error conditions
- **Coverage Target**: >85%
- **Run**: `npm run test:boundary`

#### End-to-End Tests (`tests/e2e/`)
- **Purpose**: Test complete user workflows
- **Coverage Target**: >70%
- **Run**: `npm run test:e2e`

### 3. Quality Standards

#### Coverage Requirements
- **Global**: 85% lines, 80% functions, 75% branches, 85% statements
- **Background Scripts**: 80% lines minimum
- **Content Scripts**: 80% lines minimum

#### Performance Standards
- **Test Execution**: <5 minutes total
- **Individual Tests**: <1 second (flagged if slower)
- **Memory Usage**: Monitored for leaks

#### Code Quality Gates
1. **Pass Rate**: ≥95% of all tests must pass
2. **Coverage**: Must meet minimum thresholds
3. **Security**: No high/critical vulnerabilities
4. **Performance**: Execution time within limits

## CI/CD Pipeline

### Workflows Overview

#### 1. Continuous Integration (`ci.yml`)
**Triggers**: Push/PR to main/develop branches

**Stages**:
- **Pre-checks**: Validate changes and manifest
- **Security Scan**: Audit dependencies for vulnerabilities
- **Test Matrix**: Run tests across OS/Node versions
- **Build Test**: Validate extension builds
- **Performance Test**: Analyze execution performance
- **Quality Gates**: Enforce coverage and pass rates

#### 2. Quality Gates (`quality-gates.yml`)
**Triggers**: PR/Push + Daily at 6 AM UTC

**Assessments**:
- Overall quality score (weighted: 40% pass rate, 35% coverage, 25% performance)
- Quality grades: A+ (90+), A (80+), B (70+), C (60+), F (<60)
- Automated PR comments with detailed reports

#### 3. Focused Testing (`test-focused.yml`)
**Triggers**: Manual dispatch

**Features**:
- Run specific test patterns
- Custom coverage thresholds
- Configurable worker counts
- Performance analysis

#### 4. Release Pipeline (`release.yml`)
**Triggers**: Version tags or manual dispatch

**Process**:
- Validate release readiness
- Build artifacts for all browsers
- Create GitHub releases
- Prepare store submissions
- Post-release tasks

### Branch Protection

Main and develop branches are protected with:
- Required status checks (CI pipeline)
- Minimum 1 reviewer for PRs
- Up-to-date branches before merge
- No force pushes

## Testing Commands Reference

```bash
# Basic Testing
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report

# Specific Test Types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:boundary     # Boundary condition tests

# Advanced Testing
npm run test:ci           # CI mode (no watch, coverage, max workers)
npm run test:debug        # Debug mode with breakpoints
npm run test:performance  # Performance analysis mode
npm run test:quick        # Only changed files (fast feedback)

# Quality Checks
npm run quality:check     # Run all quality gates locally
npm run precommit        # Pre-commit checks
```

## Coverage Analysis

### Viewing Coverage Reports

After running `npm run test:coverage`:
- **Terminal**: Text summary
- **HTML Report**: Open `coverage/lcov-report/index.html`
- **JSON Data**: `coverage/coverage-final.json`
- **LCOV**: `coverage/lcov.info` (for external tools)

## 维护性优化与问题跟踪（2025-09）
- 已完成的修复/优化
  - background.js：
    - validateUri：统一相对/协议相对解析；绝对 URL 保留原样；相对路径仅对空格做解码，避免破坏其他字符的安全性（保持历史行为）。
    - getImageFilename：data: URL 由 MIME 推断扩展名，普通 URL 去查询取末段；统一经 generateValidFileName 清洗。
    - textReplace：支持 {date:FORMAT}、{keywords[:分隔符]}、{domain}、大小写/命名风格转换、转义花括号（\{...\}）。
    - generateValidFileName：非法/自定义禁用字符替换为下划线；前后导点与 Windows 保留名处理；空值回退；>255 时在保留扩展名的前提下截断。
    - createMenus：测试/受限环境未注入实现时跳过，避免加载时报错。
- 已识别但未修复（待沟通）
  - 单测“preserve file extension when truncating”期望与通用策略冲突：输入长度 253，但期望输出长度固定为 255（并要求首部为 251 个 'A'）。需要确认策略是否应在 <255 时强行填充到 255，或调整用例期望。
  - default-options 与部分集成测试的失败与本次封装优化无直接关联；后续在不改变既有行为的前提下对齐实现与用例。

### Understanding Coverage Metrics

1. **Lines**: % of executable lines covered
2. **Functions**: % of functions called
3. **Branches**: % of if/else branches taken
4. **Statements**: % of statements executed

### Coverage Exclusions

Excluded from coverage:
- Third-party libraries (`browser-polyfill.min.js`, `moment.min.js`, etc.)
- Build artifacts and icons
- Test files themselves

## Performance Monitoring

### Metrics Tracked

1. **Test Execution Time**: Individual and total
2. **Memory Usage**: Heap usage during tests
3. **Slow Tests**: Tests taking >1 second
4. **Resource Utilization**: CPU and memory patterns

### Performance Reports

Generated automatically in `coverage/test-analysis.json`:
```json
{
  "performance": {
    "totalTime": 12450,
    "averageTime": 245.5,
    "slowTests": [...]
  }
}
```

## Debugging Tests

### Debug Mode
```bash
npm run test:debug
```
This starts Jest with Node.js debugger. Set breakpoints in your IDE.

### Debugging Tips

1. **Isolate Tests**: Use `.only()` to focus on specific tests
2. **Verbose Output**: Add `--verbose` flag for detailed output
3. **No Cache**: Use `--no-cache` to avoid caching issues
4. **Serial Execution**: Use `--runInBand` for debugging race conditions

### Common Issues

1. **Timeout Errors**: Increase `testTimeout` in Jest config
2. **Memory Leaks**: Check `detectOpenHandles` output
3. **Mock Issues**: Verify mock implementations in `tests/mocks/`
4. **Async Issues**: Ensure proper promise handling

## Extension Development

### Build Process

```bash
cd src
npm run build                    # Build extension
npm run start:firefoxdeveloper   # Test in Firefox
```

### Testing Built Extension

The CI pipeline automatically validates built extensions:
- Manifest validation
- Package creation
- File integrity checks

### Browser-Specific Builds

Different browsers may require slight modifications:
- **Chrome**: Standard Web Extensions API
- **Firefox**: Some API differences (handled by polyfill)
- **Safari**: Additional configuration via Xcode project

## Contributing Workflow

### 1. Development Process

1. **Create Feature Branch**: `git checkout -b feature/your-feature`
2. **Implement Changes**: Follow coding standards
3. **Write Tests**: Ensure comprehensive test coverage
4. **Run Quality Checks**: `npm run quality:check`
5. **Commit Changes**: Use conventional commit messages
6. **Push and Create PR**: GitHub will run CI pipeline

### 2. PR Requirements

- All CI checks must pass
- Code coverage maintained or improved
- Quality score ≥70 (B grade)
- At least one reviewer approval
- Up-to-date with target branch

### 3. Review Process

PRs automatically receive:
- Quality assessment comments
- Coverage reports
- Performance analysis
- Security scan results

## Troubleshooting

### Common CI Failures

1. **Coverage Below Threshold**
   - Add more tests
   - Remove dead code
   - Check exclusion patterns

2. **Test Failures**
   - Run locally: `npm run test:ci`
   - Check specific test output in CI logs
   - Verify environment differences

3. **Security Vulnerabilities**
   - Run: `npm audit`
   - Update dependencies
   - Check for false positives

4. **Performance Issues**
   - Identify slow tests in reports
   - Optimize test setup/teardown
   - Consider parallel execution limits

### Local Development Issues

1. **Tests Not Running**
   - Check Node.js version (requires 16+)
   - Clear Jest cache: `npx jest --clearCache`
   - Reinstall dependencies: `npm ci`

2. **Coverage Issues**
   - Ensure source files in correct location
   - Check `collectCoverageFrom` patterns
   - Verify exclusion rules

3. **Extension Build Failures**
   - Check manifest.json validity
   - Ensure all dependencies installed in `src/`
   - Verify web-ext configuration

## Architecture Decisions

### Testing Architecture

1. **Jest as Test Runner**: Comprehensive features and ecosystem
2. **jsdom Environment**: Browser API simulation
3. **Mock Strategy**: Comprehensive browser API mocks
4. **Parallel Execution**: Optimized for CI/CD performance

### CI/CD Design

1. **Matrix Strategy**: Multiple OS/Node version testing
2. **Quality Gates**: Automated quality enforcement
3. **Artifact Management**: Structured build and release artifacts
4. **Security Integration**: Automated vulnerability scanning

### Monitoring Strategy

1. **Three-Pillar Observability**: Tests, coverage, performance
2. **Quality Scoring**: Weighted metrics for overall health
3. **Trend Analysis**: Historical quality tracking
4. **Alert Integration**: Quality degradation notifications

For additional help, check existing issues or create new ones in the GitHub repository.
