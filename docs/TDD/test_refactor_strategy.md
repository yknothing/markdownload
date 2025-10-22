Version: Phase-1.0.0 | Status: Active | Updated: 2025-09-07

**测试架构整改策略（Top‑Down 方案与路线图）**

更新时间：2025-09-07

- 定位：面向实施的顶层方案与路线图，给出阶段目标、任务清单与验收标准。
- 关联：
  - 现状评估与问题清单：`docs/TDD/test_architecture_assessment.md`
  - 执行规范与验收：`docs/TDD/auto_test_enhance.md`

**目标与原则**
- 目标：
  - 消除“单测重写业务逻辑”；统一配置与运行路径；提升真实分支覆盖与稳定性。
  - 将混合通道（真实 Turndown + 最小浏览器 Mock）作为默认主路径。
- 原则：
  - Mock 最小化，仅限外部依赖；核心业务逻辑必须走真实实现。
  - 配置单一事实源（Single Source of Truth），避免漂移。
  - 渐进收敛，不一次性大改，保证可回滚。

**路线图（分阶段）**

1) 基线与冻结（Phase 0）
- 建立“文档矩阵与门槛”：三份文档角色明确（评估/策略/规范）。
- 在 PR 模板/CI 增加“是否新增或保留自定义业务实现”的检查项，明确禁止。

2) 配置统一与Reporter迁移（Phase 1）
- 统一配置：抽取一份 `jest.base.config.js`（或使用 Jest projects），供 `jest.config.js` 与自定义运行器共享；`tests/run-tests.js` 不再内嵌 `JEST_BASE_CONFIG`，仅传递模式化参数。
- jsdom 策略：默认移除 `runScripts: 'dangerously'`、`resources: 'usable'`，仅特定测试场景开启。
- 退出策略：开发态关闭 `forceExit`，逐步开启 `detectOpenHandles`；CI 保留兜底并输出泄漏提示。
- 结果处理：将 `testResultsProcessor` 迁移为自定义 Reporter（重用 `tests/utils/results-processor.js` 逻辑），遵循 Jest 29 接口。

3) 去除“重写业务逻辑”的单测实现（Phase 2）
- 背景：核心函数已提供导出，直接复用真实实现。
  - `src/background/background.js:1339` 起对外导出：`turndown`、`normalizeMarkdown`、`validateUri`、`getImageFilename`、`textReplace`、`generateValidFileName`、`base64EncodeUnicode`、`convertArticleToMarkdown`。
- 任务：
  - `tests/unit/background.test.js`：删除 `backgroundFunctions = { .. }` 自定义实现（见 `23`、`24`、`34`、`55`），直接 `require('../../src/background/background.js')` 获取真实函数；必要时仅对浏览器 API 进行 spy/mock（复用 `tests/mocks/browserMocks.js`）。
  - `tests/utils/testHelpers.js`：废弃 `mockGenerateValidFileName(..)`（`363`）与 `mockTextReplace(..)`（`391`），如需工具函数，封装为“断言/期望生成”，不应替代业务实现。
  - 已有“真实执行”参考：`tests/unit/real-src-functions.test.js:1` 通过 `vm` 加载真实 `background.js`，可作为迁移范式。
  - 替代环境检测：禁止 `typeof jest` 分支，统一使用可注入的 `EnvironmentConfig` / `DateProvider`（见 `tests/utils/testHelpers.js:785` 起）

- 迁移检查表（逐文件）
  - `tests/unit/background.test.js:11` 起：移除 `backgroundFunctions` 伪实现块，改为从 `src/background/background.js:1` 解构导入 `turndown`、`textReplace`、`generateValidFileName`、`convertArticleToMarkdown` 等；配合 `tests/mocks/hybridMocks.js:1` 仅 Mock 浏览器 API。
  - `tests/utils/testHelpers.js:363`：删除 `mockGenerateValidFileName`；
  - `tests/utils/testHelpers.js:391`：删除 `mockTextReplace`；
  - `tests/utils/testHelpers.js:585`、`:591`、`:607`、`:645`、`:649`、`:858`、`:859`：删除对上述伪实现的注入/导出，改为引用真实模块导出的函数。
  - `tests/mocks/turndownServiceMocks.js:302`、`:318`：移除对 `global.generateValidFileName`/`global.textReplace` 的 `jest.fn` 重写；若用例需要，仅 `jest.spyOn` 真实实现以观察调用（不改变行为）。
  - `tests/unit/filename.test.js:14`：用真实 `generateValidFileName` 替换 `jest.fn`。
  - `tests/unit/template.test.js:15`：用真实 `textReplace` 替换 `jest.fn`。
  - `tests/unit/critical-functionality.test.js:24`、`:53` 起：移除局部 `mockTextReplace`/`mockGenerateValidFileName`，改为真实实现；必要时以输入构造覆盖边界。
  - `tests/mocks/hybridMocks.js:196`、`:283`：不要定义“备用实现”，改为从真实模块引入并赋给全局引用（或直接移除全局赋值，由用例按需导入）。
  - 边界类用例：
    - `tests/boundary/security-boundaries.test.js:47`、`:49`、`:51`、`:53`
    - `tests/boundary/conditions.test.js:162`、`:163`
    - `tests/boundary/limits.test.js:67`、`:71`、`:494`、`:496`
    - `tests/boundary/edge-cases.test.js:38`、`:39`、`:42`、`:43`
    - 以上均去除“若无则 fallback 到 mock*”逻辑，统一显式导入真实实现，必要时仅对外部边界（网络/时间/随机/浏览器）做 stub。

- 迁移顺序（建议）
  1) `tests/unit/background.test.js` → 2) `tests/utils/testHelpers.js` → 3) `tests/mocks/*` → 4) `tests/unit/*` 其它文件 → 5) `tests/boundary/*`。

- 完成定义（DoD）
  - `rg -n -S "mockGenerateValidFileName|mockTextReplace|backgroundFunctions\s*=\s*\{" tests` 无结果；
  - 所有引用均来自 `src/background/background.js:1` 真实导出；
  - 单测仅对外部依赖使用 Spy/Stub，不重写业务实现。

4) Mock 治理与混合通道收敛（Phase 3）
- 统一 Mock 出口：以 `tests/mocks/hybridMocks.js:1` 为主（真实 Turndown + 最小浏览器 Mock）。
- 将广域 Mock 下沉：`tests/setup.js:1` 中非必须的全局 Mock 改为用例/describe 级别；对 `console` 仅在必要文件中重定向。

5) 用例收敛与命名统一（Phase 4）
- 合并 `context-menus*` 系列近似用例，保留 1 套全覆盖 + 少量冒烟。
- 扩展“真实路径验证”用例：在 `tests/integration/content-extraction-conversion.test.js` 增加图片/表格/代码/数学式断言，替代分散重复断言。

6) CI 门槛与度量（Phase 5）
- 通道：`npm run test:hybrid:coverage` 为首选；覆盖差异分析 `scripts/coverage-analysis.js` 保留。
- Ratchet：维持现阈值，按阶段 +2–5% 收敛；关键模块（`src/shared/`）维持较高门槛。

**实施清单（按文件）**
- 配置与运行
  - `jest.config.js`：
    - 移除 `testResultsProcessor`，新增自定义 Reporter（读取 `tests/utils/results-processor.js` 逻辑）。
    - 调整 `testEnvironmentOptions`：默认去除 `runScripts: 'dangerously'` 与 `resources: 'usable'`。
    - 关闭开发态 `forceExit`，保留 CI 场景下可控开启。
  - `tests/run-tests.js:34`：删除内嵌 `JEST_BASE_CONFIG`，改为读取统一配置或通过命令行参数切换 `projects`/`testPathPattern`。

- 单测修整
  - `tests/unit/background.test.js:23` 起：删除伪实现，直接 `const { textReplace, generateValidFileName, turndown } = require('../../src/background/background.js')`；配合 `tests/mocks/hybridMocks.js` 仅 Mock 浏览器边界。
  - `tests/utils/testHelpers.js:363,391`：取消伪实现的导出与使用；迁移到“期望构造/断言工具”。

- Mock 与环境
  - `tests/setup.js:1`：将 `console`、`XMLHttpRequest` 等 Mock 缩小到用例范围；默认仅设置必须项（如 `TextEncoder`/`TextDecoder`）。
  - `tests/mocks/hybridMocks.js:1`：作为默认 Mock 入口，强调“真实 Turndown + 统一浏览器 API Mock”。

**验收标准**
- 必须：
  - 所有单元/集成用例不得重写被测核心函数实现（PR 审核项）。
  - `tests/run-tests.js` 不再包含基础 Jest 配置常量。
  - 默认测试环境不执行页面脚本，不加载外部资源。
- 质量：
  - 覆盖率不下降；关键目录覆盖率维持或提升（与现阈值一致）。
  - 开发态通过 `detectOpenHandles` 定位潜在泄漏；日志无过量。

**风险与回滚**
- 风险：真实实现引入后，历史“伪实现”遮蔽的缺陷可能显现，导致短期内红测增多。
- 回滚：以文件粒度分阶段迁移；为每次迁移保留独立 PR；必要时仅回滚某文件改动。

**度量与里程碑**
- M1（配置统一）：运行时间、稳定性对比；配置文件差异为零。
- M2（逻辑去伪）：伪实现文件/行数减至 0；真实分支覆盖上升。
- M3（Mock 收敛）：全局 Mock 数量与范围降至目标；用例执行时间稳定或下降。
