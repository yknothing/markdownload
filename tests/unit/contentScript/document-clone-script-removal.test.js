/**
 * 单元测试 - Document Clone Script Removal
 * 验证 contentScript.js 在克隆文档后正确移除 script/style/noscript 标签
 *
 * 这个测试模拟了 contentScript.js 中的关键逻辑：
 * 1. 克隆文档对象
 * 2. 从克隆中移除所有 script/style/noscript 标签
 * 3. 将清理后的克隆传递给 Readability
 */

const { JSDOM } = require('jsdom');

describe('Document Clone Script Removal - contentScript.js 逻辑验证', () => {
  /**
   * 模拟 contentScript.js 中的文档克隆和脚本移除逻辑
   */
  function cloneAndCleanDocument(document) {
    // Clone the document to avoid modifying the live page
    const documentClone = document.cloneNode(true);

    // Remove all script, style, and noscript tags from the clone
    const scriptsToRemove = documentClone.querySelectorAll('script, style, noscript');
    scriptsToRemove.forEach(element => {
      element.parentNode?.removeChild(element);
    });

    return documentClone;
  }

  test('应该从文档克隆中移除所有 script 标签', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          if (localStorage.getItem("pref-theme") === "dark") {
            document.body.classList.add("dark");
          }
        </script>
        <script>
          MathJax = { tex: {}, options: {} };
        </script>
      </head>
      <body>
        <h1>Why We Think</h1>
        <p>This is the actual article content.</p>
        <script>
          console.log("Analytics");
        </script>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const document = dom.window.document;

    // 验证原始文档有 script 标签
    expect(document.querySelectorAll('script').length).toBe(3);

    // 克隆并清理
    const cleanedClone = cloneAndCleanDocument(document);

    // 验证克隆中的 script 标签已被移除
    expect(cleanedClone.querySelectorAll('script').length).toBe(0);

    // 验证内容仍然保留
    expect(cleanedClone.querySelector('h1').textContent).toBe('Why We Think');
    expect(cleanedClone.querySelector('p').textContent).toBe('This is the actual article content.');

    // 验证原始文档未被修改
    expect(document.querySelectorAll('script').length).toBe(3);
  });

  test('应该从文档克隆中移除所有 style 标签', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .dark { background: black; }
          .light { background: white; }
        </style>
      </head>
      <body>
        <h1>Test</h1>
        <style>
          body { margin: 0; }
        </style>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const document = dom.window.document;

    expect(document.querySelectorAll('style').length).toBe(2);

    const cleanedClone = cloneAndCleanDocument(document);

    expect(cleanedClone.querySelectorAll('style').length).toBe(0);
    expect(cleanedClone.querySelector('h1').textContent).toBe('Test');
  });

  test('应该从文档克隆中移除所有 noscript 标签', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <noscript>Please enable JavaScript</noscript>
        <h1>Content</h1>
        <noscript>This site requires JavaScript</noscript>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const document = dom.window.document;

    expect(document.querySelectorAll('noscript').length).toBe(2);

    const cleanedClone = cloneAndCleanDocument(document);

    expect(cleanedClone.querySelectorAll('noscript').length).toBe(0);
    expect(cleanedClone.querySelector('h1').textContent).toBe('Content');
  });

  test('应该同时移除 script, style, noscript 标签', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script>var x = 1;</script>
        <style>.test {}</style>
      </head>
      <body>
        <noscript>No JS</noscript>
        <h1>Article</h1>
        <script>var y = 2;</script>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const cleanedClone = cloneAndCleanDocument(document);

    expect(cleanedClone.querySelectorAll('script, style, noscript').length).toBe(0);
    expect(cleanedClone.querySelector('h1').textContent).toBe('Article');
  });

  test('真实场景：包含主题切换脚本的网页（lilianweng.github.io 场景）', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          if (localStorage.getItem("pref-theme") === "dark") {}
          else if (localStorage.getItem("pref-theme") === "light") {}
          else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {}
        </script>
        <script>
          MathJax = { tex: {}, options: {} };
        </script>
        <script src="https://cdn.mathjax.org/mathjax.js"></script>
      </head>
      <body>
        <nav>
          <a href="/posts/">Posts</a>
          <a href="/about/">About</a>
        </nav>
        <main>
          <h1>Why We Think</h1>
          <p>This is the actual article content about thinking and cognition.</p>
          <p>More paragraphs of valuable content...</p>
        </main>
        <script>
          window.addEventListener('load', (event) => {
            console.log('Page loaded');
          });
        </script>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const document = dom.window.document;

    // 验证原始文档有 4 个 script 标签
    expect(document.querySelectorAll('script').length).toBe(4);

    // 克隆并清理
    const cleanedClone = cloneAndCleanDocument(document);

    // 验证所有脚本都被移除
    expect(cleanedClone.querySelectorAll('script').length).toBe(0);
    expect(cleanedClone.querySelectorAll('style').length).toBe(0);
    expect(cleanedClone.querySelectorAll('noscript').length).toBe(0);

    // 验证内容保留
    expect(cleanedClone.querySelector('h1').textContent).toBe('Why We Think');
    const paragraphs = cleanedClone.querySelectorAll('p');
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].textContent).toContain('actual article content');

    // 验证 body 的 innerHTML 不包含 JavaScript 代码
    const bodyHTML = cleanedClone.body.innerHTML;
    expect(bodyHTML).not.toContain('localStorage');
    expect(bodyHTML).not.toContain('MathJax');
    expect(bodyHTML).not.toContain('addEventListener');

    // 但应该包含导航和内容
    expect(bodyHTML).toContain('Posts');
    expect(bodyHTML).toContain('Why We Think');
  });

  test('验证克隆操作不影响原始文档', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><script>var a = 1;</script></head>
      <body>
        <h1>Test</h1>
        <script>var b = 2;</script>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const originalScriptCount = document.querySelectorAll('script').length;
    const originalHTML = document.documentElement.outerHTML;

    // 克隆并清理
    cloneAndCleanDocument(document);

    // 验证原始文档完全未被修改
    expect(document.querySelectorAll('script').length).toBe(originalScriptCount);
    expect(document.documentElement.outerHTML).toBe(originalHTML);
  });

  test('应该处理嵌套在其他元素中的 script 标签', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <div>
          <div>
            <script>nested script 1</script>
          </div>
        </div>
        <article>
          <h1>Title</h1>
          <script>nested script 2</script>
          <p>Content</p>
        </article>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const document = dom.window.document;

    expect(document.querySelectorAll('script').length).toBe(2);

    const cleanedClone = cloneAndCleanDocument(document);

    expect(cleanedClone.querySelectorAll('script').length).toBe(0);
    expect(cleanedClone.querySelector('h1').textContent).toBe('Title');
    expect(cleanedClone.querySelector('p').textContent).toBe('Content');
  });

  test('应该处理空文档', () => {
    const html = `<!DOCTYPE html><html><head></head><body></body></html>`;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const cleanedClone = cloneAndCleanDocument(document);

    expect(cleanedClone.querySelectorAll('script, style, noscript').length).toBe(0);
    expect(cleanedClone.body).toBeTruthy();
  });

  test('应该处理只有 script 标签的文档', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script>console.log("only scripts");</script>
      </head>
      <body>
        <script>console.log("more scripts");</script>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const cleanedClone = cloneAndCleanDocument(document);

    expect(cleanedClone.querySelectorAll('script').length).toBe(0);
    expect(cleanedClone.body).toBeTruthy();
  });
});
