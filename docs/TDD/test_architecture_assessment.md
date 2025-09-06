**测试架构现状评估与问题清单（客观版）**

更新时间：2025-09-05

- 定位：面向决策与执行的客观评估与问题清单，提供证据与优先级，不给出实现细节方案（方案见 `docs/TDD/test_refactor_strategy.md`）。
- 关系：与执行规范互补，规范见 `docs/TDD/auto_test_enhance.md`。

**评估范围与方法**
- 范围：`tests/` 全目录、Jest 配置、运行脚本、主要被测模块 `src/background/*`、`src/shared/*`。
- 方法：静态检查与证据定位（以文件:起始行引用）。补充引用当前仓库已有覆盖率产物用于量化基线（未额外触发执行）。

**结论摘要**
- 严重性：高。部分单测重写被测核心逻辑，削弱缺陷发现能力，导致覆盖率“虚高”。
- 结构性：整体分层合理（unit/integration/e2e/boundary/performance）、基建完备，但存在配置重复与环境 Mock 偏重。
- 可行性：已具备“真实逻辑通道”（hybrid），整改以“最小化 Mock + 真实实现”为主线可落地。

**主要优点**
- 分层清晰：`tests/unit|integration|e2e|boundary|performance` 对应源代码域，便于定位与职责划分。
- 基建完整：自定义运行器、覆盖率分析、fixtures/mocks/utils 组织规范，文档与脚本齐备。
- 混合通道：`jest.hybrid.config.js:1` 提供接近真实业务的执行路径，利于减少过度 Mock。

**量化基线（覆盖率与通过率）**
- 来源：
  - 覆盖率汇总：`coverage/coverage-summary.json:1`
  - 测试摘要：`coverage/test-summary.md:1`
- 总体覆盖率（当前基线）：
  - 行覆盖率：9.07%
  - 语句覆盖率：8.10%
  - 分支覆盖率：5.47%
  - 函数覆盖率：9.30%
- 关键模块覆盖率摘录：
  - `src/background/background.js:1` 行37.65% / 函数39.39% / 语句37.75% / 分支39.62%
  - `src/background/service-worker.js:1` 行21.61% / 函数15.78% / 语句21.59% / 分支5.66%
  - `src/background/Readability.js:1` 行/函数/语句/分支：0%
  - `src/background/apache-mime-types.js:1` 行/函数/语句/分支：100%
- 测试通过率（最近一次产物）：
  - 总数：1847 / 通过：1237 / 失败：507 / 挂起：103（通过率 66.97%）
  - E2E 通过率：0%（需后续专项治理）
- 再生成指引：
  - 快速：`npm run test:ci`（CI 同步产出 `coverage/` 目录）
  - 混合通道：`npm run test:hybrid:coverage`
  - 自定义运行器：`node tests/run-tests.js --all --coverage`

**严重问题清单（含证据）**
- 单测重写被测业务逻辑（高危）
  - 例：在单元测试中以自定义实现替代真实实现。
    - `tests/unit/background.test.js:23`（构造 `backgroundFunctions` 并重写）：`turndown`/`generateValidFileName`/`textReplace` 分别在 `24`、`34`、`55` 行以 `jest.fn` 自行实现。
    - `tests/utils/testHelpers.js:363` 定义 `mockGenerateValidFileName(...)`；`391` 定义 `mockTextReplace(...)`，在部分用例中参与替代。
  - 影响：
    - 用例不再验证真实分支与边界，产生“假阳性”。
    - 跟随源码演进的维护负担增大（重复实现易漂移）。

- 配置重复与漂移风险（中高）
  - `jest.config.js:3` 与 `tests/run-tests.js:34` 各维护一套基础配置（`JEST_BASE_CONFIG`），存在长期漂移风险。
  - 建议：抽取公共基座配置；或使用 Jest “projects” 汇聚多套测试集定义。

- 全局 Mock 偏重（中）
  - `tests/setup.js:1` 对 `XMLHttpRequest`、`navigator.clipboard`、`getComputedStyle`、`console` 等进行全局 Mock，利于稳定，但会外溢影响不相关用例。
  - 建议：将部分 Mock 下沉到特定用例或 `describe` 级别；默认保守。

- jsdom 执行策略偏激进（中）
  - `jest.config.js:10` 使用 `runScripts: 'dangerously'`、`resources: 'usable'`；大多数单测不需执行脚本与外部资源，徒增不确定性与耗时。
  - 建议：默认关闭，仅在确需执行脚本的特定测试开启。

- Jest 29 兼容项（中）
  - `jest.config.js:162` 使用 `globals`；`168` 使用 `testResultsProcessor`。在 Jest 29 中应优先使用自定义 `reporters` 代替结果处理器，环境变量经 `process.env` 注入。

- 退出策略可能掩盖泄漏（中）
  - `jest.config.js:152` `forceExit: true` 会隐藏未关闭的句柄/定时器；建议开发态关闭、CI 有条件启用，并逐步开启 `detectOpenHandles`。

- 用例冗余（低中）
  - `tests/unit/context-menus*.test.js` 系列存在较多近似场景，建议收敛为“1 个全面 + 若干冒烟”。

**风险评估与优先级**
- 高：移除“重写业务逻辑”的单测实现，改为导入真实函数；统一配置以消除漂移。
- 中：Mock 降噪与 jsdom 策略收敛；Jest 29 结果处理迁移到 Reporter。
- 低：用例收缩、命名统一、日志降噪等。

**建议摘要（对应整改方案）**
- 采用“最小化 Mock + 真实实现”的混合通道为默认路径。
- 将 `textReplace`、`generateValidFileName`、`validateUri`、`normalizeMarkdown` 等通过模块导出在单测中直接引用（`src/background/background.js:1339` 起已提供 `module.exports`）。
- 抽取统一 Jest 基座配置，`tests/run-tests.js` 仅拼装模式化参数，避免重复。
- 迁移 `testResultsProcessor` 到自定义 Reporter；默认关闭 `forceExit` 与激进 jsdom 选项。
- 具体实施步骤见 `docs/TDD/test_refactor_strategy.md`。
