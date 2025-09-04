/**
 * Test fixtures for Markdown normalization scenarios
 * Provides various markdown inputs and expected outputs for testing normalizeMarkdown()
 */

const markdownSamples = {
  // Basic formatting issues
  basicFormatting: {
    // List marker normalization
    bulletLists: {
      input: '• First item\n· Second item\n‧ Third item\n∙ Fourth item\n● Fifth item',
      expected: '- First item\n- Second item\n- Third item\n- Fourth item\n- Fifth item\n'
    },

    orderedLists: {
      input: '1） First step\n2． Second step\n3。 Third step\n4、 Fourth step',
      expected: '1. First step\n2. Second step\n3. Third step\n4. Fourth step\n'
    },

    mixedBullets: {
      input: 'Features: • Feature 1 • Feature 2 • Feature 3',
      expected: 'Features:\n- Feature 1\n- Feature 2\n- Feature 3\n'
    }
  },

  // HTML entity decoding
  htmlEntities: {
    commonEntities: {
      input: 'Text with &amp; &lt; &gt; &quot; &#39; entities',
      expected: 'Text with & < > " \' entities\n'
    },

    specialChars: {
      input: 'Special &nbsp; &mdash; &ndash; &hellip; characters',
      expected: 'Special   — – … characters\n'
    },

    quotes: {
      input: 'Quotes: &ldquo;smart quotes&rdquo; and &lsquo;apostrophes&rsquo;',
      expected: 'Quotes: "smart quotes" and \'apostrophes\'\n'
    },

    unicodeQuotes: {
      input: '\u201cSmart quotes\u201d and \u2018single quotes\u2019',
      expected: '"Smart quotes" and \'single quotes\'\n'
    }
  },

  // Line ending normalization
  lineEndings: {
    windows: {
      input: 'Line 1\r\nLine 2\r\nLine 3',
      expected: 'Line 1\nLine 2\nLine 3\n'
    },

    oldMac: {
      input: 'Line 1\rLine 2\rLine 3',
      expected: 'Line 1\nLine 2\nLine 3\n'
    },

    mixed: {
      input: 'Line 1\r\nLine 2\rLine 3\nLine 4',
      expected: 'Line 1\nLine 2\nLine 3\nLine 4\n'
    }
  },

  // Spacing and structure
  spacing: {
    headingSpacing: {
      input: 'Some text\n# Heading\nMore text',
      expected: 'Some text\n\n# Heading\n\nMore text\n'
    },

    listSpacing: {
      input: 'Text before\n- List item\n- Another item\nText after',
      expected: 'Text before\n\n- List item\n- Another item\n\nText after\n'
    },

    blockquoteSpacing: {
      input: 'Normal text\n> Quote text\n> More quote\nNormal again',
      expected: 'Normal text\n\n> Quote text\n> More quote\n\nNormal again\n'
    },

    excessiveSpacing: {
      input: 'Line 1\n\n\n\n\nLine 2',
      expected: 'Line 1\n\nLine 2\n'
    }
  },

  // Code block preservation
  codeBlocks: {
    fencedCode: {
      input: '```javascript\n• This should not be normalized\n&amp; Neither this\n```',
      expected: '```javascript\n• This should not be normalized\n&amp; Neither this\n```\n'
    },

    tildeCode: {
      input: '~~~python\n1） Order should stay\n• Bullets preserved\n~~~',
      expected: '~~~python\n1） Order should stay\n• Bullets preserved\n~~~\n'
    },

    codeWithSpacing: {
      input: 'Text before\n```\ncode content\n```\nText after',
      expected: 'Text before\n\n```\ncode content\n```\n\nText after\n'
    },

    nestedFences: {
      input: '```\nOuter code\n````\nNested fence\n````\nMore outer\n```',
      expected: '```\nOuter code\n````\nNested fence\n````\nMore outer\n```\n'
    }
  },

  // Table handling
  tables: {
    simpleTable: {
      input: 'Text\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\nMore text',
      expected: 'Text\n\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n\nMore text\n'
    },

    tableWithSpacing: {
      input: '| Header |\n|--------|\n| Cell   |\n\nNext paragraph',
      expected: '| Header |\n|--------|\n| Cell   |\n\nNext paragraph\n'
    }
  },

  // Complex scenarios
  complex: {
    mixedContent: {
      input: `# Heading&nbsp;with&nbsp;entities
• List • with • inline • bullets
\`\`\`
• Code with bullets &amp; entities
\`\`\`
> Quote &ldquo;with quotes&rdquo;`,
      expected: `# Heading with entities

- List
- with
- inline
- bullets

\`\`\`
• Code with bullets &amp; entities
\`\`\`

> Quote "with quotes"
`
    },

    documentStructure: {
      input: `Title text
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
Final paragraph.`,
      expected: `Title text

# Main Heading

Regular paragraph with & entities.

- List item 1
- List item 2

> Blockquote text

\`\`\`javascript
console.log("code");
\`\`\`

## Sub Heading

| Table | Header |
|-------|--------|
| Cell  | Data   |

Final paragraph.
`
    }
  },

  // Edge cases
  edgeCases: {
    emptyInput: {
      input: '',
      expected: ''
    },

    whitespaceOnly: {
      input: '   \n\n  \t  \n',
      expected: '\n'
    },

    invisibleChars: {
      input: '\u200B\u200C\u200DLine with invisible chars',
      expected: 'Line with invisible chars\n'
    },

    trailingWhitespace: {
      input: 'Line with spaces   \nAnother line\t\t\n',
      expected: 'Line with spaces\nAnother line\n'
    },

    leadingEmptyLines: {
      input: '\n\n\nFirst line\nSecond line',
      expected: 'First line\nSecond line\n'
    },

    onlyPunctuation: {
      input: '• • • • •',
      expected: '- \n- \n- \n- \n- \n'
    }
  },

  // Real-world problematic content
  realWorld: {
    copiedFromWeb: {
      input: 'Title\u00A0with\u00A0non-breaking\u00A0spaces\n• Feature\u00A01\u00A0•\u00A0Feature\u00A02\n\u201cSmart quotes\u201d everywhere',
      expected: 'Title with non-breaking spaces\n\n- Feature 1\n- Feature 2\n\n"Smart quotes" everywhere\n'
    },

    messyFormatting: {
      input: `\n\n\n   # Heading   \n\n\n• Item 1   \n   • Item 2\n\n\n\n> Quote\n\n\n   Regular text   \n\n\n`,
      expected: `# Heading

- Item 1
- Item 2

> Quote

Regular text
`
    },

    mixedListStyles: {
      input: `Different list styles:
• Bullet 1
· Bullet 2
1） Number 1
2． Number 2
3、 Number 3`,
      expected: `Different list styles:

- Bullet 1
- Bullet 2

1. Number 1
2. Number 2
3. Number 3
`
    }
  },

  // Performance test cases
  performance: {
    largeBulletList: {
      input: Array(1000).fill('• Item').join('\n'),
      expected: Array(1000).fill('- Item').join('\n') + '\n'
    },

    manyHeadings: {
      input: Array(100).fill('# Heading\n\nContent').join('\n\n'),
      expected: Array(100).fill('# Heading\n\nContent').join('\n\n') + '\n'
    },

    deepNesting: (() => {
      let input = '';
      let expected = '';
      for (let i = 0; i < 50; i++) {
        const indent = '  '.repeat(i);
        input += `${indent}• Level ${i} item\n`;
        expected += `${indent}- Level ${i} item\n`;
      }
      return { input, expected: expected + '\n' };
    })()
  }
};

// Test scenarios for various input combinations
const normalizationScenarios = {
  // Test with different fence types
  codeBlockVariations: [
    { fence: '```', language: 'javascript' },
    { fence: '~~~', language: 'python' },
    { fence: '````', language: 'markdown' },
    { fence: '`````', language: '' }
  ],

  // Test with different quote styles
  quoteVariations: [
    '"Standard quotes"',
    '\u201cSmart quotes\u201d',
    '\u2018Single quotes\u2019',
    '«French quotes»',
    '„German quotes"'
  ],

  // Test with different list indentations
  listIndentations: [
    { indent: '', marker: '•' },
    { indent: '  ', marker: '·' },
    { indent: '    ', marker: '‧' },
    { indent: '      ', marker: '∙' }
  ],

  // Test with different line ending combinations
  lineEndingCombinations: [
    '\n',      // Unix
    '\r\n',    // Windows
    '\r',      // Old Mac
    '\n\r'     // Weird mixed
  ]
};

module.exports = {
  markdownSamples,
  normalizationScenarios
};