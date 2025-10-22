/**
 * 集成测试 - 代码块语言检测
 * 验证在实际转换场景中，代码块语言识别功能正常工作
 */

describe('代码块语言检测集成测试', () => {
  let turndownService;

  beforeEach(() => {
    // 初始化真实的 TurndownService
    if (typeof TurndownService === 'undefined') {
      global.TurndownService = require('../../../src/background/turndown.js');
    }

    if (typeof turndownPluginGfm === 'undefined') {
      global.turndownPluginGfm = require('../../../src/background/turndown-plugin-gfm.js');
    }

    const options = {
      headingStyle: 'atx',
      hr: '___',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '_',
      strongDelimiter: '**',
      turndownEscape: false
    };

    TurndownService.prototype.defaultEscape = TurndownService.prototype.escape;
    TurndownService.prototype.escape = s => s;

    turndownService = new TurndownService(options);

    // Helper function
    function repeat(character, count) {
      return Array(count + 1).join(character);
    }

    // 实现 convertToFencedCodeBlock（和 turndown-manager.js 保持一致）
    function convertToFencedCodeBlock(node, options) {
      node.innerHTML = node.innerHTML.replace(/<br-keep><\/br-keep>/g, '<br>');

      // Extract language from className (standard format) or id (fallback format)
      let language = '';

      // Get className as string (handle both string and object representations)
      const classNameStr = node.getAttribute('class') || node.className || '';

      // Try className first (standard: class="language-javascript" or class="lang-javascript")
      const classLangMatch = classNameStr.match(/language-([^\s]+)/) || classNameStr.match(/lang-([^\s]+)/);
      if (classLangMatch?.length > 0) {
        language = classLangMatch[1];
      } else {
        // Fallback to id attribute (format: id="code-lang-javascript")
        const idStr = node.getAttribute('id') || node.id || '';
        const idLangMatch = idStr.match(/code-lang-(.+)/);
        if (idLangMatch?.length > 0) {
          language = idLangMatch[1];
        }
      }

      const code = node.innerText || node.textContent || "";
      const fenceChar = options.fence.charAt(0);
      let fenceSize = 3;

      // Ensure fence is long enough
      const fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm');
      let match;
      while ((match = fenceInCodeRegex.exec(code))) {
        if (match[0].length >= fenceSize) {
          fenceSize = match[0].length + 1;
        }
      }

      const fence = repeat(fenceChar, fenceSize);
      return '\n\n' + fence + language + '\n' + code.replace(/\n$/, '') + '\n' + fence + '\n\n';
    }

    // Add GFM plugin first
    turndownService.use(turndownPluginGfm.gfm);

    // Check rule structure
    console.log('Rules object:', typeof turndownService.rules);
    console.log('Rules keys:', Object.keys(turndownService.rules || {}));

    // Then override the fencedCodeBlock rule with our custom implementation
    // Using the same rule name 'fencedCodeBlock' will replace the built-in rule
    turndownService.addRule('fencedCodeBlock', {
      filter: function (node, options) {
        const match = (
          options.codeBlockStyle === 'fenced' &&
          node.nodeName === 'PRE' &&
          node.firstChild &&
          node.firstChild.nodeName === 'CODE'
        );
        console.log('fencedCodeBlock filter:', node.nodeName, match);
        return match;
      },
      replacement: function (content, node, options) {
        console.log('fencedCodeBlock replacement called!');
        return convertToFencedCodeBlock(node.firstChild, options);
      }
    });

    // Override the pre rule as well
    turndownService.addRule('pre', {
      filter: (node, tdopts) => {
        return node.nodeName === 'PRE'
               && (!node.firstChild || node.firstChild.nodeName !== 'CODE')
               && !node.querySelector('img');
      },
      replacement: (content, node, tdopts) => {
        return convertToFencedCodeBlock(node, tdopts);
      }
    });
  });

  describe('标准 className 格式', () => {
    test('应该正确识别 language- 前缀', () => {
      const html = '<pre><code class="language-javascript">console.log("Hello");</code></pre>';
      const markdown = turndownService.turndown(html);

      console.log('Generated markdown:', JSON.stringify(markdown));
      console.log('Markdown length:', markdown.length);

      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('console.log("Hello");');
    });

    test('应该正确识别 lang- 前缀', () => {
      const html = '<pre><code class="lang-python">print("Hello")</code></pre>';
      const markdown = turndownService.turndown(html);

      expect(markdown).toContain('```python');
      expect(markdown).toContain('print("Hello")');
    });

    test('应该正确处理多个代码块', () => {
      const html = `
        <h2>示例</h2>
        <pre><code class="language-javascript">const x = 1;</code></pre>
        <p>说明文字</p>
        <pre><code class="language-python">x = 1</code></pre>
      `;
      const markdown = turndownService.turndown(html);

      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('const x = 1;');
      expect(markdown).toContain('```python');
      expect(markdown).toContain('x = 1');
    });
  });

  describe('ID 格式 (code-lang-xxx)', () => {
    test('应该正确识别 id="code-lang-xxx" 格式', () => {
      const html = '<pre><code id="code-lang-javascript">console.log("Hello");</code></pre>';
      const markdown = turndownService.turndown(html);

      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('console.log("Hello");');
    });

    test('应该处理多种语言的 id 格式', () => {
      const testCases = [
        { lang: 'typescript', code: 'const x: number = 1;' },
        { lang: 'go', code: 'func main() {}' },
        { lang: 'rust', code: 'fn main() {}' },
        { lang: 'java', code: 'public class Test {}' }
      ];

      testCases.forEach(({ lang, code }) => {
        const html = `<pre><code id="code-lang-${lang}">${code}</code></pre>`;
        const markdown = turndownService.turndown(html);

        expect(markdown).toContain('```' + lang);
        expect(markdown).toContain(code);
      });
    });
  });

  describe('混合格式', () => {
    test('应该优先使用 className 而非 id', () => {
      const html = '<pre><code class="language-javascript" id="code-lang-python">console.log("Hello");</code></pre>';
      const markdown = turndownService.turndown(html);

      expect(markdown).toContain('```javascript');
      expect(markdown).not.toContain('```python');
    });

    test('应该在同一文档中正确处理混合格式', () => {
      const html = `
        <h2>标准格式</h2>
        <pre><code class="language-javascript">const a = 1;</code></pre>
        <h2>ID 格式</h2>
        <pre><code id="code-lang-python">b = 2</code></pre>
      `;
      const markdown = turndownService.turndown(html);

      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('const a = 1;');
      expect(markdown).toContain('```python');
      expect(markdown).toContain('b = 2');
    });
  });

  describe('边界情况', () => {
    test('应该处理没有语言信息的代码块', () => {
      const html = '<pre><code>generic code</code></pre>';
      const markdown = turndownService.turndown(html);

      expect(markdown).toContain('```');
      expect(markdown).toContain('generic code');
    });

    test('应该处理空代码块', () => {
      const html = '<pre><code class="language-javascript"></code></pre>';
      const markdown = turndownService.turndown(html);

      expect(markdown).toContain('```javascript');
    });

    test('应该处理包含特殊字符的代码', () => {
      const html = '<pre><code class="language-javascript">if (x > 5 && y < 10) {}</code></pre>';
      const markdown = turndownService.turndown(html);

      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('if (x > 5 && y < 10) {}');
    });
  });

  describe('真实场景测试', () => {
    test('应该正确处理技术博客文章中的代码块', () => {
      const html = `
        <article>
          <h1>React 性能优化指南</h1>
          <h2>1. 使用 React.memo</h2>
          <p>避免不必要的重新渲染：</p>
          <pre><code class="language-jsx">
const MemoizedComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});
          </code></pre>

          <h2>2. 代码分割</h2>
          <p>使用动态导入：</p>
          <pre><code id="code-lang-javascript">
const LazyComponent = React.lazy(() => import('./LazyComponent'));
          </code></pre>
        </article>
      `;

      const markdown = turndownService.turndown(html);

      // 验证标题
      expect(markdown).toContain('# React 性能优化指南');
      expect(markdown).toContain('## 1. 使用 React.memo');
      expect(markdown).toContain('## 2. 代码分割');

      // 验证代码块语言识别
      expect(markdown).toContain('```jsx');
      expect(markdown).toContain('React.memo');
      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('React.lazy');
    });
  });
});
