/**
 * textReplace 函数基础功能测试
 * 测试实际实现的功能，不包含过度期望
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

// Mock importScripts和browser环境
global.importScripts = jest.fn();
global.browser = {
    runtime: {
        getPlatformInfo: jest.fn(() => Promise.resolve({})),
        onMessage: {
            addListener: jest.fn()
        }
    },
    commands: {
        onCommand: {
            addListener: jest.fn()
        }
    },
    tabs: {
        getCurrent: jest.fn(() => Promise.resolve({})),
        get: jest.fn(() => Promise.resolve({}))
    }
};
global.createMenus = undefined;
global.moment = (date) => ({ format: (fmt) => '2024-01-01' });
global.notify = jest.fn();

// 导入被测试的函数
require(path.join(process.cwd(), 'src/background/background.js'));

describe('textReplace函数 - 实际功能测试', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('基础功能测试', () => {
        test('应该存在并能正常调用', () => {
            expect(typeof textReplace).toBe('function');
        });

        test('正常模板替换', () => {
            const article = { pageTitle: '测试页面', author: '作者' };
            const result = textReplace('{pageTitle}', article);
            expect(result).toBe('测试页面');
        });

        test('多字段替换', () => {
            const article = { pageTitle: '测试页面', author: '作者' };
            const result = textReplace('{pageTitle} - {author}', article);
            expect(result).toBe('测试页面 - 作者');
        });

        test('不存在字段保持原样', () => {
            const article = { pageTitle: '测试页面' };
            const result = textReplace('{nonExistent}', article);
            expect(result).toBe('{nonExistent}');
        });
    });

    describe('默认模板处理', () => {
        test('空模板使用默认', () => {
            const article = { pageTitle: '测试页面' };
            
            // 空字符串应转换为默认模板
            const result1 = textReplace('', article);
            expect(result1).toBe('测试页面');
            
            // null应转换为默认模板
            const result2 = textReplace(null, article);
            expect(result2).toBe('测试页面');
            
            // undefined应转换为默认模板
            const result3 = textReplace(undefined, article);
            expect(result3).toBe('测试页面');
        });
    });

    describe('特殊功能', () => {
        test('域名提取', () => {
            const article = { 
                pageTitle: '测试页面',
                baseURI: 'https://example.com/path'
            };
            const result = textReplace('{domain}', article);
            expect(result).toBe('example.com');
        });

        test('日期格式化', () => {
            const article = { pageTitle: '测试页面' };
            const result = textReplace('{date:YYYY-MM-DD}', article);
            expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        });

        test('关键词处理', () => {
            const article = { 
                pageTitle: '测试页面',
                keywords: ['tag1', 'tag2', 'tag3']
            };
            const result = textReplace('{keywords}', article);
            expect(result).toBe('tag1, tag2, tag3');
        });
    });

    describe('边界情况', () => {
        test('空article对象', () => {
            const result1 = textReplace('{pageTitle}', {});
            expect(result1).toBe('{pageTitle}');
            
            const result2 = textReplace('{pageTitle}', null);
            expect(result2).toBe('{pageTitle}');
            
            const result3 = textReplace('{pageTitle}', undefined);
            expect(result3).toBe('{pageTitle}');
        });

        test('非字符串模板', () => {
            const article = { pageTitle: '测试页面' };
            
            // 数字模板应使用默认
            const result1 = textReplace(123, article);
            expect(result1).toBe('测试页面');
            
            // 对象模板应使用默认
            const result2 = textReplace({}, article);
            expect(result2).toBe('测试页面');
        });

        test('转义字符处理', () => {
            const article = { pageTitle: '测试页面' };
            
            // 转义的大括号应正确处理
            const result = textReplace('\\{pageTitle\\}', article);
            expect(result).toBe('{pageTitle}');
        });
    });

    describe('不会抛出异常', () => {
        test('各种输入组合都不应抛异常', () => {
            const article = { pageTitle: '测试页面' };
            
            expect(() => textReplace(null, null)).not.toThrow();
            expect(() => textReplace(undefined, undefined)).not.toThrow();
            expect(() => textReplace('', {})).not.toThrow();
            expect(() => textReplace('{test}', { test: null })).not.toThrow();
            expect(() => textReplace('{test}', { test: undefined })).not.toThrow();
        });
    });
});