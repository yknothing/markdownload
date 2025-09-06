/**
 * Unit tests for filename generation and validation
 * REFACTORED: Using real business logic functions from background.js
 */

const { setupTestEnvironment, resetTestEnvironment, validateFileName } = require('../utils/testHelpers.js');
const { generateValidFileName } = require('../../src/background/background.js');

describe('Filename Generation and Security Tests', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  describe('Basic filename sanitization', () => {
    test('should remove illegal filesystem characters', () => {
      const testCases = [
        { input: 'test/file.md', expected: 'testfile.md' },
        { input: 'test\\file.md', expected: 'testfile.md' },
        { input: 'test:file.md', expected: 'testfile.md' },
        { input: 'test*file.md', expected: 'testfile.md' },
        { input: 'test?file.md', expected: 'testfile.md' },
        { input: 'test"file.md', expected: 'testfile.md' },
        { input: 'test<file>.md', expected: 'testfile.md' },
        { input: 'test|file.md', expected: 'testfile.md' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = generateValidFileName(input);
        expect(result).toBe(expected);
      });
    });

    test('should handle complex combinations of illegal characters', () => {
      const input = 'My<Amazing>Article/With\\Many:Illegal*Characters?.md';
      const expected = 'MyAmazingArticleWithManyIllegalCharacters.md';
      
      const result = generateValidFileName(input);
      expect(result).toBe(expected);
    });

    test('should handle special unicode characters safely', () => {
      const input = 'Test\u00A0File\u00A0With\u00A0NBSP';
      const expected = 'Test File With NBSP';
      
      const result = generateValidFileName(input);
      expect(result).toBe(expected);
    });

    test('should handle empty and null inputs', () => {
      expect(generateValidFileName('')).toBe('');
      expect(generateValidFileName(null)).toBe(null);
      expect(generateValidFileName(undefined)).toBe(undefined);
    });
  });

  describe('Whitespace handling', () => {
    test('should collapse multiple spaces to single spaces', () => {
      const input = 'Test   File   With    Many     Spaces';
      const expected = 'Test File With Many Spaces';
      
      const result = generateValidFileName(input);
      expect(result).toBe(expected);
    });

    test('should trim leading and trailing whitespace', () => {
      const input = '   Leading and trailing spaces   ';
      const expected = 'Leading and trailing spaces';
      
      const result = generateValidFileName(input);
      expect(result).toBe(expected);
    });
  });

  describe('Custom disallowed characters', () => {
    test('should remove custom disallowed characters', () => {
      const input = 'Test[File]With#Custom^Characters';
      const disallowedChars = '[]#^';
      const expected = 'TestFileWithCustomCharacters';
      
      const result = generateValidFileName(input, disallowedChars);
      expect(result).toBe(expected);
    });

    test('should handle regex special characters in disallowed list', () => {
      const input = 'Test.File+With(Special)Chars';
      const disallowedChars = '.+()';
      const expected = 'TestFileWithSpecialChars';
      
      const result = generateValidFileName(input, disallowedChars);
      expect(result).toBe(expected);
    });
  });

  describe('Security tests', () => {
    test('should prevent path traversal attempts', () => {
      const maliciousInputs = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts'
      ];

      maliciousInputs.forEach(input => {
        const result = generateValidFileName(input);
        expect(result).not.toContain('../');
        expect(result).not.toContain('..\\');
        expect(result).not.toContain('/');
        expect(result).not.toContain('\\');
        expect(result).not.toContain(':');
      });
    });

    test('should handle very long filenames', () => {
      const longFilename = 'A'.repeat(300) + '.md';
      const result = generateValidFileName(longFilename);
      
      // Should be truncated to reasonable length
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result).toContain('.md');
    });
  });

  describe('Edge cases', () => {
    test('should handle numbers and basic punctuation', () => {
      const input = 'Article-123_Test.File (Version 2).md';
      
      const result = generateValidFileName(input);
      expect(result).toBe('Article-123_Test.File (Version 2).md');
    });

    test('should preserve extension', () => {
      const input = 'Test<File>.md';
      const expected = 'TestFile.md';
      
      const result = generateValidFileName(input);
      expect(result).toBe(expected);
    });
  });

  describe('Integration with validateFileName helper', () => {
    test('should pass validateFileName checks', () => {
      const testFiles = [
        'Simple Test.md',
        'Test_with_underscores.md',
        'Test-with-hyphens.md',
        'Test (with parentheses).md'
      ];

      testFiles.forEach(filename => {
        const cleaned = generateValidFileName(filename);
        expect(validateFileName(cleaned)).toBe(true);
      });
    });

    test('should clean up files that would fail validateFileName', () => {
      const problematicFiles = [
        'Test<with>brackets.md',
        'Test/with/slashes.md',
        'Test\\with\\backslashes.md',
        'Test:with:colons.md'
      ];

      problematicFiles.forEach(filename => {
        const cleaned = generateValidFileName(filename);
        expect(validateFileName(cleaned)).toBe(true);
      });
    });
  });
});