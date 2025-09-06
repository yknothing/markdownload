# MarkDownload 自动化测试优化执行规范（监督与验收版）

更新时间：2025-09-05 (Phase 4 Completed)

## 文档定位与关系

- 本文：执行规范与验收标准（What & How to do）。
- 现状评估：`docs/TDD/test_architecture_assessment.md`（Where we are & Problems）。
- 整改策略：`docs/TDD/test_refactor_strategy.md`（How to get there & Roadmap）。

所有测试相关变更需同时对照以上三份文档，偏离需在 PR 中说明理由并获批。

## 一、强制实施要求（置顶）

- Bug先记录：任何在测试中识别出的功能缺陷、边界问题或不一致，必须先以文档记录并提交到专用目录，禁止为让测试通过而直接更改源代码。
  - 位置与命名：`docs/TDD/buglog/YYYY/BUG-YYYYMMDD-<slug>.md`；汇总索引：`docs/TDD/buglog/BUGS.md`
  - 内容最少包含：复现步骤、期望/实际、影响面、相关测试文件/用例名、日志/截图、临时规避（如有）。
  - 工作流：先提交“失败用例 + Bug文档”，评审通过后再提交修复 PR（附测试变更）。
- 不为通过而改：严禁“为了 green”改动源代码（例如：放宽校验、删减功能、静默捕获等）。修复必须引用对应 Bug 文档并解释设计取舍。
- Mock最小化：只 mock 外部依赖；不得 mock 被测业务逻辑；避免“死 mock”（行为与真实接口偏离导致用例失真）。
- 架构一致性：新测试必须复用既有分层与工具，禁止平行创建新目录/新跑法；优先扩展现有文件而非重复创建相似用例。
- 可维护性：测试遵循“可读、可诊断、可复用”原则，Arrange/Act/Assert 清晰，公共逻辑封装至 `tests/utils/` 或 `tests/mocks/`。
- 验收门槛：每次 PR 必须通过本文“PR 验收清单”，否则不予合并。

## 二、文件结构与命名约定

- Bug 文档
  - 汇总索引：`docs/TDD/buglog/BUGS.md`（表格列：ID、标题、状态、模块、首见用例、链接）
  - 单个缺陷：`docs/TDD/buglog/YYYY/BUG-YYYYMMDD-<slug>.md`

- 测试模板
  - 用例模板：`docs/TDD/templates/test-case.md`
  - 缺陷模板：`docs/TDD/templates/bug-report.md`

- 测试用例命名（沿用现有分层，不新增目录）
  - 单元：`tests/unit/<域>/<主题|功能>-<场景>.test.js`（例：`tests/unit/background/api-download-edge-cases.test.js`）
  - 集成：`tests/integration/<域>/<流程|能力>-<场景>.test.js`
  - 端到端/性能/边界：沿用 `tests/e2e|performance|boundary` 既有结构与命名风格
  - 约束：命名需可读、可检索；严禁无语义命名（如 `temp.test.js`）

- 分支与提交
  - 分支：`test/<scope>-<short-desc>` 或 `fix/<bug-id>-<short-desc>`
  - 提交信息：遵循 Conventional Commits；修复必须在 footer 引用 `BUG: <path to bug md>`

## 三、标准工作流

- 新增功能测试
  1) 在现有目录下新增或扩展用例文件；
  2) 仅 mock 外部依赖（如 `browser` APIs），业务逻辑走真实路径；
  3) 覆盖正常/异常/边界 3 类场景；
  4) 本地运行：`npm run test:quick` → `npm run test:hybrid:coverage` → `npm run coverage:analyze`。

- 缺陷发现与处理
  1) 先撰写 `BUG-YYYYMMDD-<slug>.md`（用模板）；
  2) 在对应目录添加/扩展用例，使其“红”；
  3) 提交 PR（仅包含失败用例与 Bug 文档）；
  4) 修复 PR：引用 Bug 文档，补充通过用例与必要覆盖；
  5) 关闭缺陷：在 `BUGS.md` 更新状态并链接修复 PR。

- Flaky/冗余治理
  - Flaky：标注原因、记录复现条件；临时 `test.skip` 仅在挂接到 Bug 文档且限定时限的前提下允许；
  - 冗余：合并相似用例，保留“1 个全面 + 若干冒烟”（优先整合 `context-menus*` 系列）。

## 四、Mocking 准则（反造假/反过度）

- 必须
  - 仅 mock 不可控外部（浏览器 API、网络、时钟、随机），使用 `tests/mocks` 统一出口；
  - 使用“部分 mock（`jest.spyOn`）+ 恢复”，避免全局替换；
  - 每个 mock 至少有一次行为断言（被调用/入参与返回/异常路径）。

- 禁止
  - mock 被测核心模块（如测试 `turndown-manager` 时不得 mock 自身转换逻辑）；
  - 使用与真实接口不一致的“死 mock”；
  - 以 mock 遮蔽性能或并发问题。

- 推荐
  - 混合测试通道：优先用 `jest.hybrid.config.js` 跑真实逻辑，减少依赖深度 mock；
  - 通过覆盖率与调用链核实“真实路径已执行”（结合 `coverage-final.json`）。

## 五、覆盖率与质量门槛策略

- 收敛策略（Ratchet）：以当前基线为起点，每阶段 +2–5%，严禁回退；对 `src/shared/` 等纯函数模块设更高目标。

### Phase 4 Completion Update (Ratchet & Threshold Management)
- **Coverage Threshold**: Updated from 9% to 22% based on actual achievement (22.64%)
- **Progression Strategy**: +3% incremental ratchet (22% → 25% → 28%)
- **Optional Monitoring**: validateUri mock detection (warning-only mode)
- **Sustainability**: Realistic threshold based on proven capabilities
- **Next Target**: 25% after stability confirmation at 22% baseline
- 首选通道：CI 使用 `npm run test:hybrid:coverage`，再执行 `npm run coverage:analyze` 输出差异与优先文件。
- 时间预算：`unit/integration` 单次 <2–3 分钟；慢测归档到 `e2e/performance`。
- 稳定性：逐步打开 `detectOpenHandles`，评估移除 `forceExit`，以暴露资源泄漏。

## 六、CI 集成要点

- 流水线入口：复用 `.github/workflows/quality-gates.yml` 与 `ci.yml`（不新增工作流）。
- 执行顺序建议：安装 → `npm run test:hybrid:coverage` → `npm run coverage:analyze` → 质量门槛检查 → 结果归档。
- 产物：HTML/LCOV/JSON/Markdown 汇总（由 `tests/utils/results-processor.js` 与 `scripts/coverage-analysis.js` 生成）。

— 门槛配置（Ratchet 落地）
- 覆盖率阈值：
  - 参考现基线行覆盖率 9.07%（`coverage/coverage-summary.json:1`），短期将 `.github/workflows/quality-gates.yml:12` 的 `QUALITY_THRESHOLD_COVERAGE` 调整为 9。
  - 每完成一个 Phase（见路线图）+2% ~ +5%，严禁低于上一版本。
- 通过率阈值：
  - 参考现通过率 66.97%（`coverage/test-summary.md:1`），将 `.github/workflows/quality-gates.yml:13` 的 `QUALITY_THRESHOLD_PASS_RATE` 调整为 65 起步，随后按阶段拉升。

— 伪实现检出（新增步骤，阻止“重写业务逻辑”）
- 位置：放在“Run comprehensive test suite”之后、门槛校验之前。
- 命令（任一命中即失败，可设白名单临时放行过渡文件）：
  - `rg -n -S "backgroundFunctions\s*=\s*\{" tests`
  - `rg -n -S "generateValidFileName\s*=\s*jest\\.fn|mockGenerateValidFileName\b" tests`
  - `rg -n -S "textReplace\s*=\s*jest\\.fn|mockTextReplace\b" tests`

— 配置一致性校验（单一事实源）
- 命令：`rg -n "const JEST_BASE_CONFIG" tests/run-tests.js`
- 命中则失败，引导迁移到统一配置文件或 Jest projects（与整改方案一致）。

## 七、PR 验收清单（Reviewer Checklist）

- Bug 处理：缺陷是否先记录？失败用例是否存在并能稳定复现？
- 架构一致：用例位置/命名是否符合约定？是否复用现有工具/目录？
- Mock 审核：是否只 mock 外部边界？是否存在死 mock/无断言 mock？
- 断言质量：是否覆盖正常/异常/边界？是否验证副作用/消息交互？
- 覆盖差异：覆盖率是否不下降（或达成阶段目标）？慢测是否可接受？
- 卫生检查：无 `it.only`/`fit`/`describe.only`；无不必要的 `test.skip`；日志不过量。

## 八、现状评审摘要（供执行参考）

- 测试现状：78 个测试文件，类型覆盖 unit/integration/e2e/boundary/performance；已有自定义分析与运行器。
- 重要基建：
  - 覆盖阈值较高（见 `jest.config.js`），默认不采集覆盖（`collectCoverage=false`）。
  - 运行脚本齐全（`package.json` 含 `test:*`/`coverage:*`/`test:hybrid:*`）。
  - 结果处理与覆盖分析脚本完备（`tests/utils/results-processor.js`、`scripts/coverage-analysis.js`）。
  - WebExtension 环境与 SW 沙箱已就绪（`tests/setup.js`、`tests/utils/testHelpers.js`）。
- 建议优先项（详见 `docs/TDD/test_refactor_strategy.md`）：
  - 合并 `context-menus*` 冗余用例；
  - 在 `tests/integration/content-extraction-conversion.test.js` 基础上扩展模板/图片/表格/代码/数学式断言；
  - 扩展浏览器 API 边界（下载失败/取消、storage 冲突、权限拒绝、消息异常）。

## 九、快速上手（执行者）

1) 新建缺陷：`cp docs/TDD/templates/bug-report.md docs/TDD/buglog/$(date +%Y)/BUG-$(date +%Y%m%d)-<slug>.md`
2) 写红的用例：在对应 `tests/*` 目录补用例并本地复现失败。
3) 本地校验：`npm run test:quick` → `npm run test:hybrid:coverage` → `npm run coverage:analyze`
4) 提交 PR（失败用例 + Bug 文档）→ 评审 → 修复 PR（附通过用例与覆盖结果）

---

本文为测试优化执行与验收的唯一依据。若需偏离，请在 PR 中注明理由并征得评审同意。
