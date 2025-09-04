/**
 * Bug修复综合集成测试
 * 测试textReplace、generateValidFileName、downloadMarkdown等函数的集成工作
 */

const path = require('path');

// 设置测试环境
global.jest = true;

// Mock浏览器API
const mockBrowser = {
    tabs: {
        get: jest.fn()
    },
    downloads: {
        download: jest.fn()
    }
};

global.browser = mockBrowser;
global.URL = {
    createObjectURL: jest.fn(() => 'mock-blob-url')
};
global.Blob = jest.fn();
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Mock getOptions
global.getOptions = jest.fn(() => Promise.resolve({
    title: '{pageTitle}',
    disallowedChars: '#[]{}',
    downloadMode: 'downloadsApi',
    saveAs: false
}));

// 导入被测试的函数
require(path.join(process.cwd(), 'src/background/background.js'));

describe('Bug修复综合集成测试', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockBrowser.downloads.download.mockResolvedValue(1);
        mockBrowser.tabs.get.mockResolvedValue({
            title: 'Default Tab Title'
        });
    });

    describe('完整工作流程测试', () => {
        test('从文章到文件名的完整处理流程', async () => {
            const article = {
                pageTitle: 'JavaScript教程: 从入门到精通[2024版]',
                title: 'JS Tutorial',
                author: 'Test Author',
                baseURI: 'https://example.com/article'
            };

            // 1. 测试模板替换
            const titleTemplate = '{pageTitle} - {author}';
            const replacedTitle = textReplace(titleTemplate, article);
            expect(replacedTitle).toBe('JavaScript教程: 从入门到精通[2024版] - Test Author');

            // 2. 测试文件名清理
            const cleanFileName = generateValidFileName(replacedTitle, { disallowedChars: '[]' });
            expect(cleanFileName).toBe('JavaScript教程: 从入门到精通2024版 - Test Author');

            // 3. 测试完整下载流程
            await downloadMarkdown('# Test Markdown', cleanFileName, 123);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: 'JavaScript教程 从入门到精通2024版 - Test Author.md',
                saveAs: false
            });
        });

        test('formatTitle函数的集成测试', async () => {
            const article = {
                pageTitle: 'React vs Vue: 深度对比分析{2024}',
                author: 'Tech Writer'
            };

            // Mock getOptions返回包含禁止字符的配置
            getOptions.mockResolvedValueOnce({
                title: '{pageTitle}',
                disallowedChars: '{}:',
                downloadMode: 'downloadsApi'
            });

            const formattedTitle = await formatTitle(article);
            
            // 应该移除禁止字符{}:，但保留其他内容
            expect(formattedTitle).toBe('React vs Vue 深度对比分析2024');
        });
    });

    describe('边界情况集成测试', () => {
        test('空标题的完整处理链', async () => {
            const article = {
                // 没有pageTitle或title
                author: 'Test Author'
            };

            // 1. 模板替换应使用兜底逻辑
            const replacedTitle = textReplace('{pageTitle}', article);
            expect(replacedTitle).toBe('download');

            // 2. 下载时应从tab获取标题
            mockBrowser.tabs.get.mockResolvedValue({
                title: 'Actual Page Title'
            });

            await downloadMarkdown('# Test', '', 123);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: 'Actual Page Title.md',
                saveAs: false
            });
        });

        test('恶意内容的安全过滤集成', async () => {
            const maliciousArticle = {
                pageTitle: '<script>alert("xss")</script>安全测试',
                author: 'javascript:void(0)',
                excerpt: 'onclick="evil()" 正常内容'
            };

            // 1. 测试安全过滤
            const safeTitle = textReplace('{pageTitle}', maliciousArticle);
            expect(safeTitle).toBe('安全测试');
            expect(safeTitle).not.toContain('<script>');
            expect(safeTitle).not.toContain('alert');

            // 2. 测试作者字段过滤
            const safeAuthor = textReplace('{author}', maliciousArticle);
            expect(safeAuthor).toBe('');
            expect(safeAuthor).not.toContain('javascript:');

            // 3. 完整下载流程
            await downloadMarkdown('# Content', safeTitle, 123);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: '安全测试.md',
                saveAs: false
            });
        });

        test('复杂模板的集成处理', async () => {
            const article = {
                pageTitle: 'AI技术分析#{2024}版本',
                author: 'AI研究员',
                baseURI: 'https://tech.example.com/ai-analysis',
                keywords: 'AI,机器学习,深度学习'
            };

            // 测试复杂模板
            const complexTemplate = '{pageTitle} - {author} - {domain} - {keywords}';
            const result = textReplace(complexTemplate, article);
            
            expect(result).toBe('AI技术分析#{2024}版本 - AI研究员 - tech.example.com - AI,机器学习,深度学习');

            // 清理后用于文件名
            const cleanResult = generateValidFileName(result, { disallowedChars: '#{}' });
            expect(cleanResult).toBe('AI技术分析2024版本 - AI研究员 - tech.example.com - AI,机器学习,深度学习');
        });
    });

    describe('错误恢复集成测试', () => {
        test('Tab获取失败时的恢复流程', async () => {
            mockBrowser.tabs.get.mockRejectedValue(new Error('Tab not accessible'));

            // 空标题应触发tab获取，失败后使用默认值
            await downloadMarkdown('# Content', '', 123);

            expect(console.warn).toHaveBeenCalledWith(
                '无法获取tab信息，使用默认标题:',
                expect.any(Error)
            );

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: 'download.md',
                saveAs: false
            });
        });

        test('下载API失败时的错误处理', async () => {
            mockBrowser.downloads.download.mockRejectedValue(new Error('Download failed'));

            // 应该不抛出错误，内部处理
            await expect(
                downloadMarkdown('# Content', 'Test Title', 123)
            ).resolves.toBeUndefined();

            expect(mockBrowser.downloads.download).toHaveBeenCalled();
        });

        test('无效模板的恢复处理', async () => {
            const article = {
                pageTitle: '正常标题',
                title: '备用标题'
            };

            // 测试各种无效模板
            expect(textReplace(null, article)).toBe('正常标题');
            expect(textReplace(undefined, article)).toBe('正常标题');
            expect(textReplace('', article)).toBe('正常标题');
            expect(textReplace(123, article)).toBe('正常标题');
            expect(textReplace({}, article)).toBe('正常标题');

            // 无效占位符应使用兜底逻辑
            expect(textReplace('{nonExistent}', article)).toBe('正常标题');
        });
    });

    describe('真实场景模拟测试', () => {
        test('博客文章下载场景', async () => {
            const blogArticle = {
                pageTitle: 'Vue 3.0 新特性详解: Composition API 完全指南',
                author: '前端开发者',
                baseURI: 'https://blog.example.com/vue3-guide',
                date: '2024-01-15'
            };

            getOptions.mockResolvedValueOnce({
                title: '{pageTitle}',
                disallowedChars: ':',
                downloadMode: 'downloadsApi',
                saveAs: false
            });

            const formattedTitle = await formatTitle(blogArticle);
            expect(formattedTitle).toBe('Vue 3.0 新特性详解 Composition API 完全指南');

            await downloadMarkdown('# Vue 3.0 Guide\n\nContent here...', formattedTitle, 456);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: 'Vue 3.0 新特性详解 Composition API 完全指南.md',
                saveAs: false
            });
        });

        test('技术文档下载场景', async () => {
            const techDoc = {
                pageTitle: 'API Reference: GraphQL Schema Design Best Practices',
                author: 'API Team',
                baseURI: 'https://docs.company.com/api/graphql'
            };

            const cleanTitle = textReplace('{pageTitle}', techDoc);
            const fileName = generateValidFileName(cleanTitle);

            await downloadMarkdown('# API Documentation\n\n## GraphQL Best Practices', fileName, 789);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: 'API Reference: GraphQL Schema Design Best Practices.md',
                saveAs: false
            });
        });

        test('新闻文章下载场景', async () => {
            const newsArticle = {
                pageTitle: '科技新闻: OpenAI发布GPT-4.5，性能提升50%',
                author: '科技记者',
                baseURI: 'https://news.example.com/openai-gpt45',
                keywords: 'OpenAI,GPT-4.5,AI,人工智能'
            };

            const template = '{pageTitle} - {date:YYYY-MM-DD}';
            const titleWithDate = textReplace(template, newsArticle);
            
            // 应该包含日期
            expect(titleWithDate).toMatch(/科技新闻: OpenAI发布GPT-4\.5，性能提升50% - \d{4}-\d{2}-\d{2}/);

            const cleanTitle = generateValidFileName(titleWithDate);
            await downloadMarkdown('# 科技新闻内容', cleanTitle, 101112);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith(
                expect.objectContaining({
                    filename: expect.stringMatching(/^科技新闻: OpenAI发布GPT-4\.5，性能提升50% - \d{4}-\d{2}-\d{2}\.md$/)
                })
            );
        });
    });

    describe('性能和稳定性测试', () => {
        test('大量文章批量处理', async () => {
            const articles = Array.from({ length: 100 }, (_, i) => ({
                pageTitle: `测试文章 ${i + 1}: 性能测试专用标题`,
                author: '测试作者'
            }));

            const results = articles.map(article => {
                const title = textReplace('{pageTitle}', article);
                return generateValidFileName(title);
            });

            expect(results).toHaveLength(100);
            results.forEach((result, i) => {
                expect(result).toBe(`测试文章 ${i + 1}: 性能测试专用标题`);
            });
        });

        test('极端输入的稳定性测试', async () => {
            const extremeInputs = [
                '',
                ' '.repeat(1000),
                '!@#$%^&*()_+-=[]{}|;:,.<>?',
                '🚀📄💻🎯✨',
                'A'.repeat(10000),
                null,
                undefined,
                123,
                {},
                []
            ];

            extremeInputs.forEach(input => {
                expect(() => {
                    const result = textReplace('{pageTitle}', { pageTitle: input });
                    generateValidFileName(result);
                }).not.toThrow();
            });
        });
    });
});

describe('调试和日志集成测试', () => {
    test('应输出完整的调试日志链', async () => {
        const article = {
            pageTitle: '测试标题',
            author: '测试作者'
        };

        // 清除之前的日志
        jest.clearAllMocks();

        // 执行完整流程
        const title = textReplace('{pageTitle}', article);
        const cleanTitle = generateValidFileName(title);
        await downloadMarkdown('# Content', cleanTitle, 123);

        // 验证调试日志
        expect(console.log).toHaveBeenCalledWith('📝 textReplace 调用参数:');
        expect(console.log).toHaveBeenCalledWith('🔍 downloadMarkdown 调用参数:');
    });
});