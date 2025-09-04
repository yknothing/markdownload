/**
 * 真实TurndownService转换测试
 * 
 * 目的：解决过度Mock问题，使用真实的TurndownService进行测试
 * 确保测试能够发现真实的转换问题和边界情况
 */

// 不Mock TurndownService，使用真实库
const TurndownService = require('turndown');
const turndownPluginGfm = require('turndown-plugin-gfm');
const { JSDOM } = require('jsdom');

// 仅Mock浏览器特定的API，保留核心业务逻辑
const mockBrowserAPIs = () => {
  global.browser = {
    runtime: { getURL: jest.fn(url => `chrome-extension://test/${url}`) }
  };
  
  global.URL = class extends require('url').URL {
    static createObjectURL = jest.fn(() => 'blob:mock-url');
    static revokeObjectURL = jest.fn();
  };
};

describe('真实TurndownService转换测试', () => {
  let realTurndownService;

  beforeAll(() => {
    mockBrowserAPIs();
  });

  beforeEach(() => {
    // 使用真实的TurndownService
    realTurndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '___',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '_',
      strongDelimiter: '**',
      linkStyle: 'inlined'
    });

    // 使用真实的GFM插件
    realTurndownService.use(turndownPluginGfm.gfm);
  });

  describe('基本HTML转换真实场景测试', () => {
    test('应该正确转换真实的标题结构', () => {
      const html = `
        <h1>主标题</h1>
        <h2>二级标题</h2>
        <h3>三级标题</h3>
        <p>段落内容</p>
      `;

      const markdown = realTurndownService.turndown(html);

      expect(markdown).toContain('# 主标题');
      expect(markdown).toContain('## 二级标题');
      expect(markdown).toContain('### 三级标题');
      expect(markdown).toContain('段落内容');
      
      // 验证格式化正确
      expect(markdown).not.toContain('<h1>');
      expect(markdown).not.toContain('<p>');
    });

    test('应该正确处理复杂的HTML结构', () => {
      const html = `
        <article>
          <header>
            <h1>文章标题</h1>
            <p class="meta">作者：<strong>张三</strong> | 发布时间：<em>2024-01-15</em></p>
          </header>
          <section>
            <h2>第一节</h2>
            <p>这是一个包含<strong>粗体</strong>和<em>斜体</em>的段落。</p>
            <ul>
              <li>列表项 1</li>
              <li>列表项 2 包含<code>内联代码</code></li>
              <li>列表项 3</li>
            </ul>
          </section>
        </article>
      `;

      const markdown = realTurndownService.turndown(html);

      // 验证所有内容都正确转换
      expect(markdown).toContain('# 文章标题');
      expect(markdown).toContain('**张三**');
      expect(markdown).toContain('_2024-01-15_');
      expect(markdown).toContain('## 第一节');
      expect(markdown).toContain('**粗体**');
      expect(markdown).toContain('_斜体_');
      expect(markdown).toMatch(/[-*+]\s+列表项 1/);
      expect(markdown).toContain('`内联代码`');
    });

    test('应该正确处理表格（GFM扩展）', () => {
      const html = `
        <table>
          <thead>
            <tr><th>姓名</th><th>年龄</th><th>职业</th></tr>
          </thead>
          <tbody>
            <tr><td>张三</td><td>25</td><td>程序员</td></tr>
            <tr><td>李四</td><td>30</td><td>设计师</td></tr>
          </tbody>
        </table>
      `;

      const markdown = realTurndownService.turndown(html);

      // 验证表格转换为GFM格式
      expect(markdown).toContain('| 姓名 | 年龄 | 职业 |');
      expect(markdown).toContain('| --- | --- | --- |');
      expect(markdown).toContain('| 张三 | 25 | 程序员 |');
      expect(markdown).toContain('| 李四 | 30 | 设计师 |');
    });
  });

  describe('真实图片处理测试', () => {
    test('应该正确处理图片标签', () => {
      const html = `
        <img src="https://example.com/image.jpg" alt="测试图片" title="图片标题">
        <img src="/relative/path/image.png" alt="相对路径图片">
        <img src="data:image/png;base64,iVBORw0KGg..." alt="Base64图片">
      `;

      const markdown = realTurndownService.turndown(html);

      expect(markdown).toContain('![测试图片](https://example.com/image.jpg "图片标题")');
      expect(markdown).toContain('![相对路径图片](/relative/path/image.png)');
      expect(markdown).toContain('![Base64图片](data:image/png;base64,iVBORw0KGg...)');
    });

    test('应该处理图片的边界情况', () => {
      const html = `
        <img src="">
        <img alt="只有alt属性">
        <img src="https://example.com/image.jpg">
        <img src="https://example.com/image with spaces.jpg" alt="空格文件名">
      `;

      const markdown = realTurndownService.turndown(html);

      // 真实的TurndownService会如何处理这些边界情况
      expect(markdown).toBeDefined();
      expect(typeof markdown).toBe('string');
      
      // 验证空格处理
      expect(markdown).toContain('![空格文件名](https://example.com/image with spaces.jpg)');
    });
  });

  describe('真实代码块处理测试', () => {
    test('应该正确处理代码块', () => {
      const html = `
        <pre><code class="language-javascript">
function hello() {
  console.log("Hello, World!");
  return "success";
}
        </code></pre>
      `;

      const markdown = realTurndownService.turndown(html);

      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('function hello()');
      expect(markdown).toContain('console.log("Hello, World!");');
      expect(markdown).toContain('```');
    });

    test('应该处理没有语言指定的代码块', () => {
      const html = `
        <pre><code>
generic code block
without language
        </code></pre>
      `;

      const markdown = realTurndownService.turndown(html);

      expect(markdown).toContain('```');
      expect(markdown).toContain('generic code block');
      expect(markdown).toContain('without language');
    });
  });

  describe('真实链接处理测试', () => {
    test('应该正确处理各种链接', () => {
      const html = `
        <p>
          访问<a href="https://example.com">官方网站</a>获取更多信息。
          查看<a href="/docs/guide.html" title="用户指南">用户指南</a>了解详情。
          发送邮件到<a href="mailto:support@example.com">support@example.com</a>。
        </p>
      `;

      const markdown = realTurndownService.turndown(html);

      expect(markdown).toContain('[官方网站](https://example.com)');
      expect(markdown).toContain('[用户指南](/docs/guide.html "用户指南")');
      expect(markdown).toContain('[support@example.com](mailto:support@example.com)');
    });
  });

  describe('边界情况和错误处理', () => {
    test('应该处理恶意或畸形HTML', () => {
      const malformedHTML = `
        <h1>未闭合标题
        <p>嵌套<div>不当的<span>HTML</h1>
        <img src="javascript:alert('xss')" alt="潜在XSS">
      `;

      expect(() => {
        const markdown = realTurndownService.turndown(malformedHTML);
        expect(typeof markdown).toBe('string');
      }).not.toThrow();
    });

    test('应该处理空内容', () => {
      const emptyInputs = ['', null, undefined];

      emptyInputs.forEach(input => {
        const result = realTurndownService.turndown(input || '');
        expect(typeof result).toBe('string');
      });
    });

    test('应该处理大量重复内容', () => {
      const largeHTML = '<p>重复内容</p>'.repeat(1000);
      
      const startTime = Date.now();
      const markdown = realTurndownService.turndown(largeHTML);
      const duration = Date.now() - startTime;

      expect(typeof markdown).toBe('string');
      expect(markdown.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('真实网页内容测试', () => {
    test('应该处理典型博客文章结构', () => {
      const blogHTML = `
        <article class="post">
          <header>
            <h1 class="post-title">如何优化前端性能</h1>
            <div class="post-meta">
              <span class="author">作者：李明</span>
              <time datetime="2024-01-15">2024年1月15日</time>
            </div>
          </header>
          
          <div class="post-content">
            <p class="lead">前端性能优化是现代Web开发中的关键环节...</p>
            
            <h2>1. 图片优化</h2>
            <p>合理使用图片格式：</p>
            <ul>
              <li><strong>WebP</strong> - 现代浏览器的首选</li>
              <li><strong>JPEG</strong> - 照片和复杂图像</li>
              <li><strong>PNG</strong> - 透明图像和简单图形</li>
            </ul>
            
            <h2>2. 代码分割</h2>
            <p>使用动态导入实现代码分割：</p>
            <pre><code class="language-javascript">
// 动态导入示例
const LazyComponent = React.lazy(() => import('./LazyComponent'));
            </code></pre>
            
            <blockquote>
              <p>性能优化不是一次性的任务，而是持续的过程。</p>
            </blockquote>
          </div>
          
          <footer class="post-footer">
            <p>标签: <a href="/tag/performance" rel="tag">性能优化</a>, <a href="/tag/frontend" rel="tag">前端开发</a></p>
          </footer>
        </article>
      `;

      const markdown = realTurndownService.turndown(blogHTML);

      // 验证文章结构完整转换
      expect(markdown).toContain('# 如何优化前端性能');
      expect(markdown).toContain('作者：李明');
      expect(markdown).toContain('## 1\\. 图片优化');
      expect(markdown).toContain('**WebP**');
      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('React.lazy');
      expect(markdown).toContain('> 性能优化不是一次性的任务');
      expect(markdown).toContain('[性能优化](/tag/performance)');
    });

    test('应该处理复杂的文档页面', () => {
      const docHTML = `
        <div class="documentation">
          <nav class="toc">
            <h2>目录</h2>
            <ul>
              <li><a href="#introduction">介绍</a></li>
              <li><a href="#installation">安装</a></li>
              <li><a href="#usage">使用方法</a></li>
            </ul>
          </nav>
          
          <main>
            <section id="introduction">
              <h1>项目介绍</h1>
              <p>这是一个用于<code>HTML</code>到<code>Markdown</code>转换的工具...</p>
            </section>
            
            <section id="installation">
              <h2>安装指南</h2>
              <p>通过npm安装：</p>
              <pre><code class="language-bash">npm install markdownload</code></pre>
              
              <div class="note">
                <p><strong>注意：</strong>需要Node.js版本 &gt;= 14.0.0</p>
              </div>
            </section>
          </main>
        </div>
      `;

      const markdown = realTurndownService.turndown(docHTML);

      expect(markdown).toContain('## 目录');
      expect(markdown).toContain('[介绍](#introduction)');
      expect(markdown).toContain('# 项目介绍');
      expect(markdown).toContain('`HTML`');
      expect(markdown).toContain('```bash');
      expect(markdown).toContain('npm install');
      expect(markdown).toContain('**注意：**');
    });
  });

  describe('性能和稳定性测试', () => {
    test('应该稳定处理重复转换', () => {
      const html = '<h1>测试</h1><p>内容</p>';
      const results = [];

      for (let i = 0; i < 100; i++) {
        results.push(realTurndownService.turndown(html));
      }

      // 所有结果应该相同
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });
    });

    test('应该处理Unicode和特殊字符', () => {
      const html = `
        <h1>Unicode测试：中文、Русский、العربية、🚀</h1>
        <p>特殊字符：&lt; &gt; &amp; &quot; &#39;</p>
        <p>数学符号：∑ ∫ ∆ π α β γ</p>
      `;

      const markdown = realTurndownService.turndown(html);

      expect(markdown).toContain('中文、Русский、العربية、🚀');
      expect(markdown).toContain('< > & " \'');
      expect(markdown).toContain('∑ ∫ ∆ π α β γ');
    });
  });

  afterEach(() => {
    // 清理状态
    realTurndownService = null;
  });
});