# Phase 0 验收标准清单

**阶段目标**: 建立基线与冻结，确保文档矩阵门槛机制生效

**更新时间**: 2025-09-05

## 验收标准（DoD）

### 1. 文档矩阵建立 ✅
- [x] 三份文档角色明确且互相引用完整
  - `docs/TDD/test_architecture_assessment.md`：现状评估与问题清单
  - `docs/TDD/auto_test_enhance.md`：执行规范与验收标准  
  - `docs/TDD/test_refactor_strategy.md`：分阶段实施路线图
- [x] 量化基线数据已验证并记录在文档中
  - 总体覆盖率：行9.07%，语句8.10%，分支5.47%，函数9.30%
  - 测试通过率：66.97% (1237通过/1847总数，507失败，103挂起)

### 2. PR模板门槛机制 ✅
- [x] 创建 `.github/pull_request_template.md`
- [x] 包含测试架构合规检查项
- [x] 包含自检命令（检测伪实现）
- [x] 强制要求对照三份TDD文档

### 3. CI门槛自动化 ✅
- [x] 调整 `.github/workflows/quality-gates.yml` 覆盖率阈值到基线
  - `QUALITY_THRESHOLD_COVERAGE: 9`
  - `QUALITY_THRESHOLD_PASS_RATE: 65`
- [x] 增加伪实现自动检出步骤
  - 检测 `backgroundFunctions\s*=\s*\{`
  - 检测 `generateValidFileName\s*=\s*jest\.fn|mockGenerateValidFileName\b`
  - 检测 `textReplace\s*=\s*jest\.fn|mockTextReplace\b`
  - 检测配置重复 `const JEST_BASE_CONFIG`
- [x] 门槛失败时提供明确的修复指引

### 4. 执行验证命令

#### 基线验证
```bash
# 验证覆盖率基线数据存在且符合预期
ls -la coverage/coverage-summary.json coverage/test-summary.md
```

#### 伪实现检测（当前状态）
```bash
# 检查是否存在伪实现（Phase 0后这些应该触发CI失败）
rg -n -S "backgroundFunctions\s*=\s*\{" tests
rg -n -S "generateValidFileName\s*=\s*jest\.fn|mockGenerateValidFileName\b" tests  
rg -n -S "textReplace\s*=\s*jest\.fn|mockTextReplace\b" tests
rg -n "const JEST_BASE_CONFIG" tests/run-tests.js
```

#### PR模板检验
```bash
# 验证PR模板存在
cat .github/pull_request_template.md | head -5
```

#### CI配置检验  
```bash
# 验证质量门槛已调整到基线
grep -A 2 "QUALITY_THRESHOLD" .github/workflows/quality-gates.yml
```

## 完成标识

- [x] **文档**: 三份TDD文档完整且互相引用
- [x] **数据**: 覆盖率与通过率基线已验证并记录
- [x] **模板**: PR模板包含架构合规检查
- [x] **CI**: 质量门槛调整到基线并自动检测伪实现
- [x] **验证**: 所有验证命令可正常执行

## 下一步
Phase 0完成后，开始执行 [Phase 1: 配置统一与Reporter迁移](./test_refactor_strategy.md#phase-1)

---

**状态**: ✅ Phase 0 COMPLETED
**验收人**: @whatsup  
**完成时间**: 2025-09-05