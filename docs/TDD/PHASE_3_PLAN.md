# Phase 3 执行计划 — Mock 治理与混合通道收敛

更新时间：2025-09-05

关联文档：
- 现状评估与问题清单：docs/TDD/test_architecture_assessment.md
- 执行规范与验收：docs/TDD/auto_test_enhance.md
- 整改策略与路线图：docs/TDD/test_refactor_strategy.md
- 历史阶段审计：docs/TDD/PHASE_1_AUDIT_REPORT.md, docs/TDD/PHASE_2_AUDIT_REPORT.md

## 一、阶段目标（What）
- 将“混合通道（真实 Turndown + 最小浏览器 Mock）”收敛为默认路径，消除对业务逻辑的任何备用实现（含 fallback）。
- 收敛全局 Mock 面积：仅保留最低必要的全局注入，其余下沉到用例/describe 级作用域。
- 扩充一套小而全的“混合通道冒烟套件（Hybrid Smoke）”，覆盖图片/表格/代码/数学式关键断言，取代分散重复断言。
- 强化 CI 门槛，增加对“赋值式定义业务函数”和“隐藏 fallback”的检测，防止回归。
- 在不牺牲稳定性的前提下，推动覆盖率 ratchet（目标 +2–5%/Phase），优先攻关低覆盖关键模块。

## 二、阶段范围（Scope）
- Mock 管理
  - tests/mocks/hybridMocks.js：仅保留外部依赖的桥接（browser APIs、网络、定时器、URL/Blob 等），业务函数一律从真实模块导入；避免定义任何“备用实现”。
  - tests/setup.js、tests/mocks/browserMocks.js：下沉非必要全局 Mock 至用例或 describe 级；保留最小必要全局（如 TextEncoder/TextDecoder）。
- 用例结构
  - 新增或收敛“混合通道冒烟套件”（tests/integration/content-extraction-conversion.test.js 或同级命名），集中验证图片/表格/代码/数学式四类能力。
  - 合并重复断言到冒烟套件，减少在多个文件的分散重复。
- CI 门槛
  - 继续执行 Phase 0 的伪实现检测，并新增“全局赋值定义业务函数”的检测规则。
  - 清理质量工作流中冗余语句，保持脚本简洁稳健。

## 三、执行步骤（How）
1) Hybrid Mock 清理与统一
  - 在 tests/mocks/hybridMocks.js：
    - 确保通过 `require('../../src/background/background.js')` 导入 `textReplace`、`generateValidFileName` 等业务函数，并赋给全局引用（如确有必要），避免 function 体定义。
    - 删除或拒绝新增任何“备用实现”（包括 function 体或 jest.fn），必要时在无法加载真实模块时抛出提示性错误，而非返回“伪可用”的结果。

2) 全局 Mock 面下沉
  - 在 tests/setup.js、tests/mocks/browserMocks.js：
    - 仅保留最低必要的全局（编码器、基础 DOM polyfill、少量稳定 API）。
    - 其余根据用例特征在对应测试文件内以 `beforeEach/afterEach` 声明，确保作用域最小化。

3) 冒烟套件（Hybrid Smoke）建设
  - 在 tests/integration/ 新增/收敛文件（命名建议：content-extraction-conversion.test.js），涵盖：
    - 图片：原链、下载、Base64、Obsidian 链接、混合成功/失败；
    - 表格：thead/tbody/tfoot、合并单元格简化断言；
    - 代码：fenced code、语言推断/显式设置、围栏自适应；
    - 数学式：inline/block、NBSP 清洗、换行保持；
  - 该文件作为真实路径能力验证的“金丝雀”，每次改动先跑本套件再扩散。

4) CI 门槛加固与脚本清理
  - 在 .github/workflows/quality-gates.yml：
    - 保留 Phase 0 的伪实现检测（`backgroundFunctions = {`、`jest.fn` 等）。
    - 新增检测：
      - `rg -n -S "global\.textReplace\s*=\s*function\(|global\.generateValidFileName\s*=\s*function\(" tests/mocks`
      - 防止以 function 体的方式在 Mock 层定义业务逻辑。
    - 清理“Analyze test results”步骤中重复的 `if [ -f "coverage/test-analysis.json" ]` 行（非阻塞，但建议一致）。

5) Ratchet 政策推进
  - 覆盖率目标：每完成本 Phase 的主要 PR 合入后，按模块/目录设置 +2–5% 的门槛增量：
    - 优先：`src/background/service-worker.js`（行覆盖基线约 21.61%，目标 >30%）。
    - 维持：`src/background/background.js`（已有提升，目标 >40%）。
  - 通过率目标：已达成基线（65.1%），继续稳定化后可考虑上调至 70%。

## 四、迁移检查表（按文件）
- tests/mocks/hybridMocks.js
  - [ ] 仅从真实模块导入业务函数；
  - [ ] 无 `global.textReplace = function(` / `global.generateValidFileName = function(`；
  - [ ] 仅保留外部依赖桥接（browser APIs、网络/时间/URL/Blob 等）。

- tests/setup.js / tests/mocks/browserMocks.js
  - [ ] 全局 Mock 最小化（保留 TextEncoder/TextDecoder/必要 polyfill）；
  - [ ] 非必要 Mock 下沉到对应用例或 describe 级。

- tests/integration/content-extraction-conversion.test.js（或等价文件）
  - [ ] 四类能力断言齐备（图片/表格/代码/数学式）；
  - [ ] 断言可读、去重、覆盖关键边界；
  - [ ] 执行时间可控（<30s）。

- .github/workflows/quality-gates.yml
  - [ ] 新增对全局 function 体定义业务函数的检测；
  - [ ] 清理重复 `if`、维持 rg/grep、bc/awk 双通道 fallback。

## 五、验收标准（DoD）
- 禁止在任何测试文件或 Mock 中定义业务逻辑函数的“备用实现”（含 jest.fn 与 function 体）。
- 混合通道作为默认真实路径验证通道，冒烟套件落地并纳入 CI 运行矩阵。
- CI 门槛：
  - 伪实现检测 0 命中；
  - 配置重复 0 命中；
  - 新增“全局 function 体定义”检测 0 命中；
  - 覆盖率 ≥ 基线 + 2%；通过率 ≥ 基线（或策略约定）。

## 六、里程碑与时间线（建议）
- M1（~1–2 天）：Hybrid Mock 清理 + 全局 Mock 面评估与下沉（提交 1–2 个 PR）。
- M2（~1–2 天）：冒烟套件完成并跑通，覆盖率与不稳定用例评估（提交 1 个 PR）。
- M3（~0.5 天）：CI 门槛增强与脚本清理（提交 1 个 PR）。
- M4（~0.5 天）：Ratchet 增量落地，记录新基线，更新文档（提交 1 个 PR）。

## 七、风险与回滚
- 风险：
  - 真实路径引入后暴露历史问题，短期内红测增多；
  - 全局 Mock 下沉导致个别用例环境未充分准备。
- 缓解：
  - 分 PR、逐文件推进，优先冒烟套件“绿”再扩散；
  - 通过 `beforeEach/afterEach` 明确每个用例所需 Mock；
  - 对偶发失败（flaky）用例产出 Bug 文档并限期处理。
- 回滚：
  - 以文件粒度回滚；
  - 对关键门槛（如新增检测规则）允许临时关闭开关以不阻断主干（限时阈值/标签）。

## 八、度量与报告
- 覆盖率：记录 `coverage/coverage-summary.json` 新基线（行覆盖率期望 ≥ 基线 +2%）。
- 通过率：记录 `coverage/test-summary.md` 新基线（期望 ≥ 基线）。
- 变更影响：在质量报告中附“Mock 面积变化说明”（全局 vs 局部数量对比）。
- 文档更新：在 docs/TDD 目录追加 PHASE_3_AUDIT_REPORT.md（完成后）。

## 九、PR 与审核要点
- PR 描述需包含：
  - 对照三文档（评估/规范/路线图）
  - 执行的迁移检查表条目
  - 执行前后“伪实现/备用实现”检出命令输出
  - 覆盖率/通过率变化（仅列关键指标）
- 审核人关注：
  - 是否存在任何形式的业务逻辑“备用实现”；
  - Mock 范围是否最小化且可读可诊断；
  - 冒烟套件是否覆盖关键能力并保持简洁高效。

---
状态：Ready for Execution（可按本计划分 PR 启动 Phase 3）

