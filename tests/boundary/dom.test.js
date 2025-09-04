/**
 * Boundary Condition Tests for Enhanced DOM Mocks
 * Tests specific edge cases that previously caused runtime issues in production
 */

const { 
  createMockDOMElement,
  getBoundaryConditionTestCases,
  createBoundaryConditionElements,
  setupDOMMocks,
  resetDOMMocks
} = require('../mocks/domMocks');

describe('DOM Boundary Condition Tests', () => {
  beforeEach(() => {
    setupDOMMocks();
  });

  afterEach(() => {
    resetDOMMocks();
  });

  describe('className property boundary conditions', () => {
    it('should handle className: null without throwing TypeError', () => {
      const element = createMockDOMElement('div', { className: null });
      
      expect(() => {
        // This should not throw "TypeError: node.className.toLowerCase is not a function"
        const hasClass = element.classList.contains('test-class');
        expect(hasClass).toBe(false);
      }).not.toThrow();
    });

    it('should handle className: undefined without throwing TypeError', () => {
      const element = createMockDOMElement('div', { className: undefined });
      
      expect(() => {
        const hasClass = element.classList.contains('test-class');
        expect(hasClass).toBe(false);
      }).not.toThrow();
    });

    it('should handle non-string className values gracefully', () => {
      const testCases = [
        { value: 123, description: 'number' },
        { value: [], description: 'array' },
        { value: {}, description: 'object' },
        { value: true, description: 'boolean' }
      ];

      testCases.forEach(({ value, description }) => {
        const element = createMockDOMElement('div', { className: value });
        
        expect(() => {
          const hasClass = element.classList.contains('test-class');
          expect(hasClass).toBe(false);
        }).not.toThrow();
      });
    });

    it('should handle valid className values correctly', () => {
      const element = createMockDOMElement('div', { className: 'test-class another-class' });
      
      expect(element.classList.contains('test-class')).toBe(true);
      expect(element.classList.contains('another-class')).toBe(true);
      expect(element.classList.contains('nonexistent-class')).toBe(false);
    });

    it('should handle empty className gracefully', () => {
      const element = createMockDOMElement('div', { className: '' });
      
      expect(element.classList.contains('test-class')).toBe(false);
      expect(element.className).toBe('');
    });
  });

  describe('DOM attribute boundary conditions', () => {
    it('should handle null attributes safely', () => {
      const element = createMockDOMElement('img', {
        src: null,
        alt: null,
        title: null
      });

      expect(element.getAttribute('src')).toBe(null);
      expect(element.getAttribute('alt')).toBe(null);
      expect(element.getAttribute('title')).toBe(null);
      expect(element.hasAttribute('src')).toBe(false);
    });

    it('should handle undefined attributes safely', () => {
      const element = createMockDOMElement('a', {
        href: undefined,
        title: undefined
      });

      expect(element.getAttribute('href')).toBe('');
      expect(element.getAttribute('title')).toBe('');
    });

    it('should handle setAttribute with boundary values', () => {
      const element = createMockDOMElement('div');

      expect(() => {
        element.setAttribute('class', null);
        element.setAttribute('id', undefined);
        element.setAttribute('data-test', '');
      }).not.toThrow();

      // After setting attributes, check they're handled safely
      expect(element.getAttribute('class')).toBe(null);
      expect(element.getAttribute('id')).toBe(undefined);
      expect(element.getAttribute('data-test')).toBe(null);
    });
  });

  describe('DOM content boundary conditions', () => {
    it('should handle null innerHTML and textContent', () => {
      const element = createMockDOMElement('div', {
        innerHTML: null,
        textContent: null
      });

      expect(element.innerHTML).toBe(null);
      expect(element.textContent).toBe(null);
    });

    it('should handle undefined innerHTML and textContent', () => {
      const element = createMockDOMElement('div', {
        innerHTML: undefined,
        textContent: undefined
      });

      expect(element.innerHTML).toBe('');
      expect(element.textContent).toBe('');
    });

    it('should handle empty content safely', () => {
      const element = createMockDOMElement('div', {
        innerHTML: '',
        textContent: ''
      });

      expect(element.innerHTML).toBe('');
      expect(element.textContent).toBe('');
    });
  });

  describe('TurndownService boundary conditions', () => {
    it('should handle null HTML input', () => {
      const TurndownService = global.TurndownService;
      const service = new TurndownService();

      expect(() => {
        const result = service.turndown(null);
        expect(result).toBe('');
      }).not.toThrow();
    });

    it('should handle undefined HTML input', () => {
      const TurndownService = global.TurndownService;
      const service = new TurndownService();

      expect(() => {
        const result = service.turndown(undefined);
        expect(result).toBe('');
      }).not.toThrow();
    });

    it('should handle non-string HTML input', () => {
      const TurndownService = global.TurndownService;
      const service = new TurndownService();

      const testCases = [123, [], {}, true];

      testCases.forEach(input => {
        expect(() => {
          const result = service.turndown(input);
          expect(typeof result).toBe('string');
        }).not.toThrow();
      });
    });
  });

  describe('Readability boundary conditions', () => {
    it('should handle null document input', () => {
      const Readability = global.Readability;
      const readability = new Readability(null);

      expect(() => {
        const result = readability.parse();
        expect(result.title).toBe('Test Article');
        expect(result.content).toBe('<p>Test content</p>');
      }).not.toThrow();
    });

    it('should handle undefined document input', () => {
      const Readability = global.Readability;
      const readability = new Readability(undefined);

      expect(() => {
        const result = readability.parse();
        expect(result.title).toBe('Test Article');
        expect(result.content).toBe('<p>Test content</p>');
      }).not.toThrow();
    });

    it('should handle document with missing properties', () => {
      const mockDoc = {};
      const Readability = global.Readability;
      const readability = new Readability(mockDoc);

      expect(() => {
        const result = readability.parse();
        expect(result.title).toBe('Test Article');
        expect(result.content).toBe('<p>Test content</p>');
      }).not.toThrow();
    });
  });

  describe('DOMParser boundary conditions', () => {
    it('should handle null HTML input', () => {
      const DOMParser = global.DOMParser;
      const parser = new DOMParser();

      expect(() => {
        const doc = parser.parseFromString(null, 'text/html');
        expect(doc).toBeDefined();
        expect(doc.documentElement).toBeDefined();
      }).not.toThrow();
    });

    it('should handle undefined HTML input', () => {
      const DOMParser = global.DOMParser;
      const parser = new DOMParser();

      expect(() => {
        const doc = parser.parseFromString(undefined, 'text/html');
        expect(doc).toBeDefined();
        expect(doc.documentElement).toBeDefined();
      }).not.toThrow();
    });

    it('should handle non-string HTML input', () => {
      const DOMParser = global.DOMParser;
      const parser = new DOMParser();

      const testCases = [123, [], {}, true];

      testCases.forEach(input => {
        expect(() => {
          const doc = parser.parseFromString(input, 'text/html');
          expect(doc).toBeDefined();
          expect(doc.documentElement).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  describe('Comprehensive boundary condition test suite', () => {
    it('should create all boundary condition test elements successfully', () => {
      const elements = createBoundaryConditionElements();
      
      expect(Object.keys(elements).length).toBeGreaterThan(0);
      
      Object.keys(elements).forEach(key => {
        const element = elements[key];
        expect(element).toBeDefined();
        expect(element.nodeName).toBe('DIV');
        
        // Test that classList.contains doesn't throw for any boundary condition
        expect(() => {
          element.classList.contains('test');
        }).not.toThrow();
      });
    });

    it('should provide comprehensive boundary condition test cases', () => {
      const testCases = getBoundaryConditionTestCases();
      
      expect(testCases.classNameCases).toBeDefined();
      expect(testCases.attributeCases).toBeDefined();
      expect(testCases.contentCases).toBeDefined();
      
      expect(testCases.classNameCases.length).toBeGreaterThan(5);
      expect(testCases.attributeCases.length).toBeGreaterThan(5);
      expect(testCases.contentCases.length).toBeGreaterThan(5);
    });
  });

  describe('Production issue prevention', () => {
    it('should prevent TypeError: node.className.toLowerCase is not a function', () => {
      const problematicElements = [
        createMockDOMElement('div', { className: null }),
        createMockDOMElement('span', { className: undefined }),
        createMockDOMElement('p', { className: 123 }),
        createMockDOMElement('a', { className: [] })
      ];

      problematicElements.forEach((element, index) => {
        expect(() => {
          // Simulate the real-world code that was failing
          const className = element.className;
          if (className && typeof className === 'string') {
            className.toLowerCase();
          }
          
          // Test classList operations
          element.classList.contains('test');
          element.classList.add('new-class');
        }).not.toThrow();
      });
    });

    it('should handle empty or malformed content gracefully', () => {
      const TurndownService = global.TurndownService;
      const service = new TurndownService();

      const problematicContent = [
        null,
        undefined,
        '',
        '<div></div>',
        '<p></p>',
        '<html><head></head><body></body></html>',
        'Just plain text',
        '<div><p>Nested <span>content</span></p></div>'
      ];

      problematicContent.forEach(content => {
        expect(() => {
          const result = service.turndown(content);
          expect(typeof result).toBe('string');
        }).not.toThrow();
      });
    });
  });
});
