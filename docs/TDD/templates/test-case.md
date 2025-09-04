# 测试用例模板

组件/模块：<背景模块/内容脚本/共享模块/…>
用例名：<可读+可检索>
优先级：P0 | P1 | P2
类型：Unit | Integration | E2E | Boundary | Performance

## 背景
为何需要该用例（需求/缺陷/回归/边界）。

## 前置条件（Arrange）
- 输入数据/HTML 片段：
- 依赖与 mock（仅外部依赖）：
- 环境设定：

## 步骤（Act）

## 断言（Assert）
- 正常：
- 异常：
- 边界：
- 副作用/消息链路：

## 维护与度量
- 涉及覆盖点：分支/函数/语句（目标 %）：
- 性能预算：单测 < X ms；全套 < Y s：
- 清理：资源释放/定时器/开放句柄：

## 备注
- 引用缺陷（如有）：`BUG: docs/TDD/buglog/YYYY/BUG-YYYYMMDD-<slug>.md`

