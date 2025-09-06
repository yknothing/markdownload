# Phase 4 执行计划 — 覆盖率提升与稳定性优化

更新时间：2025-09-05

关联文档：
- 现状评估与问题清单：docs/TDD/test_architecture_assessment.md
- 执行规范与验收：docs/TDD/auto_test_enhance.md
- 整改策略与路线图：docs/TDD/test_refactor_strategy.md
- 历史阶段审计：docs/TDD/PHASE_1_AUDIT_REPORT.md, docs/TDD/PHASE_2_AUDIT_REPORT.md, docs/TDD/PHASE_3_AUDIT_REPORT.md

## 一、阶段目标（What）
- 解决测试环境稳定性问题，确保测试套件能够正常执行
- 推动覆盖率 ratchet 政策：以当前基线为起点，目标 +2–5%/Phase
- 重点攻关低覆盖关键模块，特别是 `src/background/service-worker.js`
- 强化混合通道的稳定性和真实性验证
- 确保所有测试用例在真实业务逻辑路径下正确执行

## 二、阶段范围（Scope）
- 测试环境修复
  - 解决 JSDOM 配置冲突问题
  - 确保测试套件能够稳定执行
  - 验证覆盖率数据收集正常工作
- 覆盖率提升
  - 优先模块：`src/background/service-worker.js`（当前基线 ~21.61%，目标 >30%）
  - 持续提升：`src/background/background.js`（目标 >40%）
  - 维持标准：其他核心模块不低于现有水平
- 混合通道验证
  - 确保真实业务逻辑路径正常工作
  - 验证冒烟套件在混合通道下正确执行
  - 确认外部依赖 Mock 不影响业务逻辑执行

## 三、执行步骤（How）
1) 测试环境稳定性修复
   - 在 `jest.base.config.js` 中确认 JSDOM 配置策略
   - 测试 `npm run test:hybrid:coverage` 的执行能力
   - 解决任何配置冲突或环境问题

2) 覆盖率基线建立
   - 执行 `npm run test:hybrid:coverage` 获取当前真实基线
   - 记录各模块的覆盖率数据作为 Phase 4 起点
   - 分析覆盖率差距，识别改进机会

3) 重点模块覆盖率提升
   - `src/background/service-worker.js`：
     - 分析当前未覆盖的代码路径
     - 补充针对性的测试用例
     - 目标：行覆盖率 >30%
   - `src/background/background.js`：
     - 验证现有覆盖率
     - 补充边界条件测试
     - 目标：行覆盖率 >40%

4) 混合通道优化
   - 验证 `tests/mocks/hybridMocks.js` 的真实导入路径
   - 确保外部依赖 Mock 不干扰业务逻辑
   - 优化测试执行时间和稳定性

5) 冒烟套件验证
   - 确认 Phase 3 新增的四类能力测试正常工作
   - 验证综合冒烟测试能够检测回归
   - 确保测试执行时间控制在合理范围内

## 四、迁移检查表（按文件）
- `jest.base.config.js`
  - [ ] JSDOM 配置稳定，无冲突
  - [ ] 测试执行正常，无环境错误

- `src/background/service-worker.js`
  - [ ] 行覆盖率 >30%
  - [ ] 新增测试用例覆盖关键路径

- `src/background/background.js`
  - [ ] 行覆盖率 >40%
  - [ ] 边界条件充分测试

- `tests/mocks/hybridMocks.js`
  - [ ] 所有导入路径正确
  - [ ] 外部依赖 Mock 不影响业务逻辑

- `tests/integration/content-extraction-conversion.test.js`
  - [ ] 四类能力测试全部通过
  - [ ] 执行时间 <30s

## 五、验收标准（DoD）
- 测试环境稳定：`npm run test:hybrid:coverage` 能够正常执行并生成覆盖率报告
- 覆盖率提升：至少一个关键模块覆盖率提升至目标水平
- 混合通道验证：所有业务逻辑测试使用真实实现路径
- CI 门槛通过：覆盖率不低于基线，质量门正常工作
- 冒烟套件稳定：新增测试用例全部通过，执行时间可控

## 六、里程碑与时间线（建议）
- M1（~1–2 天）：测试环境修复 + 覆盖率基线建立
- M2（~2–3 天）：service-worker.js 覆盖率提升
- M3（~1–2 天）：background.js 覆盖率优化
- M4（~1 天）：混合通道验证 + 冒烟套件确认

## 七、风险与回滚
- 风险：
  - 测试环境修复可能引入新的配置冲突
  - 覆盖率提升可能暴露现有测试的不足
  - 混合通道优化可能影响测试执行时间
- 缓解：
  - 分批验证配置变更
  - 优先保证测试通过，再追求覆盖率提升
  - 监控测试执行时间，避免性能退化
- 回滚：
  - 测试环境配置可以快速回滚到 Phase 3 状态
  - 新增测试用例可以单独禁用而不影响核心功能
  - 覆盖率阈值可以调整为更保守的水平

## 八、度量与报告
- 覆盖率：记录各模块的新覆盖率水平，对比 Phase 4 起点
- 执行时间：确保测试套件执行时间不显著增加
- 稳定性：记录测试失败率和环境问题发生次数
- 文档更新：在 docs/TDD 目录追加 PHASE_4_AUDIT_REPORT.md

## 九、PR 与审核要点
- PR 描述需包含：
  - 测试环境修复的具体变更
  - 覆盖率提升的数据对比
  - 新增测试用例的说明
- 审核人关注：
  - 测试环境稳定性是否改善
  - 覆盖率是否真实提升（非虚假提升）
  - 新增测试用例的质量和必要性
  - 整体测试执行时间是否可接受

---
状态：Ready for Execution（可按本计划启动 Phase 4）

## 十、具体执行指南

### 测试环境修复
```bash
# 验证当前状态（统一默认禁用外部资源）
npm run test:quick
npm run test:hybrid:coverage

# 如需启用外部资源（仅在必要时）
JEST_ALLOW_EXTERNAL_RESOURCES=true npm run test:hybrid:coverage

# 验证冒烟套件（Phase 3重点验证）
npm test tests/integration/content-extraction-conversion.test.js

# 检查配置一致性（应均为none或usable）
node -e "console.log('jest.config.js:', require('./jest.config.js').testEnvironmentOptions.resources)"
node -e "console.log('jest.base.config.js:', require('./jest.base.config.js').testEnvironmentOptions.resources)"
```

### 覆盖率分析
```bash
# 获取详细覆盖率报告（默认禁用外部资源）
npm run test:hybrid:coverage

# 如需启用外部资源获取更完整覆盖率
JEST_ALLOW_EXTERNAL_RESOURCES=true npm run test:hybrid:coverage

# 查看具体模块覆盖率
npm run coverage:analyze

# 分析未覆盖代码
npx nyc report --reporter=html
```

### 重点模块测试
```bash
# 专门测试 service-worker
npm test -- tests/unit/background/service-worker-critical.test.js

# 测试 background.js 相关功能
npm test -- tests/unit/background/branch-coverage-critical.test.js
```

### 混合通道验证
```bash
# 验证混合通道测试
npm run test:hybrid:coverage

# 检查是否有业务逻辑 Mock
npm run test:ci  # 应该没有 FAKE_IMPL_FOUND 错误
```
