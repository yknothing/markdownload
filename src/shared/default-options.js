// 这些是默认选项（保持不可变的基准配置）
const defaultOptions = {
  headingStyle: "atx",
  hr: "___",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  fence: "```",
  emDelimiter: "_",
  strongDelimiter: "**",
  linkStyle: "inlined",
  linkReferenceStyle: "full",
  imageStyle: "markdown",
  imageRefStyle: "inlined",
  frontmatter: "---\ncreated: {date:YYYY-MM-DDTHH:mm:ss} (UTC {date:Z})\ntags: [{keywords}]\nsource: {baseURI}\nauthor: {byline}\n---\n\n# {pageTitle}\n\n> ## Excerpt\n> {excerpt}\n\n---",
  backmatter: "",
  title: "{pageTitle}",
  includeTemplate: false,
  saveAs: false,
  downloadImages: false,
  imagePrefix: '{pageTitle}/',
  mdClipsFolder: null,
  disallowedChars: '[]#^',
  downloadMode: 'downloadsApi',
  turndownEscape: true,
  contextMenus: true,
  obsidianIntegration: false,
  obsidianVault: "",
  obsidianFolder: "",
}

/**
 * 获取 Browser API 工厂（在不同环境下回退）
 */
function getBrowserApiFactory() {
  try {
    if (typeof global !== 'undefined' && global.BrowserApiFactory) {
      return global.BrowserApiFactory.getInstance();
    } else if (typeof globalThis !== 'undefined' && globalThis.BrowserApiFactory) {
      return globalThis.BrowserApiFactory.getInstance();
    } else if (typeof window !== 'undefined' && window.BrowserApiFactory) {
      return window.BrowserApiFactory.getInstance();
    } else if (typeof require !== 'undefined') {
      // 仅在测试环境下可用，由测试注入 mock
      // eslint-disable-next-line global-require
      const Factory = require('./browser-api-factory.js');
      return Factory.getInstance();
    }
  } catch (_) { /* ignore and fallback */ }

  // 最后回退：直接封装 webextension API
  return {
    getStorageApi: () => ({ get: (keys) => browser?.storage?.sync?.get(keys) }),
    getDownloadsApi: () => (browser?.downloads ? browser.downloads : null)
  };
}

// 从存储获取选项；失败时返回默认值，并记录日志/错误
async function getOptions() {
  let options = { ...defaultOptions }; // 始终返回全新对象

  const factory = getBrowserApiFactory();
  let storageApi = null;
  let downloadsApi = null;

  try {
    storageApi = factory?.getStorageApi?.() || null;
  } catch (_) { storageApi = null; }
  try {
    downloadsApi = factory?.getDownloadsApi?.() || null;
  } catch (_) { downloadsApi = null; }

  try {
    const storedOptions = await (storageApi?.get?.(null));
    if (storedOptions && typeof storedOptions === 'object') {
      // 合并并保持自定义字段
      options = { ...defaultOptions, ...storedOptions };

      // 关键字段校验与回退
      if (!options.title || typeof options.title !== 'string') {
        console.warn('getOptions: Invalid title option, using default');
        options.title = defaultOptions.title;
      }
      if (!options.disallowedChars || typeof options.disallowedChars !== 'string') {
        console.warn('getOptions: Invalid disallowedChars option, using default');
        options.disallowedChars = defaultOptions.disallowedChars;
      }
    } else {
      console.warn('getOptions: Invalid stored options, using defaults');
    }
  } catch (err) {
    console.error('getOptions: Failed to load from storage:', err);
    try {
      self?.serviceWorkerStatus?.errors?.push({
        type: 'options-load-error',
        message: err.message,
        timestamp: Date.now()
      });
    } catch (_) { /* ignore */ }
  }

  // Downloads API 可用性回退逻辑
  if (!downloadsApi) {
    options.downloadMode = 'contentLink';
  }

  return options;
}

// 导出到测试环境（vm 执行通过上下文属性访问）
if (typeof module !== 'undefined') {
  module.exports = { defaultOptions, getOptions, getBrowserApiFactory };
}
