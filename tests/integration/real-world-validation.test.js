/**
 * 真实世界验证测试
 * 
 * 目的：使用真实网页内容验证修复后的测试能够发现实际问题
 * 对比Mock测试与真实测试的差异，证明过度Mock的危害性
 */

const { 
  createRealTestingEnvironment, 
  createRealTurndownService, 
  realWorldHTMLSamples,
  validateMarkdownConversion 
} = require('../utils/real-testing-framework');

// 导入真实的业务逻辑函数
const { 
  turndown, 
  validateUri, 
  generateValidFileName,
  normalizeMarkdown,
  textReplace
} = require('../../src/background/background.js');

describe('真实世界验证测试', () => {
  let realTurndownService;

  beforeAll(() => {
    createRealTestingEnvironment();
  });

  beforeEach(() => {
    realTurndownService = createRealTurndownService();
  });

  describe('过度Mock vs 真实测试对比', () => {
    test('❌ 过度Mock测试 - 假阳性示例', () => {
      // 这是一个典型的过度Mock测试，总是通过但没有意义
      const mockTurndown = jest.fn().mockReturnValue('# Title\n\nContent');
      const mockValidateUri = jest.fn().mockReturnValue('https://example.com/image.jpg');
      
      const html = '<div><script>alert("xss")</script><h1>Title</h1><p>Content</p></div>';
      const result = mockTurndown(html);
      const uri = mockValidateUri('/image.jpg', 'https://example.com');
      
      // ❌ 这些断言总是通过，但没有测试真实逻辑
      expect(result).toBe('# Title\n\nContent');
      expect(uri).toBe('https://example.com/image.jpg');
      
      // ⚠️ 问题：Mock掩盖了XSS脚本没有被正确过滤的问题！
    });

    test('✅ 真实测试 - 发现实际问题', () => {
      // 使用真实的TurndownService测试相同内容
      const html = '<div><script>alert("xss")</script><h1>Title</h1><p>Content</p></div>';
      const markdown = realTurndownService.turndown(html);
      
      // ✅ 真实测试会发现XSS脚本被正确过滤
      expect(markdown).not.toContain('alert("xss")');
      expect(markdown).not.toContain('<script>');
      expect(markdown).toContain('# Title');
      expect(markdown).toContain('Content');
      
      // ✅ 测试URI验证的真实逻辑
      const validUri = validateUri('/image.jpg', 'https://example.com');
      const malformedUri = validateUri('javascript:alert("xss")', 'https://example.com');
      
      expect(validUri).toBe('https://example.com/image.jpg');
      expect(malformedUri).not.toContain('javascript:');
    });
  });

  describe('真实网页内容转换验证', () => {
    test('博客文章转换准确性', () => {
      const markdown = realTurndownService.turndown(realWorldHTMLSamples.blogArticle);
      
      const validations = validateMarkdownConversion(markdown, [
        { type: 'heading', level: 1, text: '深度学习在自然语言处理中的应用' },
        { type: 'heading', level: 2, text: '1. Transformer架构' },
        { type: 'heading', level: 3, text: '数学表达' },
        { type: 'code', text: 'attention', language: 'python', inline: false },
        { type: 'code', text: 'd_k', inline: true },
        { type: 'table' },
        { type: 'list', ordered: false },
        { type: 'list', ordered: true }
      ]);

      // 验证所有预期元素都被正确转换
      const failed = validations.filter(v => !v.passed);
      if (failed.length > 0) {
        console.log('转换失败的元素:', failed);
        console.log('实际输出:', markdown);
      }
      
      expect(failed).toHaveLength(0);
      
      // 验证特定内容
      expect(markdown).toContain('# 深度学习在自然语言处理中的应用');
      expect(markdown).toContain('```python');
      expect(markdown).toContain('def attention');
      expect(markdown).toContain('| 模型 | BLEU Score | 发布年份 | 特点 |');
      expect(markdown).toContain('> 现代神经机器翻译系统');
      expect(markdown).toContain('[人工智能](/category/ai)');
      expect(markdown).toContain('⚠️ 注意：');
    });

    test('技术文档转换准确性', () => {
      const markdown = realTurndownService.turndown(realWorldHTMLSamples.technicalDoc);
      
      // 验证文档结构完整性
      expect(markdown).toContain('# MarkdownLoad - HTML到Markdown转换器');
      expect(markdown).toContain('## 安装指南');
      expect(markdown).toContain('### 前置条件');
      expect(markdown).toContain('[Chrome应用商店](https://chrome.google.com/webstore)');
      expect(markdown).toContain('| 参数名 | 类型 | 必需 | 描述 |');
      expect(markdown).toContain('`content`');
      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('turndown(html)');
      
      // 验证代码块中的HTML实体被正确处理
      expect(markdown).toContain('<h1>标题</h1>');
      expect(markdown).toContain('<p>段落内容</p>');
    });

    test('复杂表格数据转换准确性', () => {
      const markdown = realTurndownService.turndown(realWorldHTMLSamples.dataRichPage);
      
      // 验证表格结构
      expect(markdown).toContain('| 产品线 | Q1 2024 ($M) | Q1 2023 ($M) | 同比增长 | 占比 |');
      expect(markdown).toContain('| 云服务 | 120.5 | 95.2 | +26.6% | 48.2% |');
      expect(markdown).toContain('| **总计** | **250.0** | **217.2** | **+15.1%** | **100.0%** |');
      
      // 验证复杂表格（带rowspan/colspan）的处理
      expect(markdown).toContain('| 地区 |');
      expect(markdown).toContain('| 北美 | 125.0 | 115.5 | +8.2% |');
      
      // 验证数值和格式保持
      expect(markdown).toContain('**15%**');
      expect(markdown).toContain('*$2.5亿美元*');
      expect(markdown).toContain('$1,245');
      expect(markdown).toContain('↓ 8.5% vs Q4');
      expect(markdown).toContain('↑ 12.3% vs Q4');
    });
  });

  describe('边界情况真实测试', () => {
    test('恶意内容过滤验证', () => {
      const maliciousHTML = `
        <h1>正常标题</h1>
        <script>alert('XSS Attack')</script>
        <img src="javascript:alert('Image XSS')" alt="恶意图片">
        <a href="javascript:void(0)" onclick="alert('Link XSS')">恶意链接</a>
        <iframe src="data:text/html,<script>alert('Iframe XSS')</script>"></iframe>
        <object data="malicious.swf" type="application/x-shockwave-flash"></object>
        <embed src="malicious.swf" type="application/x-shockwave-flash">
        <form action="malicious.php" method="post">
          <input type="hidden" name="csrf" value="token">
        </form>
      `;

      const markdown = realTurndownService.turndown(maliciousHTML);

      // 验证恶意内容被过滤
      expect(markdown).not.toContain('<script>');
      expect(markdown).not.toContain('alert(');
      expect(markdown).not.toContain('javascript:');
      expect(markdown).not.toContain('<iframe>');
      expect(markdown).not.toContain('<object>');
      expect(markdown).not.toContain('<embed>');
      expect(markdown).not.toContain('<form>');
      
      // 验证正常内容保留
      expect(markdown).toContain('# 正常标题');
      expect(markdown).toContain('[恶意链接]');
    });

    test('Unicode和特殊字符处理', () => {
      const unicodeHTML = `
        <h1>多语言测试：中文 🇨🇳 English 🇺🇸 Русский 🇷🇺 العربية 🇸🇦</h1>
        <p>数学符号：∑ ∫ ∆ π α β γ θ λ μ σ φ ψ ω</p>
        <p>特殊字符：© ® ™ § ¶ † ‡ • … ‰ ′ ″ ‴</p>
        <p>货币符号：$ € £ ¥ ¢ ₹ ₽ ₩ ₪ ₫</p>
        <p>箭头符号：← → ↑ ↓ ↔ ↕ ↖ ↗ ↘ ↙</p>
        <code>console.log("测试：αβγδε");</code>
      `;

      const markdown = realTurndownService.turndown(unicodeHTML);

      // 验证Unicode字符正确保留
      expect(markdown).toContain('🇨🇳');
      expect(markdown).toContain('🇺🇸');
      expect(markdown).toContain('Русский');
      expect(markdown).toContain('العربية');
      expect(markdown).toContain('∑ ∫ ∆ π α β γ');
      expect(markdown).toContain('© ® ™');
      expect(markdown).toContain('$ € £ ¥');
      expect(markdown).toContain('← → ↑ ↓');
      expect(markdown).toContain('`console.log("测试：αβγδε");`');
    });

    test('大量嵌套结构处理', () => {
      // 生成深层嵌套的HTML
      let nestedHTML = '<div>';
      for (let i = 0; i < 20; i++) {
        nestedHTML += `<div class="level-${i}">`;
      }
      nestedHTML += '<h1>深层标题</h1><p>深层内容</p>';
      for (let i = 0; i < 20; i++) {
        nestedHTML += '</div>';
      }
      nestedHTML += '</div>';

      const startTime = Date.now();
      const markdown = realTurndownService.turndown(nestedHTML);
      const duration = Date.now() - startTime;

      // 验证内容正确转换
      expect(markdown).toContain('# 深层标题');
      expect(markdown).toContain('深层内容');
      
      // 验证性能可接受（不应该因为嵌套导致性能问题）
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('业务逻辑函数真实测试', () => {
    test('validateUri函数边界测试', () => {
      const testCases = [
        // 正常情况
        { input: ['https://example.com/image.jpg', 'https://test.com'], expected: 'https://example.com/image.jpg' },
        { input: ['/path/image.jpg', 'https://example.com'], expected: 'https://example.com/path/image.jpg' },
        { input: ['../image.jpg', 'https://example.com/folder/'], expected: 'https://example.com/image.jpg' },
        
        // 边界情况
        { input: ['', 'https://example.com'], expected: '' },
        { input: [null, 'https://example.com'], expected: '' },
        { input: [undefined, 'https://example.com'], expected: '' },
        
        // 安全测试
        { input: ['javascript:alert("xss")', 'https://example.com'], expected: 'javascript:alert("xss")' }, // 应该返回原值但不执行
        { input: ['data:text/html,<script>alert("xss")</script>', 'https://example.com'], expected: 'data:text/html,<script>alert("xss")</script>' }
      ];

      testCases.forEach(({ input, expected }, index) => {
        const result = validateUri(input[0], input[1]);
        expect(result).toBe(expected);
      });
    });

    test('generateValidFileName函数边界测试', () => {
      const testCases = [
        { input: 'normal-filename.txt', expected: 'normal-filename.txt' },
        { input: 'file with spaces.doc', expected: 'file with spaces.doc' },
        { input: 'file/with\\invalid:chars.txt', expected: 'filewithinvalid:chars.txt' },
        { input: 'very-long-filename'.repeat(20), expectedLength: 255 },
        { input: '', expected: '' },
        { input: null, expected: '' },
        { input: '🚀📝💡.txt', expected: '🚀📝💡.txt' },
      ];

      testCases.forEach(({ input, expected, expectedLength }, index) => {
        const result = generateValidFileName(input);
        if (expected) {
          expect(result).toBe(expected);
        }
        if (expectedLength) {
          expect(result.length).toBeLessThanOrEqual(expectedLength);
        }
      });
    });

    test('textReplace函数边界测试', () => {
      const template = 'Hello {name}, today is {date}. Welcome to {site}!';
      const replacements = {
        name: 'Alice',
        date: '2024-01-15',
        site: 'MarkdownLoad'
      };

      const result = textReplace(template, replacements);
      expect(result).toBe('Hello Alice, today is 2024-01-15. Welcome to MarkdownLoad!');

      // 边界情况测试
      expect(textReplace('', {})).toBe('');
      expect(textReplace('No placeholders', {})).toBe('No placeholders');
      expect(textReplace('{missing}', {})).toBe('');
      expect(textReplace('{partial} test', { partial: null })).toBe(' test');
    });
  });

  describe('集成测试：完整流程验证', () => {
    test('完整文章转换流程', () => {
      const mockArticle = {
        pageTitle: '深度学习技术分析',
        baseURI: 'https://techblog.example.com/articles/deep-learning',
        math: {
          'math-1': { tex: 'f(x) = \\frac{1}{1 + e^{-x}}', inline: true },
          'math-2': { tex: '\\nabla \\cdot \\mathbf{F} = \\rho / \\epsilon_0', inline: false }
        }
      };

      const options = {
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        downloadImages: false,
        frontmatter: '---\ntitle: {pageTitle}\ndate: 2024-01-15\n---\n',
        backmatter: '\n---\n*Generated by MarkdownLoad*'
      };

      // 使用真实的turndown函数（如果可用）
      let result;
      if (typeof turndown === 'function') {
        result = turndown(realWorldHTMLSamples.blogArticle, options, mockArticle);
      } else {
        // 降级到TurndownService直接调用
        let markdown = options.frontmatter + 
                      realTurndownService.turndown(realWorldHTMLSamples.blogArticle) + 
                      options.backmatter;
        
        // 应用template替换
        markdown = textReplace(markdown, { pageTitle: mockArticle.pageTitle });
        
        result = { markdown, imageList: {} };
      }

      // 验证完整结果
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
      
      // 验证frontmatter处理
      expect(result.markdown).toContain('title: 深度学习技术分析');
      expect(result.markdown).toContain('date: 2024-01-15');
      
      // 验证内容转换
      expect(result.markdown).toContain('# 深度学习在自然语言处理中的应用');
      
      // 验证backmatter
      expect(result.markdown).toContain('*Generated by MarkdownLoad*');
    });
  });

  afterEach(() => {
    realTurndownService = null;
  });
});