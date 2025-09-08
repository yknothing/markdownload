Version: TA-1.0.2 | Phase: CURRENT | Status: Active | Owner: Claude Code Assistant | Updated: 2025-09-08

# 本阶段唯一入口（请严格按此执行）

如何使用（必读）
- 只看并只改本文件完成本阶段工作（PDCA 闭环在此文件内）。
- 三件套保持稳定：`test_architecture_assessment.md`、`auto_test_enhance.md`、`test_refactor_strategy.md` 不改原则内容（除非重大缺陷）。
- 所有数字一律来自覆盖产物（禁止手输）。

当前真相（Single Source of Truth）
- 全局覆盖产物：`coverage/coverage-summary.json`
  - 命令（全局分支覆盖%）：`jq -r '.total.branches.pct' coverage/coverage-summary.json`
- 逐文件覆盖产物：`coverage/file-summary.json`
  - 命令（模块分支覆盖%）：`jq -r '."<PATH>".branches.percentage' coverage/file-summary.json`
- 现行质量门（CI）：覆盖率阈值（行）= 22（参见 `.github/workflows/quality-gates.yml`）
- validateUri 规则：告警（非阻断）

目标（Plan）- 分两段冲刺至40%分支覆盖
- **第一段目标（7天）**：全局分支覆盖 ≥ 34-36%（当前基线19.58%，需+560个covered branches）
- **第二段目标（再7天）**：全局分支覆盖 ≥ 40%
- **A组（必做-0%模块优先）**：security-validator(149分支→25%,+37)，async-utils(60→40%,+24)，download-processor(95→30%,+29)，message-queue(76→30%,+23)，error-recovery(78→25%,+20)，dependency-injector(44→30%,+13) → 小计+169
- **B组（必做-中高权重）**：dom-polyfill(304分支,24%→50%,+79)，browser-api(74,43%→70%,+20)，download-manager(103,59%→80%,+21) → 小计+120  
- **C组（冲刺）**：background(371,44.74%→55%,+39)，service-worker(265,8.3%→25%,+45) → 小计+84
- CI门槛（行覆盖）= 22%（以 .github/workflows/quality-gates.yml 为准）

实施（Do）
1) 运行并生成覆盖产物（两者都要有）
   - `npm run test:hybrid:coverage -- --coverageReporters=json-summary`
   - `npm run coverage:file-summary`
2) 采集必须粘贴的数据（只允许粘贴命令输出）
   - 全局分支：`jq -r '.total.branches.pct' coverage/coverage-summary.json`
   - 背景模块：`jq -r '.files["src/background/background.js"].branches.percentage' coverage/file-summary.json`
   - SW 模块：`jq -r '.files["src/background/service-worker.js"].branches.percentage' coverage/file-summary.json`
3) 提交 PR（四项必填，缺一视为未就绪）
   - 关联任务：本文件目标条目（如“背景模块 ≥ 40%”）
   - 覆盖数据（命令原样输出）：
     - 全局：branches.pct = <数字>
     - 模块：<PATH> branches.percentage = <数字>
   - 质量门说明：覆盖阈值 22；若触发 validateUri 告警需说明原因与后续收敛
   - 涉及文件：列出修改的 src/tests 路径（每行一个）

评审/验收（Check）
- 在此粘贴验证数据（命令输出）：
  - 全局分支：19.51
  - 背景模块：44.2
  - SW 模块：8.3
- 结论（1 行）：全局 19.51 < 34.00 未通过（差距14.49%）；background 44.2 < 55.00 未通过（差距10.8%）；SW 8.3 < 25.00 未通过（差距16.7%）

反馈/修订（Act）- 40%分支覆盖攻坚计划
- 当前差距分析：19.58% → 40%，需新增≈+560个covered branches，采用"0%模块优先+高权重低覆盖+SW背景冲刺"组合策略
- **D1-D3执行**（A组+部分B组，目标+220-260分支，全局+8-9%）：
  - security-validator.js(0%→25%)：协议白/黑名单、路径遍历拦截、脚本清洗、配置开关分支
  - async-utils.js(0%→40%)：retry/backoff成功失败、取消令牌、debounce/throttle边界分支  
  - download-processor.js(0%→30%)：文件名validate/sanitize/unique、浏览器错误回退分支
- **D4-D5执行**（剩余B组+C组小步，目标+180-220分支，全局+6-8%）：
  - dom-polyfill.js(24%→50%)：Node/Element API异常边界、null目标、重复移除、事件解绑、Range越界
  - browser-api.js(43%→70%)：runtime.sendMessage异常、downloads权限拒绝、storage默认值回退
- **D6-D7执行**（C组冲刺+D组补差，目标+120-160分支，全局+5-6%）：
  - service-worker.js(8.3%→25%)：onMessage success/error、downloads cancel/失败/重试、onDeterminingFilename冲突uniquify
  - background.js(44.74%→55%)：textReplace未匹配占位、validateUri各种协议、generateValidFileName截断/非法字符

实施记录（PR 清单，仅追加，不删改）
- PR#____｜描述（50 字内）｜影响文件：
- PR#____｜……

阶段收尾（冻结）
- 达成目标后：
  - 将本文件重命名为 `docs/TDD/PHASE_<N>.md`（如 PHASE_5.md）。
  - 复制本模板为新的 `docs/TDD/PHASE_CURRENT.md`，仅更新头部与新目标。

禁止事项（避免歧义）
- 禁止手写覆盖率数字（必须贴命令输出）。
- 禁止缺失 PR 四项必填。
- 禁止在本文件之外另建阶段文档。
- 禁止修改三件套的原则性内容（除非经批准认定“重大缺陷”）。

常用模块路径（便于复制）
- 背景：`src/background/background.js`
- Service Worker：`src/background/service-worker.js`
- Turndown：`src/background/converters/turndown-manager.js`
- 内容提取：`src/background/extractors/content-extractor.js`
- 浏览器 API：`src/background/api/browser-api.js`
- DOM polyfill：`src/background/polyfills/dom-polyfill.js`

