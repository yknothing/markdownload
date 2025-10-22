/**
 * 单元测试 - 代码块语言识别 (className 和 id 格式)
 * 测试 convertToFencedCodeBlock 函数的语言检测逻辑
 */

describe('代码块语言识别单元测试', () => {
  // Mock helpers
  function repeat(character, count) {
    return Array(count + 1).join(character);
  }

  // 测试用的 convertToFencedCodeBlock 实现（从 background.js 复制）
  function convertToFencedCodeBlock(node, options) {
    // Simplified version for testing
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

    const code = node.innerText || node.textContent || '';
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

  // Create mock DOM node
  function createCodeNode(attributes, content) {
    const mockNode = {
      innerHTML: content,
      innerText: content,
      textContent: content,
      getAttribute: jest.fn((name) => attributes[name] || null),
      className: attributes.class || '',
      id: attributes.id || ''
    };
    return mockNode;
  }

  const defaultOptions = {
    fence: '```',
    codeBlockStyle: 'fenced'
  };

  describe('className 格式支持', () => {
    test('应该识别 language- 前缀', () => {
      const node = createCodeNode(
        { class: 'language-javascript' },
        'console.log("Hello");'
      );

      const result = convertToFencedCodeBlock(node, defaultOptions);

      expect(result).toContain('```javascript');
      expect(result).toContain('console.log("Hello");');
    });

    test('应该识别 lang- 前缀', () => {
      const node = createCodeNode(
        { class: 'lang-python' },
        'print("Hello")'
      );

      const result = convertToFencedCodeBlock(node, defaultOptions);

      expect(result).toContain('```python');
      expect(result).toContain('print("Hello")');
    });

    test('应该处理包含多个类名的情况', () => {
      const node = createCodeNode(
        { class: 'hljs language-typescript line-numbers' },
        'const x: number = 1;'
      );

      const result = convertToFencedCodeBlock(node, defaultOptions);

      expect(result).toContain('```typescript');
    });
  });

  describe('id 格式支持', () => {
    test('应该识别 code-lang- 前缀', () => {
      const node = createCodeNode(
        { id: 'code-lang-javascript' },
        'const a = 1;'
      );

      const result = convertToFencedCodeBlock(node, defaultOptions);

      expect(result).toContain('```javascript');
    });

    test('应该处理多种语言', () => {
      const languages = ['typescript', 'go', 'rust', 'java', 'python'];

      languages.forEach(lang => {
        const node = createCodeNode(
          { id: `code-lang-${lang}` },
          'code here'
        );

        const result = convertToFencedCodeBlock(node, defaultOptions);
        expect(result).toContain('```' + lang);
      });
    });
  });

  describe('优先级测试', () => {
    test('className 应该优先于 id', () => {
      const node = createCodeNode(
        {
          class: 'language-javascript',
          id: 'code-lang-python'
        },
        'code here'
      );

      const result = convertToFencedCodeBlock(node, defaultOptions);

      expect(result).toContain('```javascript');
      expect(result).not.toContain('```python');
    });

    test('language- 前缀应该优先于 lang- 前缀', () => {
      const node = createCodeNode(
        { class: 'language-javascript lang-python' },
        'code here'
      );

      const result = convertToFencedCodeBlock(node, defaultOptions);

      expect(result).toContain('```javascript');
    });
  });

  describe('边界情况', () => {
    test('没有语言信息时应该生成空语言标识', () => {
      const node = createCodeNode({}, 'code here');

      const result = convertToFencedCodeBlock(node, defaultOptions);

      expect(result).toMatch(/```\ncode here/);
    });

    test('应该处理空代码内容', () => {
      const node = createCodeNode(
        { class: 'language-javascript' },
        ''
      );

      const result = convertToFencedCodeBlock(node, defaultOptions);

      expect(result).toContain('```javascript');
    });

    test('应该处理包含反引号的代码', () => {
      const node = createCodeNode(
        { class: 'language-javascript' },
        '```\ncode\n```'
      );

      const result = convertToFencedCodeBlock(node, defaultOptions);

      // Should use 4 backticks because code contains 3
      expect(result).toContain('````javascript');
      expect(result).toContain('````');
    });
  });
});
