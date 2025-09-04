/**
 * Unit tests for normalizeMarkdown() function
 * Tests markdown normalization, formatting, and cleanup functionality
 * Following SOLID principles and testing best practices
 */

const { normalizeMarkdown } = require('../../../src/background/background.js');

describe('normalizeMarkdown() function', () => {
  describe('Input validation and edge cases', () => {
    test('should handle null input', () => {
      const result = normalizeMarkdown(null);
      expect(result).toBeNull();
    });

    test('should handle undefined input', () => {
      const result = normalizeMarkdown(undefined);
      expect(result).toBeUndefined();
    });

    test('should handle empty string input', () => {
      const result = normalizeMarkdown('');
      expect(result).toBe('');
    });

    test('should handle whitespace-only input', () => {
      const result = normalizeMarkdown('   \n\n  \t  \n');
      expect(result).toBe('\n');
    });

    test('should handle very long input without crashing', () => {
      const longContent = 'a'.repeat(100000);
      expect(() => normalizeMarkdown(longContent)).not.toThrow();
    });
  });

  describe('Line ending normalization', () => {
    test('should normalize Windows line endings to Unix', () => {
      const input = 'Line 1\r\nLine 2\r\nLine 3';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3\n');
    });

    test('should normalize old Mac line endings to Unix', () => {
      const input = 'Line 1\rLine 2\rLine 3';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3\n');
    });

    test('should preserve Unix line endings', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3\n');
    });

    test('should handle mixed line endings', () => {
      const input = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3\nLine 4\n');
    });
  });

  describe('HTML entity decoding', () => {
    test('should decode common HTML entities', () => {
      const input = 'Text with &amp; &lt; &gt; &quot; &#39; entities';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Text with & < > " \' entities\n');
    });

    test('should decode special characters', () => {
      const input = 'Special &nbsp; &mdash; &ndash; &hellip; chars';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Special   — – … chars\n');
    });

    test('should decode quotation marks', () => {
      const input = 'Quotes: &ldquo;text&rdquo; &lsquo;more&rsquo;';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Quotes: "text" \'more\'\n');
    });

    test('should handle multiple occurrences of same entity', () => {
      const input = '&amp; and &amp; and &amp; again';
      const result = normalizeMarkdown(input);
      expect(result).toBe('& and & and & again\n');
    });

    test('should not decode unknown entities', () => {
      const input = 'Unknown &xyz; entity';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Unknown &xyz; entity\n');
    });
  });

  describe('List normalization', () => {
    test('should normalize bullet list markers', () => {
      const input = '• First item\n• Second item\n• Third item';
      const result = normalizeMarkdown(input);
      expect(result).toBe('- First item\n- Second item\n- Third item\n');
    });

    test('should normalize various Unicode bullet points', () => {
      const input = '• Item 1\n· Item 2\n‧ Item 3\n∙ Item 4\n● Item 5';
      const result = normalizeMarkdown(input);
      const lines = result.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          expect(line).toMatch(/^- Item \d$/);
        }
      });
    });

    test('should normalize ordered list markers', () => {
      const input = '1) First item\n2） Second item\n3． Third item\n4。 Fourth item';
      const result = normalizeMarkdown(input);
      expect(result).toBe('1. First item\n2. Second item\n3. Third item\n4. Fourth item\n');
    });

    test('should normalize Chinese enumeration markers', () => {
      const input = '1、 First item\n2、 Second item';
      const result = normalizeMarkdown(input);
      expect(result).toBe('1. First item\n2. Second item\n');
    });

    test('should preserve list indentation', () => {
      const input = '  • Indented item\n    ◦ More indented\n  • Back to first level';
      const result = normalizeMarkdown(input);
      expect(result).toContain('  - Indented item');
      expect(result).toContain('    - More indented');
      expect(result).toContain('  - Back to first level');
    });

    test('should handle inline bullet separation', () => {
      const input = 'List: • Item 1 • Item 2 • Item 3';
      const result = normalizeMarkdown(input);
      expect(result).toContain('List:\n- Item 1\n- Item 2\n- Item 3');
    });

    test('should handle colon-prefixed bullet lists', () => {
      const input = 'Features: • Feature 1 • Feature 2';
      const result = normalizeMarkdown(input);
      expect(result).toContain('Features:\n- Feature 1\n- Feature 2');
    });
  });

  describe('Heading normalization', () => {
    test('should add spacing before headings', () => {
      const input = 'Some paragraph\n# Heading\nAnother paragraph';
      const result = normalizeMarkdown(input);
      expect(result).toContain('Some paragraph\n\n# Heading\n\nAnother paragraph');
    });

    test('should not add extra spacing if already present', () => {
      const input = 'Some paragraph\n\n# Heading\n\nAnother paragraph';
      const result = normalizeMarkdown(input);
      // Should not create triple newlines
      expect(result).not.toContain('\n\n\n');
      expect(result).toContain('Some paragraph\n\n# Heading\n\nAnother paragraph');
    });

    test('should handle multiple heading levels', () => {
      const input = '# H1\nText\n## H2\nMore text\n### H3';
      const result = normalizeMarkdown(input);
      expect(result).toMatch(/# H1\n\nText\n\n## H2\n\nMore text\n\n### H3/);
    });

    test('should not add spacing after lists before headings', () => {
      const input = '- List item\n# Heading';
      const result = normalizeMarkdown(input);
      expect(result).not.toContain('- List item\n\n# Heading');
    });
  });

  describe('Code block handling', () => {
    test('should preserve code block content unchanged', () => {
      const input = '```javascript\n• This should not be normalized\n&amp; Neither this\n```';
      const result = normalizeMarkdown(input);
      expect(result).toContain('• This should not be normalized');
      expect(result).toContain('&amp; Neither this');
    });

    test('should handle nested code fences', () => {
      const input = '```\nSome code\n````\nNested fence\n````\n```';
      const result = normalizeMarkdown(input);
      expect(result).toContain('````\nNested fence\n````');
    });

    test('should handle tilde fences', () => {
      const input = '~~~python\n• Code content\n&amp; entities\n~~~';
      const result = normalizeMarkdown(input);
      expect(result).toContain('• Code content');
      expect(result).toContain('&amp; entities');
    });

    test('should add spacing around code blocks', () => {
      const input = 'Text before\n```\ncode\n```\nText after';
      const result = normalizeMarkdown(input);
      expect(result).toContain('Text before\n\n```\ncode\n```\n\nText after');
    });

    test('should not normalize content inside code blocks', () => {
      const input = '```\n1） List item\n• Bullet\n&amp; entity\n```';
      const result = normalizeMarkdown(input);
      const codeMatch = result.match(/```\n([\s\S]*?)\n```/);
      expect(codeMatch[1]).toBe('1） List item\n• Bullet\n&amp; entity');
    });
  });

  describe('Table handling', () => {
    test('should add spacing around tables', () => {
      const input = 'Text before\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\nText after';
      const result = normalizeMarkdown(input);
      expect(result).toContain('Text before\n\n| Header 1');
      expect(result).toContain('| Cell 2   |\n\nText after');
    });

    test('should preserve table formatting', () => {
      const input = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
      const result = normalizeMarkdown(input);
      expect(result).toContain('| Header 1 | Header 2 |');
      expect(result).toContain('|----------|----------|');
      expect(result).toContain('| Cell 1   | Cell 2   |');
    });

    test('should handle table ending with empty line', () => {
      const input = '| Header |\n|--------|\n| Cell   |\n\nNext paragraph';
      const result = normalizeMarkdown(input);
      expect(result).not.toContain('|\n\n\nNext');
    });
  });

  describe('Blockquote handling', () => {
    test('should add spacing before blockquotes', () => {
      const input = 'Normal text\n> Quoted text\nMore text';
      const result = normalizeMarkdown(input);
      expect(result).toContain('Normal text\n\n> Quoted text\n\nMore text');
    });

    test('should fix blockquote spacing', () => {
      const input = '>No space after\n> Has space';
      const result = normalizeMarkdown(input);
      expect(result).toContain('> No space after');
      expect(result).toContain('> Has space');
    });

    test('should handle nested blockquotes', () => {
      const input = '> Level 1\n>> Level 2\n> Back to level 1';
      const result = normalizeMarkdown(input);
      expect(result).toContain('> Level 1');
      expect(result).toContain('>> Level 2');
      expect(result).toContain('> Back to level 1');
    });

    test('should add spacing after blockquote groups', () => {
      const input = '> Quote line 1\n> Quote line 2\nNormal text';
      const result = normalizeMarkdown(input);
      expect(result).toContain('> Quote line 2\n\nNormal text');
    });
  });

  describe('Quote normalization', () => {
    test('should normalize Unicode quotes', () => {
      const input = '\u201cSmart quotes\u201d and \u2018single quotes\u2019';
      const result = normalizeMarkdown(input);
      expect(result).toBe('"Smart quotes" and \'single quotes\'\n');
    });

    test('should handle mixed quote types', () => {
      const input = '\u201cMixed\u201d quotes \u2018and\u2019 \u201cmore\u201d quotes';
      const result = normalizeMarkdown(input);
      expect(result).toBe('"Mixed" quotes \'and\' "more" quotes\n');
    });
  });

  describe('Whitespace and line management', () => {
    test('should remove trailing whitespace from lines', () => {
      const input = 'Line with spaces   \nAnother line\t\t\n';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Line with spaces\nAnother line\n');
    });

    test('should compress multiple empty lines', () => {
      const input = 'Line 1\n\n\n\n\nLine 2';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Line 1\n\nLine 2\n');
    });

    test('should remove leading empty lines', () => {
      const input = '\n\n\nFirst line\nSecond line';
      const result = normalizeMarkdown(input);
      expect(result).toBe('First line\nSecond line\n');
    });

    test('should ensure single trailing newline', () => {
      const input = 'Content\n\n\n';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Content\n');
    });

    test('should add newline if missing', () => {
      const input = 'Content without newline';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Content without newline\n');
    });
  });

  describe('Invisible character handling', () => {
    test('should remove invisible leading characters', () => {
      const input = '\u200B\u200C\u200DLine with invisible chars';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Line with invisible chars\n');
    });

    test('should handle zero-width spaces', () => {
      const input = 'Text\u200Bwith\u200Czero\u200Dwidth\u2060chars';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Textwithzerowithchars\n');
    });

    test('should handle byte order mark', () => {
      const input = '\uFEFFContent with BOM';
      const result = normalizeMarkdown(input);
      expect(result).toBe('Content with BOM\n');
    });
  });

  describe('Complex formatting scenarios', () => {
    test('should handle mixed content types', () => {
      const input = `# Heading
Some text • bullet • another bullet
> Quote text
\`\`\`
Code block
• Not normalized
\`\`\`
More text`;
      
      const result = normalizeMarkdown(input);
      
      expect(result).toContain('# Heading\n\nSome text\n- bullet\n- another bullet');
      expect(result).toContain('\n\n> Quote text');
      expect(result).toContain('```\nCode block\n• Not normalized\n```');
    });

    test('should handle document with all formatting types', () => {
      const input = `Title text
# Main Heading
Regular paragraph with &amp; entities.
• List item 1
• List item 2
> Blockquote text
\`\`\`javascript
console.log("code");
\`\`\`
## Sub Heading
| Table | Header |
|-------|--------|
| Cell  | Data   |
Final paragraph.`;

      const result = normalizeMarkdown(input);
      
      // Should have proper spacing
      expect(result).toContain('Title text\n\n# Main Heading');
      expect(result).toContain('entities.\n\n- List item 1');
      expect(result).toContain('item 2\n\n> Blockquote text');
      expect(result).toContain('text\n\n```javascript');
      expect(result).toContain('```\n\n## Sub Heading');
      expect(result).toContain('Heading\n\n| Table | Header |');
      expect(result).toContain('| Data   |\n\nFinal paragraph');
      
      // Should decode entities
      expect(result).toContain('paragraph with & entities');
      
      // Should normalize list markers
      expect(result).toContain('- List item 1');
    });

    test('should handle edge case combinations', () => {
      const input = `# Heading&nbsp;with&nbsp;entities
• List • with • inline • bullets
\`\`\`
• Code with bullets &amp; entities
\`\`\`
> Quote &ldquo;with quotes&rdquo;`;

      const result = normalizeMarkdown(input);
      
      expect(result).toContain('# Heading with entities');
      expect(result).toContain('- List\n- with\n- inline\n- bullets');
      expect(result).toContain('• Code with bullets &amp; entities');
      expect(result).toContain('> Quote "with quotes"');
    });
  });

  describe('Performance and stress tests', () => {
    test('should handle large documents efficiently', () => {
      const largeSections = Array(1000).fill('# Section\n\nContent paragraph.\n\n').join('');
      const start = Date.now();
      
      const result = normalizeMarkdown(largeSections);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result).toContain('# Section');
      expect(result.split('# Section').length).toBe(1001); // 1000 sections + 1 empty split
    });

    test('should handle documents with many list items', () => {
      const manyItems = Array(1000).fill('• Item').join('\n');
      const start = Date.now();
      
      const result = normalizeMarkdown(manyItems);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(3000);
      expect(result.split('- Item').length).toBe(1001);
    });

    test('should handle documents with complex nesting', () => {
      let nested = '';
      for (let i = 0; i < 100; i++) {
        nested += `${'  '.repeat(i)}• Level ${i} item\n`;
      }
      
      const start = Date.now();
      const result = normalizeMarkdown(nested);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(2000);
      expect(result).toContain('- Level 0 item');
      expect(result).toContain('- Level 99 item');
    });
  });

  describe('SOLID principles compliance', () => {
    test('should follow Single Responsibility Principle', () => {
      // Function should only normalize markdown, not create it
      const input = '• Test\n&amp; entities';
      const result = normalizeMarkdown(input);
      
      expect(typeof result).toBe('string');
      expect(result).toBe('- Test\n& entities\n');
    });

    test('should follow Open/Closed Principle', () => {
      // Function behavior should be consistent regardless of input complexity
      const simpleInput = '• Simple';
      const complexInput = '• Complex &amp; with\n\n\nentities\n```\ncode\n```';
      
      const simpleResult = normalizeMarkdown(simpleInput);
      const complexResult = normalizeMarkdown(complexInput);
      
      expect(simpleResult).toContain('- Simple');
      expect(complexResult).toContain('- Complex & with');
    });

    test('should be deterministic (same input produces same output)', () => {
      const input = '• Test &amp; entities\n# Heading\n> Quote';
      
      const result1 = normalizeMarkdown(input);
      const result2 = normalizeMarkdown(input);
      const result3 = normalizeMarkdown(input);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    test('should handle different input formats consistently', () => {
      // Different ways to represent the same logical content
      const input1 = '• Item 1\n• Item 2';
      const input2 = '· Item 1\n· Item 2';
      const input3 = '◦ Item 1\n◦ Item 2';
      
      const result1 = normalizeMarkdown(input1);
      const result2 = normalizeMarkdown(input2);
      const result3 = normalizeMarkdown(input3);
      
      // All should normalize to the same standard format
      expect(result1).toBe('- Item 1\n- Item 2\n');
      expect(result2).toBe('- Item 1\n- Item 2\n');
      expect(result3).toBe('- Item 1\n- Item 2\n');
    });
  });

  describe('Error handling and robustness', () => {
    test('should handle regex edge cases', () => {
      const input = 'Text with $special ^characters (and) [brackets] {braces}';
      expect(() => normalizeMarkdown(input)).not.toThrow();
      
      const result = normalizeMarkdown(input);
      expect(result).toContain('$special ^characters (and) [brackets] {braces}');
    });

    test('should handle malformed markdown gracefully', () => {
      const malformedInputs = [
        '# Heading without content',
        '> Quote\nwithout proper spacing',
        '```\nUnclosed code block',
        '| Malformed | table',
        '- List\nwithout proper formatting'
      ];

      malformedInputs.forEach(input => {
        expect(() => normalizeMarkdown(input)).not.toThrow();
      });
    });

    test('should handle extreme Unicode characters', () => {
      const input = '𝕿𝖊𝖝𝖙 𝖜𝖎𝖙𝖍 𝖚𝖓𝖎𝖈𝖔𝖉𝖊 𝖈𝖍𝖆𝖗𝖆𝖈𝖙𝖊𝖗𝖘';
      expect(() => normalizeMarkdown(input)).not.toThrow();
    });

    test('should handle control characters gracefully', () => {
      const input = 'Text\x00with\x01control\x02characters';
      expect(() => normalizeMarkdown(input)).not.toThrow();
    });
  });
});