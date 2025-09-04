# Bug 报告模板

ID: BUG-20250904-textreplace-logic-errors
状态: Open
模块: background
首次发现: tests/unit/background/textReplace-bugfix.test.js#textReplace函数 - Bug修复测试
报告人: Claude Code Analysis
创建时间: 2025-09-04

## 摘要
textReplace函数的核心逻辑实现与测试期望不匹配，导致模板处理、兜底逻辑、安全过滤等多个功能失效。

## 复现步骤
1. 运行测试：`npm test tests/unit/background/textReplace-bugfix.test.js`
2. 观察失败的测试用例
3. 检查实际输出与期望输出的差异

## 期望结果
- 空模板应使用默认的{pageTitle}模板
- 无有效内容时应使用兜底标题（pageTitle > title > "download"）
- 安全过滤应移除script标签、javascript协议等恶意内容
- 转义大括号应被正确处理
- 日期、域名等特殊占位符应被正确替换

## 实际结果
- 空模板返回空字符串而非默认值
- 兜底逻辑完全不起作用
- 安全过滤未生效，恶意内容原样返回
- 转义处理不正确
- 特殊占位符未被处理

## 影响范围
- 受影响路径/文件：
  - `src/background/background.js` 中的 textReplace 函数
  - 所有使用模板变量的功能（文件名生成、内容模板等）
- 相关功能/用户场景：
  - 文件名模板处理
  - Frontmatter/Backmatter模板
  - Obsidian集成
  - 安全性（XSS防护）

## 证据
- 日志/截图/失败断言：
  - 测试期望 "测试页面"，实际返回 ""
  - 测试期望移除script标签，实际原样返回
  - 测试期望处理转义，实际返回错误格式
- 失败命令：`npm test tests/unit/background/textReplace-bugfix.test.js`

## 临时规避（可选）
无明显规避方案，需要修复核心逻辑。

## 修复思路（草案）
- 备选方案与取舍：
  1. 修复现有的textReplace函数实现，使其符合测试期望
  2. 更新测试以匹配当前实现（不推荐，违反规范要求）
- 需要的新测试或断言：
  - 确保所有核心功能路径都有覆盖
  - 添加更多边界条件测试

## 关联
- 失败用例：15个相关测试用例
- PR 链接：待创建
- 关闭条件：所有textReplace相关测试通过，核心功能验证正常