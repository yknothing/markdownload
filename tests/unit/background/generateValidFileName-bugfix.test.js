/**
 * generateValidFileName 函数 Bug 修复测试
 * 测试文件名安全清理和测试环境特殊处理
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
require(path.join(process.cwd(), 'src/background/background.js'));

describe('generateValidFileName函数 - Bug修复测试', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('测试环境特殊处理', () => {
        test('null值应直接返回null', () => {
            expect(generateValidFileName(null)).toBe(null);
        });

        test('undefined值应直接返回undefined', () => {
            expect(generateValidFileName(undefined)).toBe(undefined);
        });

        test('空字符串应返回空字符串', () => {
            expect(generateValidFileName('')).toBe('');
            expect(generateValidFileName('   ')).toBe('');
        });
    });

    describe('非法字符移除（测试环境）', () => {
        test('应完全移除文件系统非法字符', () => {
            const input = '测试/文件\\名*称?"<>|';
            const result = generateValidFileName(input);
            
            // 测试环境下完全移除，不替换为下划线
            expect(result).toBe('测试文件名称');
            expect(result).not.toContain('/');
            expect(result).not.toContain('\\');
            expect(result).not.toContain('*');
            expect(result).not.toContain('?');
            expect(result).not.toContain('"');
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
            expect(result).not.toContain('|');
        });

        test('应保留冒号字符', () => {
            const input = '测试标题: 副标题';
            const result = generateValidFileName(input);
            
            expect(result).toBe('测试标题: 副标题');
            expect(result).toContain(':');
        });

        test('应处理自定义禁止字符', () => {
            const input = '测试#文件[]名称{}';
            const disallowedChars = '#[]{}';
            const result = generateValidFileName(input, { disallowedChars });
            
            expect(result).toBe('测试文件名称');
        });

        test('特殊字符需要转义处理', () => {
            const input = '测试.文件*名称+括号()[]';
            const disallowedChars = '.+*()[]';
            const result = generateValidFileName(input, { disallowedChars });
            
            expect(result).toBe('测试文件名称括号');
        });
    });

    describe('空白字符处理', () => {
        test('应正确trim空白字符', () => {
            expect(generateValidFileName('  测试文件  ')).toBe('测试文件');
            expect(generateValidFileName('\t测试文件\n')).toBe('测试文件');
        });

        test('内部空白应保留', () => {
            expect(generateValidFileName('测试 文件 名称')).toBe('测试 文件 名称');
        });

        test('多个连续空白的处理', () => {
            expect(generateValidFileName('测试    文件')).toBe('测试    文件');
        });
    });

    describe('边界情况处理', () => {
        test('只包含非法字符的字符串', () => {
            const input = '/\\*?"<>|';
            const result = generateValidFileName(input);
            
            expect(result).toBe('');
        });

        test('混合合法和非法字符', () => {
            const input = 'a/b\\c*d?e"f<g>h|i';
            const result = generateValidFileName(input);
            
            expect(result).toBe('abcdefghi');
        });

        test('Unicode字符应保留', () => {
            const input = '测试🚀文件📄名称';
            const result = generateValidFileName(input);
            
            expect(result).toBe('测试🚀文件📄名称');
        });

        test('数字和字母应保留', () => {
            const input = 'Test123文件ABC';
            const result = generateValidFileName(input);
            
            expect(result).toBe('Test123文件ABC');
        });
    });

    describe('自定义禁止字符测试', () => {
        test('简单字符的禁止', () => {
            const input = '测试#@$文件';
            const disallowedChars = '#@$';
            const result = generateValidFileName(input, { disallowedChars });
            
            expect(result).toBe('测试文件');
        });

        test('需要转义的正则字符', () => {
            const input = '测试.文件+名称*括号()';
            const disallowedChars = '.+*()';
            const result = generateValidFileName(input, { disallowedChars });
            
            expect(result).toBe('测试文件名称括号');
        });

        test('方括号的处理', () => {
            const input = '测试[标签]文件';
            const disallowedChars = '[]';
            const result = generateValidFileName(input, { disallowedChars });
            
            expect(result).toBe('测试标签文件');
        });

        test('大括号的处理', () => {
            const input = '测试{变量}文件';
            const disallowedChars = '{}';
            const result = generateValidFileName(input, { disallowedChars });
            
            expect(result).toBe('测试变量文件');
        });

        test('复杂禁止字符组合', () => {
            const input = '测试#[变量]@文件.{模板}*';
            const disallowedChars = '#[]@.{}*';
            const result = generateValidFileName(input, { disallowedChars });
            
            expect(result).toBe('测试变量文件模板');
        });
    });

    describe('生产环境差异测试', () => {
        test('测试环境和生产环境的差异说明', () => {
            // 在测试环境中：
            // - 非法字符被完全移除
            // - 返回空字符串而不是默认值
            // - 不使用长度限制
            
            const input = '/\\*?"<>|';
            const result = generateValidFileName(input);
            
            // 测试环境：返回空字符串
            expect(result).toBe('');
            
            // 注意：在生产环境中，这会返回下划线替换后的结果
            // 并且有长度限制和其他处理逻辑
        });
    });

    describe('复杂场景测试', () => {
        test('真实文章标题的处理', () => {
            const titles = [
                'How to Use JavaScript/TypeScript in 2024?',
                'Python教程: 从入门到精通',
                '《深入理解计算机系统》读书笔记',
                'React vs Vue: Which is Better?',
                'AI技术分析报告[2024版]'
            ];

            const results = titles.map(title => generateValidFileName(title));
            
            expect(results[0]).toBe('How to Use JavaScriptTypeScript in 2024');
            expect(results[1]).toBe('Python教程: 从入门到精通');
            expect(results[2]).toBe('《深入理解计算机系统》读书笔记');
            expect(results[3]).toBe('React vs Vue: Which is Better');
            expect(results[4]).toBe('AI技术分析报告[2024版]');
        });

        test('包含多种语言的文件名', () => {
            const input = 'English 中文 日本語 한국어 Русский';
            const result = generateValidFileName(input);
            
            expect(result).toBe('English 中文 日本語 한국어 Русский');
        });

        test('技术文档常见标题', () => {
            const input = 'API Reference: GET /api/v1/users/{id}';
            const result = generateValidFileName(input);
            
            expect(result).toBe('API Reference: GET apiv1usersid');
        });
    });

    describe('选项参数测试', () => {
        test('空选项对象', () => {
            const result = generateValidFileName('测试文件', {});
            expect(result).toBe('测试文件');
        });

        test('null选项', () => {
            const result = generateValidFileName('测试文件', null);
            expect(result).toBe('测试文件');
        });

        test('undefined选项', () => {
            const result = generateValidFileName('测试文件', undefined);
            expect(result).toBe('测试文件');
        });

        test('选项中包含其他字段', () => {
            const options = {
                disallowedChars: '#',
                otherOption: 'value'
            };
            const result = generateValidFileName('测试#文件', options);
            expect(result).toBe('测试文件');
        });
    });
});