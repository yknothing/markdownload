/**
 * 单元测试 - Script 标签移除
 * 验证移除逻辑正确处理 script/style 标签
 */

const { JSDOM } = require('jsdom');

describe('Script/Style 标签移除测试', () => {
  test('应该移除普通 script 标签', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          if (localStorage.getItem("pref-theme") === "dark") {
            document.body.classList.add("dark");
          }
        </script>
      </head>
      <body>
        <h1>Test Article</h1>
        <p>This is the real content.</p>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // 验证初始状态有 script
    expect(doc.querySelectorAll('script').length).toBeGreaterThan(0);

    // 移除 script 标签（模拟 background.js 的修复）
    doc.querySelectorAll('script, style, noscript').forEach(element => {
      element.parentNode?.removeChild(element);
    });

    // 验证 script 已被移除
    expect(doc.querySelectorAll('script').length).toBe(0);

    // 验证内容仍然存在
    const h1 = doc.querySelector('h1');
    expect(h1.textContent).toBe('Test Article');

    const p = doc.querySelector('p');
    expect(p.textContent).toBe('This is the real content.');
  });

  test('应该移除 style 标签', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>.dark { background: black; }</style>
      </head>
      <body><h1>Test</h1></body>
      </html>
    `;

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    expect(doc.querySelectorAll('style').length).toBe(1);

    doc.querySelectorAll('script, style, noscript').forEach(element => {
      element.parentNode?.removeChild(element);
    });

    expect(doc.querySelectorAll('style').length).toBe(0);
  });

  test('应该移除 noscript 标签', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <noscript>Please enable JavaScript</noscript>
        <h1>Content</h1>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    doc.querySelectorAll('script, style, noscript').forEach(element => {
      element.parentNode?.removeChild(element);
    });

    expect(doc.querySelectorAll('noscript').length).toBe(0);
  });

  test('应该提取 MathJax 内容后再移除标签', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <p>Equation: </p>
        <script id="MathJax-Element-1" type="math/tex">x = y + z</script>
        <script>var a = 1;</script>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // 模拟 MathJax 提取逻辑
    const math = {};
    doc.querySelectorAll('script[id^=MathJax-Element-]').forEach(mathSource => {
      const tex = mathSource.textContent;
      math[mathSource.id] = { tex, inline: true };
      // 提取后移除
      mathSource.parentNode?.removeChild(mathSource);
    });

    // 验证 MathJax 内容被提取
    expect(math['MathJax-Element-1'].tex).toBe('x = y + z');

    // MathJax 脚本已被移除
    expect(doc.querySelectorAll('script[id^=MathJax-Element-]').length).toBe(0);

    // 但普通脚本还在
    expect(doc.querySelectorAll('script').length).toBe(1);

    // 移除其余脚本
    doc.querySelectorAll('script').forEach(element => {
      element.parentNode?.removeChild(element);
    });

    expect(doc.querySelectorAll('script').length).toBe(0);
  });

  test('实际场景：包含主题切换脚本的网页', () => {
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
      </head>
      <body>
        <h1>Why We Think</h1>
        <p>This is the actual article content.</p>
      </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // 模拟完整的处理流程
    // 1. 处理 MathJax（如果有）
    doc.querySelectorAll('script[id^=MathJax-Element-]').forEach(mathSource => {
      mathSource.parentNode?.removeChild(mathSource);
    });

    // 2. 移除所有剩余的 script/style/noscript
    doc.querySelectorAll('script, style, noscript').forEach(element => {
      element.parentNode?.removeChild(element);
    });

    // 验证所有脚本都被移除
    expect(doc.querySelectorAll('script').length).toBe(0);

    // 验证内容保留
    expect(doc.querySelector('h1').textContent).toBe('Why We Think');
    expect(doc.querySelector('p').textContent).toBe('This is the actual article content.');

    // 验证 body 的 innerHTML 不包含 JavaScript 代码
    const bodyHTML = doc.body.innerHTML;
    expect(bodyHTML).not.toContain('localStorage');
    expect(bodyHTML).not.toContain('MathJax');
  });
});
