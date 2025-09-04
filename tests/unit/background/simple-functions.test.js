/**
 * 简化的函数测试 - 聚焦实际修复的bug
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

// 基本的browser mocks - 只模拟必要的API
global.importScripts = jest.fn();
global.browser = {
    runtime: {
        getPlatformInfo: jest.fn(() => Promise.resolve({})),
        onMessage: { addListener: jest.fn() }
    },
    commands: {
        onCommand: { addListener: jest.fn() }
    },
    tabs: {
        getCurrent: jest.fn(() => Promise.resolve({})),
        get: jest.fn(() => Promise.resolve({}))
    },
    contextMenus: {
        onClicked: { addListener: jest.fn() }
    }
};

global.createMenus = undefined;
global.notify = jest.fn();

// Mock moment简单版本
global.moment = function(date) {
    return {
        format: function(fmt) {
            return '2024-01-01';
        }
    };
};

// 加载background.js
require(path.join(process.cwd(), 'src/background/background.js'));

describe('Bug修复验证测试', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('textReplace函数基础测试', () => {
        test('函数应该存在', () => {
            expect(typeof textReplace).toBe('function');
        });

        test('正常模板替换工作', () => {
            const article = { pageTitle: '测试页面' };
            const result = textReplace('{pageTitle}', article);
            expect(result).toBe('测试页面');
        });

        test('默认模板处理', () => {
            const article = { pageTitle: '测试页面' };
            
            // 空模板应使用默认
            expect(textReplace('', article)).toBe('测试页面');
            expect(textReplace(null, article)).toBe('测试页面');
            expect(textReplace(undefined, article)).toBe('测试页面');
        });

        test('兜底逻辑工作', () => {
            // 只有符号的输入应该使用兜底逻辑
            const article = { pageTitle: '测试页面' };
            const result = textReplace('!@#$%', article);
            expect(result).toBe('测试页面');
        });

        test('安全过滤工作', () => {
            const article = { pageTitle: '<script>alert("test")</script>正常内容' };
            const result = textReplace('{pageTitle}', article);
            expect(result).toBe('正常内容');
            expect(result).not.toContain('<script>');
        });
    });

    describe('generateValidFileName函数基础测试', () => {
        test('函数应该存在', () => {
            expect(typeof generateValidFileName).toBe('function');
        });

        test('null/undefined处理', () => {
            expect(generateValidFileName(null)).toBe(null);
            expect(generateValidFileName(undefined)).toBe(undefined);
        });

        test('移除危险字符', () => {
            const result = generateValidFileName('测试/文件*名称');
            expect(result).not.toContain('/');
            expect(result).not.toContain('*');
            expect(result).toContain('测试');
            expect(result).toContain('文件');
            expect(result).toContain('名称');
        });

        test('自定义禁止字符', () => {
            const result = generateValidFileName('测试#文件', { disallowedChars: '#' });
            expect(result).not.toContain('#');
            expect(result).toContain('测试');
            expect(result).toContain('文件');
        });
    });

    describe('不会抛出异常', () => {
        test('textReplace应该处理各种输入', () => {
            expect(() => textReplace(null, null)).not.toThrow();
            expect(() => textReplace(undefined, undefined)).not.toThrow();
            expect(() => textReplace('', {})).not.toThrow();
            expect(() => textReplace(123, { pageTitle: 'test' })).not.toThrow();
        });

        test('generateValidFileName应该处理各种输入', () => {
            expect(() => generateValidFileName(null)).not.toThrow();
            expect(() => generateValidFileName(undefined)).not.toThrow();
            expect(() => generateValidFileName('')).not.toThrow();
            expect(() => generateValidFileName('normal')).not.toThrow();
        });
    });

    describe('核心bug修复验证', () => {
        test('空模板默认行为修复', () => {
            const article = { pageTitle: '页面标题', title: '备用标题' };
            
            // 这些都应该返回pageTitle而不是空字符串
            expect(textReplace('', article)).toBe('页面标题');
            expect(textReplace(null, article)).toBe('页面标题');
            expect(textReplace(undefined, article)).toBe('页面标题');
        });

        test('兜底逻辑优先级修复', () => {
            // pageTitle优先
            expect(textReplace('', { pageTitle: 'A', title: 'B' })).toBe('A');
            
            // 没有pageTitle时用title
            expect(textReplace('', { title: 'B' })).toBe('B');
            
            // 都没有时用download
            expect(textReplace('', {})).toBe('download');
        });

        test('安全过滤修复', () => {
            const cases = [
                { input: '<script>alert("xss")</script>安全内容', expected: '安全内容' },
                { input: 'javascript:void(0)安全内容', expected: '安全内容' },
                { input: 'onclick="evil()"安全内容', expected: '安全内容' }
            ];
            
            cases.forEach(({ input, expected }) => {
                const result = textReplace('{pageTitle}', { pageTitle: input });
                expect(result).toBe(expected);
            });
        });
    });
});