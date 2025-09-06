# Pull Request Template

## 描述
<!-- 请简要描述此PR的目的和变更内容 -->

## 变更类型
<!-- 请勾选适用的选项 -->
- [ ] Bug修复
- [ ] 新功能
- [ ] 重构
- [ ] 测试相关
- [ ] 文档更新
- [ ] 其他: ___

## 测试架构合规检查
<!-- 根据 docs/TDD/auto_test_enhance.md 执行规范，必须完成以下检查 -->

### 必检项（测试相关PR）
- [ ] **禁止Mock业务逻辑**: 未在测试中重写被测核心函数（textReplace, generateValidFileName, turndown等）
- [ ] **Bug先记录**: 如发现功能缺陷，已先记录至 `docs/TDD/buglog/YYYY/BUG-YYYYMMDD-<slug>.md`
- [ ] **架构一致性**: 复用现有测试分层结构，未平行创建新目录/新跑法
- [ ] **Mock最小化**: 仅对外部依赖进行Mock，避免"死Mock"
- [ ] **覆盖率不下降**: 通过 `npm run test:hybrid:coverage` 验证覆盖率未回退

### 配置一致性检查
- [ ] 未在 `tests/run-tests.js` 中维护重复的基础配置常量
- [ ] 如修改Jest配置，已确保与现有配置保持一致

### 自检命令
<!-- 请在PR提交前运行以下命令，确保无禁止模式 -->
```bash
# 跨平台兼容的检查脚本（优先使用 rg，不可用时自动 fallback 到 grep）
# 检查是否存在伪实现（应无输出）

# 定义跨平台搜索函数
search_pattern() {
  local pattern="$1"
  local path="$2"
  
  if command -v rg >/dev/null 2>&1; then
    # 使用 ripgrep（性能更佳）
    rg -n -S "$pattern" "$path" 2>/dev/null
  else
    # fallback 到 grep（跨平台兼容）
    echo "⚠️ ripgrep not available, using grep fallback"
    grep -rn -E "$pattern" "$path" 2>/dev/null
  fi
}

# 执行检查（按Phase 0-3规范）
search_pattern "backgroundFunctions\s*=\s*\{" "tests"                    # Phase 0: 禁止伪实现块
search_pattern "generateValidFileName\s*=\s*jest\.fn|mockGenerateValidFileName\b" "tests"  # Phase 2: 禁止jest.fn伪实现
search_pattern "textReplace\s*=\s*jest\.fn|mockTextReplace\b" "tests"    # Phase 2: 禁止jest.fn伪实现
search_pattern "global\.(textReplace|generateValidFileName|validateUri|base64EncodeUnicode)\s*=\s*function\(" "tests/mocks"  # Phase 3: 禁止全局function体定义
search_pattern "const JEST_BASE_CONFIG" "tests/run-tests.js"           # 配置一致性检查
search_pattern "validateUri\\s*=\\s*jest\\.fn" "tests"                    # Phase 4: validateUri mock detection (warning)

# 注意：validateUri mock 检测当前为警告模式（Phase 4），不会阻塞CI，但建议逐步迁移到真实实现
# 如果上述命令有任何输出，说明存在禁止的模式，需要修复
```

## 测试执行结果
<!-- 对于测试相关变更，请提供执行结果 -->
```bash
# 请粘贴以下命令的执行结果
npm run test:quick
npm run test:hybrid:coverage
```

## 相关文档
<!-- 如果变更涉及测试架构，请确认已对照以下文档 -->
- [ ] 已对照 `docs/TDD/test_architecture_assessment.md`（现状评估）
- [ ] 已对照 `docs/TDD/auto_test_enhance.md`（执行规范）
- [ ] 已对照 `docs/TDD/test_refactor_strategy.md`（整改策略）
- [ ] 如有偏离，已在PR中说明理由

## 其他说明
<!-- 任何需要特别说明的内容 -->