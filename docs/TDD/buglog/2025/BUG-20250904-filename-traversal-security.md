# Bug 报告模板

ID: BUG-20250904-filename-traversal-security
状态: Open
模块: background
首次发现: tests/boundary/edge-cases.test.js#文件系统交互 - 危险文件路径
报告人: Claude Code Analysis
创建时间: 2025-09-04

## 摘要
文件名生成函数未能完全阻止路径遍历攻击，危险路径如"../../../etc/passwd"被转换为".._.._etc_passwd"仍包含".."序列，存在安全风险。

## 复现步骤
1. 运行测试：`npm test tests/boundary/edge-cases.test.js`
2. 查看"Dangerous File Paths"测试组
3. 观察生成的文件名仍包含".."

## 期望结果
危险路径应被完全清理，不包含任何".."、"/"、"\"等潜在危险字符序列。

## 实际结果
- 输入: "../../../etc/passwd" → 输出: ".._.._etc_passwd" (仍包含"..")
- 输入: "..\..\..\windows\system32\config\sam" → 输出: ".._.._windows_system32_config_sam" (仍包含"..")

## 影响范围
- 受影响路径/文件：
  - `src/background/background.js` 中的 generateValidFileName 函数
  - 所有涉及文件生成的功能
- 相关功能/用户场景：
  - 下载文件名生成
  - 图片文件名处理
  - 安全性（路径遍历攻击防护）

## 证据
- 失败断言：
  ```
  expect(result).not.toContain('..');
  Expected substring: not ".."
  Received string: ".._.._etc_passwd"
  ```
- 失败命令：`npm test tests/boundary/edge-cases.test.js`

## 临时规避（可选）
在处理文件名时进行额外的安全检查，但根本解决需要修复核心函数。

## 修复思路（草案）
- 备选方案与取舍：
  1. 增强generateValidFileName函数的路径清理逻辑
  2. 添加多轮清理以处理嵌套的危险序列
  3. 更严格的字符白名单方式
- 需要的新测试或断言：
  - 更多复杂的路径遍历攻击测试
  - Unicode编码的路径遍历测试

## 关联
- 失败用例：2个路径遍历相关测试
- PR 链接：待创建
- 关闭条件：所有路径遍历测试通过，安全边界验证正常