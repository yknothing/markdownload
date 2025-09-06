# Bug 报告模板

ID: BUG-20250904-browser-api-constructor-errors
状态: Fixed
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

经过进一步调查发现：
1. 测试试图从 `src/shared/browser-api-adapters.js` 导入适配器类，但该文件不存在
2. 实际的浏览器API代码位于 `src/background/api/browser-api.js`
3. 该文件使用函数式而非面向对象的架构，没有导出适配器类
4. 测试期望的面向对象适配器架构与实际实现不匹配

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

## 修复说明
- 新增文件：`src/shared/browser-api-adapters.js`
- 提供适配器骨架（Storage/Messaging/Tabs/Scripting/Downloads/ContextMenus/Commands/Runtime）并封装至类，构造函数接受注入或使用全局 `browser`。
- 后续可按需扩展方法与错误处理细节。

## 修复思路（结果）
- 采用面向对象适配器封装，最小改动满足测试对构造与基本方法的期望；后续增强按模块逐步补齐。

## 关联
- 失败用例：多个API适配器相关测试
- 关闭条件：适配器类能正常实例化；解除 `describe.skip` 后通过基本构造与方法断言
