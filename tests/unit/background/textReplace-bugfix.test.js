/**
 * textReplace 函数 Bug 修复测试
 * 测试最近修复的bug相关功能
 */

const path = require('path');

// 设置测试环境
global.jest = true;
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// 导入被测试的函数
const { textReplace } = require(path.join(process.cwd(), 'src/background/background.js'));

describe('textReplace函数 - Bug修复测试', () => {
    beforeEach(() => {
        // 清除console调用记录
        jest.clearAllMocks();
    });

    describe('默认模板处理', () => {
        test('空模板应使用默认的{pageTitle}模板', () => {
            const article = { pageTitle: '测试页面' };
            
            // 测试空字符串模板
            expect(textReplace('', article)).toBe('测试页面');
            
            // 测试null模板
            expect(textReplace(null, article)).toBe('测试页面');
            
            // 测试undefined模板
            expect(textReplace(undefined, article)).toBe('测试页面');
        });

        test('非字符串模板应使用默认模板', () => {
            const article = { pageTitle: '测试页面' };
            
            expect(textReplace(123, article)).toBe('测试页面');
            expect(textReplace({}, article)).toBe('测试页面');
            expect(textReplace([], article)).toBe('测试页面');
        });
    });

    describe('兜底逻辑测试', () => {
        test('替换后为空字符串时应使用兜底标题', () => {
            const article = { pageTitle: '测试页面', title: '备用标题' };
            
            // 模板中没有匹配的占位符会保留原模板，然后触发兜底逻辑
            const result = textReplace('{nonExistentField}', article);
            expect(result).toBe('测试页面'); // 应该使用兜底逻辑
        });

        test('替换后只有特殊字符时应使用兜底标题', () => {
            const article = { pageTitle: '测试页面' };
            
            // 只有空白字符 - 没有字母数字，应触发兜底
            const result1 = textReplace('   ', article);
            expect(result1).toBe('测试页面');
            
            // 只有标点符号 - 没有字母数字，应触发兜底
            const result2 = textReplace('...', article);
            expect(result2).toBe('测试页面');
            
            const result3 = textReplace('___', article);
            expect(result3).toBe('测试页面');
        });

        test('替换后没有字母数字内容时应使用兜底标题', () => {
            const article = { pageTitle: '测试页面' };
            
            // 只有符号和空白 - 没有字母数字，应触发兜底
            const result = textReplace('!@#$%^&*()', article);
            expect(result).toBe('测试页面');
        });

        test('兜底标题的优先级：pageTitle > title > "download"', () => {
            // 只有pageTitle
            expect(textReplace('', { pageTitle: 'Page标题' })).toBe('Page标题');
            
            // 只有title
            expect(textReplace('', { title: 'Title标题' })).toBe('Title标题');
            
            // pageTitle优先于title
            expect(textReplace('', { pageTitle: 'Page标题', title: 'Title标题' })).toBe('Page标题');
            
            // 都没有时使用默认
            expect(textReplace('', {})).toBe('download');
            expect(textReplace('', null)).toBe('download');
        });
    });

    describe('安全过滤测试（测试环境）', () => {
        test('应移除script标签', () => {
            const article = { pageTitle: '<script>alert("test")</script>测试页面' };
            const result = textReplace('{pageTitle}', article);
            
            expect(result).toBe('测试页面');
            expect(result).not.toContain('<script>');
            expect(result).not.toContain('alert');
        });

        test('应移除javascript协议', () => {
            const article = { pageTitle: 'javascript:alert("test")测试页面' };
            const result = textReplace('{pageTitle}', article);
            
            expect(result).toBe('测试页面');
            expect(result).not.toContain('javascript:');
        });

        test('应移除事件处理器属性', () => {
            const article = { pageTitle: 'onclick="alert(1)"测试页面' };
            const result = textReplace('{pageTitle}', article);
            
            expect(result).toBe('测试页面');
            expect(result).not.toContain('onclick');
        });

        test('应移除样式标签', () => {
            const article = { pageTitle: '<style>body{background:red}</style>测试页面' };
            const result = textReplace('{pageTitle}', article);
            
            expect(result).toBe('测试页面');
            expect(result).not.toContain('<style>');
        });

        test('应保留安全内容', () => {
            const article = { pageTitle: '正常的测试页面标题' };
            const result = textReplace('{pageTitle}', article);
            
            expect(result).toBe('正常的测试页面标题');
        });
    });

    describe('转义处理测试', () => {
        test('应正确处理转义的大括号', () => {
            const article = { pageTitle: '测试页面' };
            
            expect(textReplace('\\{pageTitle\\}', article)).toBe('{pageTitle}');
            expect(textReplace('\\{不存在的字段\\}', article)).toBe('{不存在的字段}');
        });

        test('混合转义和正常占位符', () => {
            const article = { pageTitle: '测试页面' };
            
            expect(textReplace('\\{literal\\} - {pageTitle}', article)).toBe('{literal} - 测试页面');
        });
    });

    describe('复杂场景测试', () => {
        test('包含多个占位符的模板', () => {
            const article = {
                pageTitle: '测试页面',
                author: '作者',
                baseURI: 'https://example.com'
            };
            
            const result = textReplace('{pageTitle} - {author} - {domain}', article);
            expect(result).toBe('测试页面 - 作者 - example.com');
        });

        test('日期格式化占位符', () => {
            const article = { pageTitle: '测试页面' };
            const result = textReplace('{pageTitle} - {date:YYYY-MM-DD}', article);
            
            // 应该包含页面标题和格式化的日期
            expect(result).toContain('测试页面');
            expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        });

        test('关键词占位符', () => {
            const article = {
                pageTitle: '测试页面',
                keywords: 'test,javascript,node'
            };
            
            const result = textReplace('{pageTitle} - {keywords}', article);
            expect(result).toBe('测试页面 - test,javascript,node');
        });
    });

    describe('边界情况测试', () => {
        test('文章对象为null或undefined', () => {
            expect(textReplace('{pageTitle}', null)).toBe('download');
            expect(textReplace('{pageTitle}', undefined)).toBe('download');
        });

        test('模板包含未知占位符', () => {
            const article = { pageTitle: '测试页面' };
            
            // 未知占位符应保留，但触发兜底逻辑
            expect(textReplace('{unknownField}', article)).toBe('测试页面');
        });

        test('空白字符处理', () => {
            const article = { pageTitle: '  测试页面  ' };
            
            const result = textReplace('{pageTitle}', article);
            expect(result).toBe('  测试页面  '); // 保留原有格式
        });
    });
});

describe('功能完整性验证', () => {
    test('textReplace函数应该存在并可调用', () => {
        expect(typeof textReplace).toBe('function');
        
        const article = { pageTitle: '测试页面' };
        const result = textReplace('{pageTitle}', article);
        expect(typeof result).toBe('string');
    });

    test('应能处理各种输入而不抛出异常', () => {
        const article = { pageTitle: '测试页面' };
        
        // 这些调用不应抛出异常
        expect(() => textReplace(null, article)).not.toThrow();
        expect(() => textReplace(undefined, article)).not.toThrow();
        expect(() => textReplace('', article)).not.toThrow();
        expect(() => textReplace('{pageTitle}', null)).not.toThrow();
        expect(() => textReplace('{pageTitle}', undefined)).not.toThrow();
    });
});