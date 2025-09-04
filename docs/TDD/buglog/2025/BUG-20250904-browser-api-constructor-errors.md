# Bug 报告模板

ID: BUG-20250904-browser-api-constructor-errors
状态: Open
模块: background/api
首次发现: tests/unit/background/api/browser-api-adapters.test.js#BrowserStorageAdapter构造函数
报告人: Claude Code Analysis
创建时间: 2025-09-04

## 摘要
浏览器API适配器类(BrowserStorageAdapter等)在测试中报告"不是构造函数"错误，表明模块导出或导入存在问题。

## 复现步骤
1. 运行测试：`npm test tests/unit/background/api/browser-api-adapters.test.js`
2. 观察构造函数相关错误
3. 检查导入导出逻辑

## 期望结果
BrowserStorageAdapter等API适配器类应能正常实例化和使用。

## 实际结果
```
TypeError: BrowserStorageAdapter is not a constructor
```

## 影响范围
- 受影响路径/文件：
  - `src/background/api/browser-api.js` 或相关API模块
  - `tests/unit/background/api/browser-api-adapters.test.js`
- 相关功能/用户场景：
  - 浏览器API抽象层
  - 存储管理功能
  - 下载管理功能

## 证据
- 日志/截图/失败断言：
  - TypeError: BrowserStorageAdapter is not a constructor
- 失败命令：`npm test tests/unit/background/api/browser-api-adapters.test.js`

## 临时规避（可选）
检查相关源代码文件是否存在，以及导出格式是否正确。

## 修复思路（草案）
- 备选方案与取舍：
  1. 检查并修复模块导出格式（ES6 vs CommonJS）
  2. 确保测试中的导入路径正确
  3. 验证源代码中类的定义和导出
- 需要的新测试或断言：
  - 基本的模块加载和实例化测试

## 关联
- 失败用例：多个API适配器相关测试
- PR 链接：待创建
- 关闭条件：API适配器类能正常实例化，相关测试通过