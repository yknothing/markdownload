/**
 * downloadMarkdown 函数 Bug 修复测试
 * 测试标题兜底逻辑和文件名安全清理功能
 */

const path = require('path');

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

// 设置测试环境
global.jest = true;
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Mock getOptions
global.getOptions = jest.fn(() => Promise.resolve({
    downloadMode: 'downloadsApi',
    saveAs: false
}));

// 导入被测试的函数
require(path.join(process.cwd(), 'src/background/background.js'));

describe('downloadMarkdown函数 - Bug修复测试', () => {
    beforeEach(() => {
        // 重置所有mocks
        jest.clearAllMocks();
        mockBrowser.downloads.download.mockResolvedValue(1);
        mockBrowser.tabs.get.mockResolvedValue({
            title: 'Tab标题'
        });
    });

    describe('标题兜底逻辑测试', () => {
        test('空标题时应从tab获取标题', async () => {
            const tabId = 123;
            mockBrowser.tabs.get.mockResolvedValue({
                title: '从Tab获取的标题'
            });

            await downloadMarkdown('markdown内容', '', tabId);

            // 验证尝试从tab获取标题
            expect(mockBrowser.tabs.get).toHaveBeenCalledWith(tabId);
        });

        test('null标题时应使用兜底逻辑', async () => {
            const tabId = 123;
            mockBrowser.tabs.get.mockResolvedValue({
                title: 'Tab标题'
            });

            await downloadMarkdown('markdown内容', null, tabId);

            // 验证尝试从tab获取标题
            expect(mockBrowser.tabs.get).toHaveBeenCalledWith(tabId);
        });

        test('undefined标题时应使用兜底逻辑', async () => {
            const tabId = 123;
            mockBrowser.tabs.get.mockResolvedValue({
                title: 'Tab标题'
            });

            await downloadMarkdown('markdown内容', undefined, tabId);

            // 应该尝试从tab获取标题
            expect(mockBrowser.tabs.get).toHaveBeenCalledWith(tabId);
        });

        test('空白字符串标题时应使用兜底逻辑', async () => {
            const tabId = 123;
            
            await downloadMarkdown('markdown内容', '   ', tabId);

            // 空白字符串也应该触发tab获取
            expect(mockBrowser.tabs.get).toHaveBeenCalledWith(tabId);
        });

        test('无tabId时应使用默认标题', async () => {
            await downloadMarkdown('markdown内容', '', null);

            // 无tabId时不应尝试获取tab信息
            expect(mockBrowser.tabs.get).not.toHaveBeenCalled();
        });

        test('tab获取失败时应使用默认标题', async () => {
            const tabId = 123;
            mockBrowser.tabs.get.mockRejectedValue(new Error('Tab not found'));

            await downloadMarkdown('markdown内容', '', tabId);

            expect(console.warn).toHaveBeenCalledWith('无法获取tab信息，使用默认标题:', expect.any(Error));
        });

        test('有效标题时不应触发兜底逻辑', async () => {
            await downloadMarkdown('markdown内容', '有效标题', 123);

            // 有效标题时不应尝试获取tab信息
            expect(mockBrowser.tabs.get).not.toHaveBeenCalled();
        });
    });

    describe('文件名安全清理测试', () => {
        test('应移除危险的文件系统字符', async () => {
            const dangerousTitle = '测试/标题\\文件*名称?"<>|';
            
            await downloadMarkdown('markdown内容', dangerousTitle);

            // 验证调用了下载API，且文件名被清理
            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: '测试_标题_文件_名称___.md',
                saveAs: false
            });
        });

        test('应保留冒号（标题中常见）', async () => {
            const titleWithColon = '测试标题: 副标题';
            
            await downloadMarkdown('markdown内容', titleWithColon);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: '测试标题: 副标题.md',
                saveAs: false
            });
        });

        test('清理后为空时应使用默认标题', async () => {
            const onlySpecialChars = '/\\*?"<>|';
            
            await downloadMarkdown('markdown内容', onlySpecialChars);

            expect(console.log).toHaveBeenCalledWith('   ❌ 清理后为空，使用默认标题');
            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: 'download.md',
                saveAs: false
            });
        });

        test('应正确处理中文字符', async () => {
            const chineseTitle = '中文标题测试';
            
            await downloadMarkdown('markdown内容', chineseTitle);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: '中文标题测试.md',
                saveAs: false
            });
        });

        test('应正确处理混合字符', async () => {
            const mixedTitle = 'English 中文 123 !@#';
            
            await downloadMarkdown('markdown内容', mixedTitle);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: 'English 中文 123 !@#.md',
                saveAs: false
            });
        });
    });

    describe('文件夹路径处理测试', () => {
        test('应正确处理mdClipsFolder', async () => {
            const mdClipsFolder = 'my-clips';
            
            await downloadMarkdown('markdown内容', '测试标题', 123, {}, mdClipsFolder);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: 'my-clips/测试标题.md',
                saveAs: false
            });
        });

        test('应自动添加文件夹分隔符', async () => {
            const mdClipsFolder = 'my-clips';
            
            await downloadMarkdown('markdown内容', '测试标题', 123, {}, mdClipsFolder);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith(
                expect.objectContaining({
                    filename: 'my-clips/测试标题.md'
                })
            );
        });

        test('已有分隔符时不应重复添加', async () => {
            const mdClipsFolder = 'my-clips/';
            
            await downloadMarkdown('markdown内容', '测试标题', 123, {}, mdClipsFolder);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith(
                expect.objectContaining({
                    filename: 'my-clips/测试标题.md'
                })
            );
        });
    });

    describe('功能完整性测试', () => {
        test('downloadMarkdown函数应该存在并可调用', async () => {
            expect(typeof downloadMarkdown).toBe('function');

            // 函数应该能够执行而不抛出异常
            await expect(downloadMarkdown('markdown内容', '测试标题', 123)).resolves.not.toThrow();
        });

        test('应处理各种标题输入', async () => {
            // 这些调用不应抛出异常
            await expect(downloadMarkdown('内容', '正常标题')).resolves.not.toThrow();
            await expect(downloadMarkdown('内容', '')).resolves.not.toThrow();
            await expect(downloadMarkdown('内容', null)).resolves.not.toThrow();
            await expect(downloadMarkdown('内容', undefined)).resolves.not.toThrow();
        });
    });

    describe('边界情况测试', () => {
        test('极长标题应被正确处理', async () => {
            const longTitle = 'A'.repeat(1000);
            
            await downloadMarkdown('markdown内容', longTitle);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith(
                expect.objectContaining({
                    filename: expect.stringMatching(/^A+\.md$/)
                })
            );
        });

        test('只有空白字符的标题', async () => {
            await downloadMarkdown('markdown内容', '   \t\n  ');

            expect(console.log).toHaveBeenCalledWith('   ❌ 标题为空，触发兜底逻辑');
        });

        test('包含换行符的标题', async () => {
            const titleWithNewlines = '第一行\n第二行';
            
            await downloadMarkdown('markdown内容', titleWithNewlines);

            expect(mockBrowser.downloads.download).toHaveBeenCalledWith(
                expect.objectContaining({
                    filename: '第一行\n第二行.md'
                })
            );
        });
    });

    describe('下载API集成测试', () => {
        test('应使用正确的参数调用下载API', async () => {
            const markdown = '# 测试内容';
            const title = '测试标题';
            
            await downloadMarkdown(markdown, title);

            expect(global.Blob).toHaveBeenCalledWith([markdown], {
                type: "text/markdown;charset=utf-8"
            });
            expect(global.URL.createObjectURL).toHaveBeenCalled();
            expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
                url: 'mock-blob-url',
                filename: '测试标题.md',
                saveAs: false
            });
        });

        test('下载失败时应正确处理错误', async () => {
            mockBrowser.downloads.download.mockRejectedValue(new Error('下载失败'));
            
            // 应该不抛出错误，而是内部处理
            await expect(downloadMarkdown('markdown内容', '测试标题')).resolves.toBeUndefined();
        });
    });
});