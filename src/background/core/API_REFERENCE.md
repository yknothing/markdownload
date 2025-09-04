# MarkDownload Service Worker API Reference

## 📚 模块化架构API文档

本文档提供了MarkDownload Service Worker模块化架构的完整API参考。

---

## 🔧 核心模块

### 1. ServiceWorkerInit - 初始化模块

负责Service Worker的初始化、依赖加载和健康检查。

#### 初始化方法
```javascript
// 异步初始化所有依赖
await self.ServiceWorkerInit.initialize()

// 等待初始化完成
await self.ServiceWorkerInit.waitForReady(timeout)

// 检查初始化状态
const status = self.ServiceWorkerInit.getStatus()
```

#### 属性
```javascript
// 全局下载状态管理
self.ServiceWorkerInit.globalDownloadInProgress // boolean
self.ServiceWorkerInit.downloadDebounceTime     // number (ms)

// 健康状态
self.ServiceWorkerInit.serviceWorkerStatus      // object
```

#### 示例
```javascript
// 完整初始化流程
try {
  await self.ServiceWorkerInit.initialize();
  console.log('Service Worker ready!');

  const status = self.ServiceWorkerInit.getStatus();
  console.log('Health status:', status);
} catch (error) {
  console.error('Initialization failed:', error);
}
```

---

### 2. ErrorHandler - 错误处理模块

提供全局错误捕获、分类和恢复机制。

#### 核心方法
```javascript
// 记录错误
self.ErrorHandler.logError(error, context, category, level)

// 分类错误处理
self.ErrorHandler.handleServiceWorkerError(error, operation)
self.ErrorHandler.handleNetworkError(error, url, operation)
self.ErrorHandler.handleDOMError(error, operation)
self.ErrorHandler.handleTurndownError(error, content, operation)
self.ErrorHandler.handleDownloadError(error, filename, operation)
```

#### 常量
```javascript
// 错误级别
self.ErrorHandler.LEVELS.DEBUG    // 'debug'
self.ErrorHandler.LEVELS.INFO     // 'info'
self.ErrorHandler.LEVELS.WARN     // 'warn'
self.ErrorHandler.LEVELS.ERROR    // 'error'
self.ErrorHandler.LEVELS.CRITICAL // 'critical'

// 错误分类
self.ErrorHandler.CATEGORIES.NETWORK     // 'network'
self.ErrorHandler.CATEGORIES.DOM         // 'dom'
self.ErrorHandler.CATEGORIES.TURNDOWN    // 'turndown'
self.ErrorHandler.CATEGORIES.DOWNLOAD    // 'download'
self.ErrorHandler.CATEGORIES.INITIALIZATION // 'initialization'
```

#### 工具方法
```javascript
// 获取错误统计
const stats = self.ErrorHandler.getStats()

// 导出错误日志
const logData = self.ErrorHandler.exportLog()

// 清空错误日志
self.ErrorHandler.clearLog()
```

#### 示例
```javascript
// 处理网络错误
try {
  await fetch(url);
} catch (error) {
  self.ErrorHandler.handleNetworkError(error, url, 'api-request');
}

// 记录自定义错误
self.ErrorHandler.logError(
  new Error('Custom error'),
  { operation: 'test', userId: 123 },
  self.ErrorHandler.CATEGORIES.VALIDATION,
  self.ErrorHandler.LEVELS.WARN
);
```

---

### 3. DOMPolyfill - DOM兼容模块

提供Service Worker环境下的DOM API兼容性。

#### 核心功能
```javascript
// 检查DOM polyfill状态
const isReady = self.DOMPolyfill.isReady()

// 创建DOM元素
const element = self.DOMPolyfill.createElement(tagName)

// 创建文本节点
const textNode = self.DOMPolyfill.createTextNode(text)

// 创建完整文档
const doc = self.DOMPolyfill.createDocument(title)
```

#### 全局对象
模块自动安装以下全局对象：
- `globalThis.document`
- `globalThis.DOMParser`
- `globalThis.Node`

#### 示例
```javascript
// 使用DOM API
const parser = new DOMParser();
const doc = parser.parseFromString(htmlString, 'text/html');

const element = doc.createElement('div');
element.textContent = 'Hello World';
element.innerHTML = '<span>test</span>';
```

---

## 📄 业务模块

### 4. ContentExtractor - 内容提取器

负责网页内容的智能提取和预处理。

#### 主要方法
```javascript
// 提取网页内容
const article = await self.ContentExtractor.extract(
  htmlString,    // HTML内容
  baseURI,       // 基础URI
  pageTitle,     // 页面标题
  options        // 提取选项
)

// 获取当前图片列表
const images = self.ContentExtractor.getImageList()

// 清理状态
self.ContentExtractor.clearState()
```

#### 提取策略
```javascript
// 可用的提取策略
self.ContentExtractor.strategies.READABILITY  // 'readability'
self.ContentExtractor.strategies.CUSTOM      // 'custom'
self.ContentExtractor.strategies.FALLBACK    // 'fallback'
```

#### 配置选项
```javascript
const options = {
  cleanAttributes: true,     // 是否清理属性
  extractExcerpt: true,      // 是否提取摘要
  minContentLength: 100,     // 最小内容长度
  qualityThreshold: 0.7      // 质量阈值
}
```

#### 示例
```javascript
// 完整内容提取流程
const article = await self.ContentExtractor.extract(
  htmlContent,
  'https://example.com',
  'Example Page',
  { cleanAttributes: true }
);

console.log('提取结果:', {
  title: article.title,
  contentLength: article.content.length,
  method: article.extractionMethod,
  quality: article.qualityScore
});
```

---

### 5. TurndownManager - 转换器管理器

处理HTML到Markdown的转换。

#### 转换方法
```javascript
// 转换HTML到Markdown
const result = await self.TurndownManager.convert(
  htmlContent,   // HTML内容
  options,       // 转换选项
  article        // 文章对象
)

// 返回值结构
{
  markdown: string,     // 转换后的Markdown
  imageList: object,    // 图片列表
  references: array     // 引用列表
}
```

#### 配置选项
```javascript
const options = {
  // 内容格式
  frontmatter: '---\ntitle: "{{title}}"\n---\n\n',
  backmatter: '\n\n---\n*Generated by MarkDownload*',

  // 转义设置
  turndownEscape: true,

  // 链接处理
  linkStyle: 'keep',        // 'keep' | 'stripLinks'

  // 代码块样式
  codeBlockStyle: 'fenced', // 'fenced' | 'indented'
  fence: '```',             // 围栏字符

  // 图片处理
  downloadImages: true,
  imageStyle: 'markdown',   // 'markdown' | 'obsidian' | 'noImage'
  imageRefStyle: 'inline',  // 'inline' | 'referenced'
  imagePrefix: 'images/'    // 图片前缀
}
```

#### 状态管理
```javascript
// 获取图片列表
const images = self.TurndownManager.getImageList()

// 获取转换统计
const stats = self.TurndownManager.getStats()

// 清理状态
self.TurndownManager.clearState()
```

#### 示例
```javascript
// 高级转换配置
const options = {
  frontmatter: '---\ntitle: "{{title}}"\nauthor: "{{byline}}"\n---\n\n',
  downloadImages: true,
  imageStyle: 'obsidian',
  codeBlockStyle: 'fenced'
};

const result = await self.TurndownManager.convert(content, options, article);

// 使用结果
console.log('Markdown:', result.markdown);
console.log('Images to download:', Object.keys(result.imageList));
```

---

### 6. DownloadManager - 下载管理器

处理文件下载和资源管理。

#### 下载方法
```javascript
// 执行下载
const result = await self.DownloadManager.download({
  markdown: string,          // Markdown内容
  title: string,             // 文件标题
  tabId: number,             // 标签页ID
  imageList: object,         // 图片列表
  mdClipsFolder: string,     // 文件夹路径
  options: object            // 下载选项
})
```

#### 下载模式
```javascript
// 可用的下载模式
self.DownloadManager.MODES.DOWNLOADS_API    // 'downloadsApi'
self.DownloadManager.MODES.CONTENT_SCRIPT   // 'contentScript'
self.DownloadManager.MODES.OBSIDIAN_URI     // 'obsidianUri'
```

#### 下载状态
```javascript
// 下载状态常量
self.DownloadManager.STATES.PENDING    // 'pending'
self.DownloadManager.STATES.DOWNLOADING // 'downloading'
self.DownloadManager.STATES.COMPLETED  // 'completed'
self.DownloadManager.STATES.FAILED     // 'failed'
```

#### 工具方法
```javascript
// 生成有效文件名
const filename = self.DownloadManager.generateValidFileName(
  title,           // 原始标题
  disallowedChars  // 禁用字符列表
)

// Base64编码
const encoded = self.DownloadManager.base64EncodeUnicode(text)

// 获取下载统计
const stats = self.DownloadManager.getStats()

// 清理下载资源
self.DownloadManager.cleanup()
```

#### 示例
```javascript
// 完整下载流程
const downloadOptions = {
  markdown: markdownContent,
  title: 'My Document',
  tabId: currentTabId,
  imageList: imageList,
  mdClipsFolder: 'notes/',
  options: {
    downloadMode: 'downloadsApi',
    saveAs: false
  }
};

const result = await self.DownloadManager.download(downloadOptions);

console.log('下载结果:', {
  success: result.success,
  downloadId: result.downloadId,
  filename: result.filename,
  imagesDownloaded: result.imagesDownloaded
});
```

---

### 7. BrowserAPI - 浏览器API封装

统一浏览器API接口，提供兼容性保证。

#### API可用性检查
```javascript
// 检查API可用性
const isAvailable = self.BrowserAPI.isAvailable('downloads')
const allStatus = self.BrowserAPI.getStatus()

// 条件使用API
if (self.BrowserAPI.isAvailable('downloads')) {
  await self.BrowserAPI.downloadFile(options);
}
```

#### 下载API
```javascript
// 下载文件
const downloadId = await self.BrowserAPI.downloadFile({
  url: blobUrl,
  filename: 'document.md',
  saveAs: false
})

// 搜索下载
const downloads = await self.BrowserAPI.searchDownloads({ state: 'complete' })

// 监听下载变化
const cleanup = self.BrowserAPI.onDownloadChanged((delta) => {
  if (delta.state?.current === 'complete') {
    console.log('下载完成:', delta.id);
  }
});
```

#### 标签页API
```javascript
// 获取活动标签页
const activeTab = await self.BrowserAPI.getActiveTab()

// 获取指定标签页
const tab = await self.BrowserAPI.getTab(tabId)

// 向标签页发送消息
const response = await self.BrowserAPI.sendMessageToTab(tabId, message)
```

#### 脚本执行
```javascript
// 执行脚本
const results = await self.BrowserAPI.executeScriptInTab(tabId, {
  func: (data) => console.log(data),
  args: ['Hello from service worker']
});
```

#### 存储API
```javascript
// 获取选项
const options = await self.BrowserAPI.getOptions()

// 保存选项
await self.BrowserAPI.saveOptions(newOptions)

// 获取默认选项
const defaults = self.BrowserAPI.getDefaultOptions()
```

#### 消息传递
```javascript
// 监听消息
const cleanup = self.BrowserAPI.onMessage((message, sender, sendResponse) => {
  console.log('收到消息:', message);

  // 异步响应
  sendResponse({ success: true });
});

// 发送消息
const response = await self.BrowserAPI.sendRuntimeMessage({
  action: 'updateSettings',
  data: newSettings
});
```

#### 示例
```javascript
// 检查并使用浏览器API
if (self.BrowserAPI.isAvailable('downloads')) {
  try {
    // 下载文件
    const downloadId = await self.BrowserAPI.downloadFile({
      url: URL.createObjectURL(blob),
      filename: 'document.md'
    });

    // 监听下载完成
    const cleanup = self.BrowserAPI.onDownloadChanged((delta) => {
      if (delta.id === downloadId && delta.state?.current === 'complete') {
        console.log('下载完成！');
        cleanup(); // 清理监听器
      }
    });

  } catch (error) {
    console.error('下载失败:', error);
  }
} else {
  console.warn('下载API不可用');
}
```

---

## 🔗 构建集成模块

### BuildIntegration - 工作流集成

提供模块间协作的高级接口。

#### 完整工作流
```javascript
// 执行完整的处理工作流
const result = await self.BuildIntegration.processContent(
  htmlString,    // HTML内容
  baseURI,       // 基础URI
  pageTitle,     // 页面标题
  tabId,         // 标签页ID
  options        // 处理选项
)

// 返回值结构
{
  success: boolean,
  article: object,        // 提取的文章
  markdown: string,       // 转换后的Markdown
  imageList: object,      // 图片列表
  downloadResult: object  // 下载结果
}
```

#### 模块管理
```javascript
// 执行模块健康检查
const health = self.BuildIntegration.healthCheck()

// 初始化所有模块
await self.BuildIntegration.initializeAll()

// 获取工作流统计
const stats = self.BuildIntegration.getStats()

// 清理所有模块
self.BuildIntegration.cleanup()
```

#### 示例
```javascript
// 完整的内容处理工作流
try {
  const result = await self.BuildIntegration.processContent(
    htmlContent,
    document.baseURI,
    document.title,
    currentTabId,
    {
      downloadImages: true,
      imageStyle: 'obsidian',
      frontmatter: '---\ntitle: "{{title}}"\n---\n\n'
    }
  );

  if (result.success) {
    console.log('处理成功！');
    console.log('标题:', result.article.title);
    console.log('Markdown长度:', result.markdown.length);
    console.log('下载的图片数量:', Object.keys(result.imageList).length);
  }

} catch (error) {
  console.error('处理失败:', error);
  // 错误已由ErrorHandler自动处理
}
```

---

## 📋 使用模式

### 1. 基础使用模式
```javascript
// 简单的单模块使用
const article = await self.ContentExtractor.extract(html, baseURI, title);
const markdown = await self.TurndownManager.convert(article.content, options);
await self.DownloadManager.download({ markdown, title, tabId });
```

### 2. 高级集成模式
```javascript
// 使用构建集成模块进行完整工作流
const result = await self.BuildIntegration.processContent(
  html, baseURI, title, tabId, options
);
```

### 3. 自定义工作流
```javascript
// 自定义组合模块
const article = await self.ContentExtractor.extract(html, baseURI, title);
const conversion = await self.TurndownManager.convert(
  article.content, options, article
);

// 自定义下载逻辑
const downloadOptions = {
  markdown: conversion.markdown,
  title: article.title,
  imageList: conversion.imageList,
  options: { downloadMode: 'obsidianUri' }
};

await self.DownloadManager.download(downloadOptions);
```

---

## 🔧 最佳实践

### 错误处理
```javascript
try {
  await self.BuildIntegration.processContent(params);
} catch (error) {
  // 错误已由ErrorHandler自动记录
  // 只需处理用户界面反馈
  console.error('操作失败，请重试');
}
```

### 资源清理
```javascript
// 长时间运行的应用应该定期清理
setInterval(() => {
  self.DownloadManager.cleanup();
  self.TurndownManager.clearState();
}, 300000); // 5分钟清理一次
```

### 配置管理
```javascript
// 使用BrowserAPI管理配置
const options = await self.BrowserAPI.getOptions();

// 修改配置
options.downloadImages = false;
await self.BrowserAPI.saveOptions(options);
```

---

## 📊 性能监控

### 模块状态监控
```javascript
// 获取所有模块的健康状态
const health = self.BuildIntegration.healthCheck();

// 获取具体模块统计
const downloadStats = self.DownloadManager.getStats();
const conversionStats = self.TurndownManager.getStats();
```

### 性能优化建议
1. **延迟加载**：只在需要时加载大型模块
2. **资源清理**：及时清理blob URLs和监听器
3. **缓存策略**：缓存频繁使用的配置和模板
4. **批量处理**：合并多个小操作

---

*本文档持续更新，反映最新的API变更。如有问题，请参考模块源码或提出issue。*
