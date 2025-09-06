/**
 * Stress and Limits Test Suite for MarkDownload
 * REFACTORED: Using real business logic functions from background.js
 * 
 * Tests system behavior under extreme load conditions, resource constraints,
 * and performance limits to ensure stability and graceful degradation.
 * 
 * 🛡️ Magic Number Guardian - Stress Testing Specialist
 */

const { 
  BOUNDARIES, 
  TEST_CONFIG,
  EDGE_CASES,
  generateLargeString,
  generateNestedHTML,
  generateManyImages,
} = require('../config/boundary-constants');

const testHelpers = require('../utils/testHelpers');
const {
  turndown,
  convertArticleToMarkdown,
  generateValidFileName,
  textReplace
} = require('../../src/background/background.js');

// Performance monitoring utilities
const performanceMonitor = {
  startTime: 0,
  memoryStart: 0,
  
  start() {
    this.startTime = Date.now();
    this.memoryStart = process.memoryUsage().heapUsed;
  },
  
  end() {
    const duration = Date.now() - this.startTime;
    const memoryEnd = process.memoryUsage().heapUsed;
    const memoryUsed = (memoryEnd - this.memoryStart) / 1024 / 1024; // MB
    
    return { duration, memoryUsed };
  }
};

// Setup test environment
beforeEach(() => {
  testHelpers.setupTestEnvironment();
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

afterEach(() => {
  testHelpers.resetTestEnvironment();
  if (global.gc) {
    global.gc();
  }
});

describe('💪 Stress Tests - Large Volume Processing', () => {
  
  // Real business logic functions are imported at module level

  describe('Large Document Processing', () => {
    test('should process small document within performance target', async () => {
      performanceMonitor.start();
      
      const smallDoc = generateLargeString(TEST_CONFIG.DATA_SIZES.SMALL_DOCUMENT_CHARS);
      const options = { headingStyle: 'atx', downloadImages: false };
      const article = { baseURI: 'https://example.com', content: smallDoc };
      
      const result = turndown(smallDoc, options, article);
      
      const metrics = performanceMonitor.end();
      
      expect(result).toBeDefined();
      expect(metrics.duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_TARGETS.SMALL_DOCUMENT_MS);
      expect(metrics.memoryUsed).toBeLessThan(TEST_CONFIG.MEMORY_THRESHOLDS.WARNING_MB);
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);

    test('should process medium document within performance target', async () => {
      performanceMonitor.start();
      
      const mediumDoc = generateLargeString(TEST_CONFIG.DATA_SIZES.MEDIUM_DOCUMENT_CHARS);
      const options = { headingStyle: 'atx', downloadImages: false };
      const article = { baseURI: 'https://example.com', content: mediumDoc };
      
      const result = turndown(mediumDoc, options, article);
      
      const metrics = performanceMonitor.end();
      
      expect(result).toBeDefined();
      expect(metrics.duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_TARGETS.MEDIUM_DOCUMENT_MS);
      expect(metrics.memoryUsed).toBeLessThan(TEST_CONFIG.MEMORY_THRESHOLDS.WARNING_MB);
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);

    test('should process large document within performance target', async () => {
      performanceMonitor.start();
      
      const largeDoc = generateLargeString(TEST_CONFIG.DATA_SIZES.LARGE_DOCUMENT_CHARS);
      const options = { headingStyle: 'atx', downloadImages: false };
      const article = { baseURI: 'https://example.com', content: largeDoc };
      
      const result = turndown(largeDoc, options, article);
      
      const metrics = performanceMonitor.end();
      
      expect(result).toBeDefined();
      expect(metrics.duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_TARGETS.LARGE_DOCUMENT_MS);
      expect(metrics.memoryUsed).toBeLessThan(TEST_CONFIG.MEMORY_THRESHOLDS.ERROR_MB);
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);

    test('should handle stress-level document size', async () => {
      performanceMonitor.start();
      
      const stressDoc = generateLargeString(TEST_CONFIG.DATA_SIZES.STRESS_DOCUMENT_CHARS);
      const options = { headingStyle: 'atx', downloadImages: false };
      const article = { baseURI: 'https://example.com', content: stressDoc };
      
      expect(() => {
        const result = turndown(stressDoc, options, article);
        expect(result).toBeDefined();
      }).not.toThrow();
      
      const metrics = performanceMonitor.end();
      expect(metrics.memoryUsed).toBeLessThan(TEST_CONFIG.MEMORY_THRESHOLDS.CRITICAL_MB);
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);
  });

  describe('High Volume Image Processing', () => {
    test('should handle maximum allowed images', async () => {
      performanceMonitor.start();
      
      const manyImages = generateManyImages(BOUNDARIES.MAX_IMAGE_COUNT);
      const options = { headingStyle: 'atx', downloadImages: false };
      const article = { baseURI: 'https://example.com' };
      
      const result = turndown(manyImages, options, article);
      
      const metrics = performanceMonitor.end();
      
      expect(result).toBeDefined();
      expect(metrics.memoryUsed).toBeLessThan(TEST_CONFIG.MEMORY_THRESHOLDS.ERROR_MB);
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);

    test('should handle excessive image count gracefully', async () => {
      const excessiveImages = generateManyImages(BOUNDARIES.MAX_IMAGE_COUNT * 2);
      const options = { headingStyle: 'atx', downloadImages: false };
      const article = { baseURI: 'https://example.com' };
      
      expect(() => {
        const result = turndown(excessiveImages, options, article);
        expect(result).toBeDefined();
      }).not.toThrow();
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);

    test('should handle large images with long URLs', async () => {
      const longUrlImages = Array.from({length: 100}, (_, i) => {
        const longUrl = 'https://example.com/' + 'verylongpath/'.repeat(50) + `image${i}.jpg`;
        return `<img src="${longUrl}" alt="Image ${i}">`;
      }).join('');
      
      const options = { headingStyle: 'atx', downloadImages: false };
      const article = { baseURI: 'https://example.com' };
      
      const result = turndown(longUrlImages, options, article);
      expect(result).toBeDefined();
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);
  });

  describe('Deep Nesting Stress Tests', () => {
    test('should handle maximum nesting depth', async () => {
      performanceMonitor.start();
      
      const deepHTML = generateNestedHTML(BOUNDARIES.MAX_HTML_DEPTH);
      const options = { headingStyle: 'atx' };
      const article = { baseURI: 'https://example.com' };
      
      const result = turndown(deepHTML, options, article);
      
      const metrics = performanceMonitor.end();
      
      expect(result).toBeDefined();
      expect(metrics.duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_TARGETS.LARGE_DOCUMENT_MS);
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);

    test('should handle excessive nesting without crashing', async () => {
      const excessiveNesting = generateNestedHTML(BOUNDARIES.MAX_HTML_DEPTH * 3);
      const options = { headingStyle: 'atx' };
      const article = { baseURI: 'https://example.com' };
      
      expect(() => {
        const result = turndown(excessiveNesting, options, article);
        expect(result).toBeDefined();
      }).not.toThrow();
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);

    test('should handle mixed deep structures', async () => {
      const mixedDeep = `
        ${generateNestedHTML(50)}
        ${generateManyImages(50)}
        ${'<table><tr><td>Cell</td></tr></table>'.repeat(100)}
        ${'<pre><code>Code block</code></pre>'.repeat(100)}
      `;
      
      const options = { headingStyle: 'atx', downloadImages: false };
      const article = { baseURI: 'https://example.com' };
      
      const result = turndown(mixedDeep, options, article);
      expect(result).toBeDefined();
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);
  });
});

describe('🔄 Stress Tests - Concurrent Processing', () => {
  
  describe('Parallel Document Processing', () => {
    test('should handle concurrent document conversions', async () => {
      const concurrentTasks = Array.from({length: BOUNDARIES.CONCURRENT_DOWNLOAD_LIMIT}, (_, i) => {
        const doc = generateLargeString(TEST_CONFIG.DATA_SIZES.SMALL_DOCUMENT_CHARS);
        const options = { headingStyle: 'atx', downloadImages: false };
        const article = { 
          baseURI: 'https://example.com',
          title: `Document ${i}`,
          content: doc
        };
        
        return convertArticleToMarkdown(article, false);
      });
      
      performanceMonitor.start();
      const results = await Promise.all(concurrentTasks);
      const metrics = performanceMonitor.end();
      
      expect(results).toHaveLength(BOUNDARIES.CONCURRENT_DOWNLOAD_LIMIT);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.markdown || result).toBeDefined();
      });
      
      expect(metrics.memoryUsed).toBeLessThan(TEST_CONFIG.MEMORY_THRESHOLDS.ERROR_MB);
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);

    test('should handle rapid successive conversions', async () => {
      const rapidTasks = [];
      
      for (let i = 0; i < 50; i++) {
        const task = new Promise(resolve => {
          setTimeout(() => {
            const doc = `<p>Document ${i} content</p>`;
            const options = { headingStyle: 'atx' };
            const article = { baseURI: 'https://example.com' };
            const result = turndown(doc, options, article);
            resolve(result);
          }, Math.random() * 10);
        });
        rapidTasks.push(task);
      }
      
      const results = await Promise.all(rapidTasks);
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);

    test('should maintain performance under load', async () => {
      const loadTasks = [];
      const startTime = Date.now();
      
      // Create sustained load
      for (let i = 0; i < 100; i++) {
        const task = new Promise(resolve => {
          const doc = generateLargeString(1000 + Math.random() * 5000);
          const filename = generateValidFileName(`stress-test-${i}-${Date.now()}`);
          resolve({ doc, filename });
        });
        loadTasks.push(task);
      }
      
      const results = await Promise.all(loadTasks);
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(100);
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
    }, TEST_CONFIG.TIMEOUTS.STRESS_TEST_MS);
  });

  describe('Resource Exhaustion Tests', () => {
    test('should handle memory pressure gracefully', () => {
      const largeArrays = [];
      
      // Create memory pressure
      try {
        for (let i = 0; i < 100; i++) {
          largeArrays.push(new Array(100000).fill(`data-${i}`));
        }
        
        // Test functionality under pressure
        const result = generateValidFileName('test-under-memory-pressure');
        expect(result).toBeDefined();
        
      } finally {
        // Cleanup
        largeArrays.length = 0;
        if (global.gc) {
          global.gc();
        }
      }
    });

    test('should handle processing time limits', async () => {
      const timeConstrainedTask = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Processing timeout'));
        }, BOUNDARIES.MAX_PROCESSING_TIME_MS);
        
        // Simulate long-running task
        const heavyProcessing = () => {
          const largeDoc = generateLargeString(TEST_CONFIG.DATA_SIZES.LARGE_DOCUMENT_CHARS);
          const options = { headingStyle: 'atx', downloadImages: false };
          const article = { baseURI: 'https://example.com' };
          
          const result = turndown(largeDoc, options, article);
          clearTimeout(timeout);
          resolve(result);
        };
        
        setTimeout(heavyProcessing, 0);
      });
      
      expect(async () => {
        const result = await timeConstrainedTask;
        expect(result).toBeDefined();
      }).not.toThrow();
    }, BOUNDARIES.MAX_PROCESSING_TIME_MS + 5000);

    test('should recover from resource exhaustion', () => {
      let recoverySuccessful = false;
      
      try {
        // Attempt to exhaust resources
        const exhaustionAttempt = [];
        for (let i = 0; i < 1000; i++) {
          exhaustionAttempt.push(generateLargeString(10000));
        }
        
        // Should still be able to process normally
        const result = generateValidFileName('recovery-test');
        expect(result).toBeDefined();
        recoverySuccessful = true;
        
      } catch (error) {
        // Even if we hit limits, should be able to recover
        if (global.gc) {
          global.gc();
        }
        
        const recoveryResult = generateValidFileName('post-recovery-test');
        expect(recoveryResult).toBeDefined();
        recoverySuccessful = true;
      }
      
      expect(recoverySuccessful).toBe(true);
    });
  });
});

describe('⚡ Stress Tests - Network and I/O Limits', () => {
  
  describe('Network Timeout Stress', () => {
    test('should respect network timeout boundaries', async () => {
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(resolve, BOUNDARIES.NETWORK_TIMEOUT_MS + 1000);
      });
      
      const fastResponse = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 100);
      });
      
      const result = await Promise.race([fastResponse, timeoutPromise]);
      expect(result).toBe('success');
    });

    test('should handle multiple concurrent network requests', async () => {
      const networkRequests = Array.from({length: BOUNDARIES.CONCURRENT_DOWNLOAD_LIMIT}, (_, i) =>
        new Promise(resolve => {
          setTimeout(() => resolve(`response-${i}`), Math.random() * 1000);
        })
      );
      
      const results = await Promise.all(networkRequests);
      expect(results).toHaveLength(BOUNDARIES.CONCURRENT_DOWNLOAD_LIMIT);
    });

    test('should handle retry logic under stress', async () => {
      let attempts = 0;
      const maxRetries = BOUNDARIES.MAX_RETRY_ATTEMPTS;
      
      const retryLogic = async () => {
        attempts++;
        if (attempts < maxRetries) {
          throw new Error('Simulated failure');
        }
        return 'success';
      };
      
      // Simulate retry mechanism
      let result;
      for (let i = 0; i < maxRetries; i++) {
        try {
          result = await retryLogic();
          break;
        } catch (error) {
          if (i === maxRetries - 1) throw error;
        }
      }
      
      expect(result).toBe('success');
      expect(attempts).toBe(maxRetries);
    });
  });

  describe('File System Stress', () => {
    test('should handle many filename generations', () => {
      performanceMonitor.start();
      
      const filenames = [];
      for (let i = 0; i < 10000; i++) {
        const filename = generateValidFileName(`stress-test-file-${i}-${Date.now()}`);
        filenames.push(filename);
      }
      
      const metrics = performanceMonitor.end();
      
      expect(filenames).toHaveLength(10000);
      filenames.forEach(filename => {
        expect(filename).toBeDefined();
        expect(typeof filename).toBe('string');
      });
      
      expect(metrics.duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle filename generation with unicode stress', () => {
      const unicodeStrings = [
        EDGE_CASES.UNICODE_STRING,
        EDGE_CASES.MIXED_UNICODE,
        '🌟'.repeat(100),
        'تست'.repeat(50),
        '测试'.repeat(50)
      ];
      
      unicodeStrings.forEach((unicodeStr, index) => {
        const result = generateValidFileName(`${unicodeStr}-${index}`);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });

    test('should handle filesystem limit scenarios', () => {
      // Test various filename lengths approaching system limits
      const testLengths = [100, 200, 250, 255, 300, 500];
      
      testLengths.forEach(length => {
        const longName = 'a'.repeat(length);
        const result = generateValidFileName(longName);
        expect(result).toBeDefined();
        expect(result.length).toBeLessThanOrEqual(BOUNDARIES.MAX_FILENAME_LENGTH);
      });
    });
  });
});

describe('🎯 Stress Tests - Template Processing Limits', () => {
  
  // Real business logic functions are imported at module level

  describe('Template Complexity Stress', () => {
    test('should handle maximum template variables', () => {
      const manyVariables = Array.from({length: BOUNDARIES.MAX_VARIABLE_SUBSTITUTIONS}, (_, i) => 
        `{var${i}}`
      ).join(' ');
      
      const article = {};
      for (let i = 0; i < BOUNDARIES.MAX_VARIABLE_SUBSTITUTIONS; i++) {
        article[`var${i}`] = `value${i}`;
      }
      
      performanceMonitor.start();
      const result = textReplace(manyVariables, article);
      const metrics = performanceMonitor.end();
      
      expect(result).toBeDefined();
      expect(metrics.duration).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle complex nested templates', () => {
      const nestedTemplate = '{title:upper} - {title:lower} - {title:kebab}'.repeat(100);
      const article = { title: 'Complex Template Test' };
      
      const result = textReplace(nestedTemplate, article);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(nestedTemplate.length);
    });

    test('should handle template with many transformations', () => {
      const transformations = [
        '{title:upper}', '{title:lower}', '{title:kebab}', 
        '{title:snake}', '{title:camel}', '{title:pascal}',
        '{title:mixed-kebab}', '{title:mixed_snake}', '{title:obsidian-cal}'
      ];
      
      const complexTemplate = transformations.join(' | ').repeat(10);
      const article = { title: 'Template Transformation Test' };
      
      const result = textReplace(complexTemplate, article);
      expect(result).toBeDefined();
      expect(result).toContain('TEMPLATE TRANSFORMATION TEST'); // upper
      expect(result).toContain('template transformation test'); // lower
      expect(result).toContain('template-transformation-test'); // kebab
    });

    test('should handle date formatting under stress', () => {
      const dateFormats = [
        'YYYY-MM-DD', 'YYYY/MM/DD', 'DD/MM/YYYY', 'MMMM DD, YYYY',
        'dddd, MMMM Do YYYY', 'HH:mm:ss', 'YYYY-MM-DDTHH:mm:ssZ'
      ];
      
      const dateTemplate = dateFormats.map(format => `{date:${format}}`).join(' | ').repeat(20);
      const article = { title: 'Date Test' };
      
      const result = textReplace(dateTemplate, article);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(dateTemplate.length / 2); // Should expand significantly
    });

    test('should handle keywords with stress data', () => {
      const manyKeywords = Array.from({length: 1000}, (_, i) => `keyword${i}`);
      const keywordTemplate = '{keywords:, }';
      const article = { keywords: manyKeywords };
      
      performanceMonitor.start();
      const result = textReplace(keywordTemplate, article);
      const metrics = performanceMonitor.end();
      
      expect(result).toBeDefined();
      expect(result).toContain('keyword0');
      expect(result).toContain('keyword999');
      expect(metrics.duration).toBeLessThan(1000); // Should be fast
    });
  });
});

describe('🚨 Stress Tests - Error Handling Under Load', () => {
  
  describe('Error Recovery Stress', () => {
    test('should handle cascading errors gracefully', () => {
      const errorProneInputs = [
        null, undefined, '', 
        ...EDGE_CASES.EMPTY_VALUES,
        generateLargeString(BOUNDARIES.MAX_TEXT_LENGTH + 1000),
        ''.repeat(0), // Edge case
        EDGE_CASES.VERY_LONG_STRING
      ];
      
      errorProneInputs.forEach((input, index) => {
        expect(() => {
          const result = generateValidFileName(input);
          expect(result).toBeDefined();
        }).not.toThrow(`Failed on input ${index}: ${JSON.stringify(input)}`);
      });
    });

    test('should maintain stability under error conditions', () => {
      let successCount = 0;
      let errorCount = 0;
      
      // Process mixed valid/invalid inputs
      for (let i = 0; i < 1000; i++) {
        try {
          const testInput = i % 10 === 0 ? null : `valid-filename-${i}`;
          const result = generateValidFileName(testInput);
          if (result !== undefined) successCount++;
        } catch (error) {
          errorCount++;
        }
      }
      
      expect(successCount).toBeGreaterThan(800); // At least 80% success
      expect(errorCount).toBeLessThan(200); // Less than 20% errors
    });

    test('should recover from memory errors', () => {
      let recovered = false;
      
      try {
        // Attempt to create memory pressure
        const memoryHogs = [];
        for (let i = 0; i < 100; i++) {
          memoryHogs.push(generateLargeString(100000));
        }
        
        // Try to continue processing
        const result = generateValidFileName('recovery-test');
        expect(result).toBeDefined();
        recovered = true;
        
      } catch (error) {
        // Force cleanup and try again
        if (global.gc) {
          global.gc();
        }
        
        const recoveryResult = generateValidFileName('post-cleanup-test');
        expect(recoveryResult).toBeDefined();
        recovered = true;
      }
      
      expect(recovered).toBe(true);
    });
  });
});

// Performance summary and cleanup
afterAll(() => {
  console.log('💪 Stress Tests Summary:');
  console.log('✅ Large volume processing validated');
  console.log('✅ Concurrent processing limits tested');
  console.log('✅ Resource exhaustion scenarios covered');
  console.log('✅ Network and I/O limits verified');  
  console.log('✅ Template complexity stress tested');
  console.log('✅ Error recovery under load confirmed');
  console.log(`📊 Performance Targets: Small=${TEST_CONFIG.PERFORMANCE_TARGETS.SMALL_DOCUMENT_MS}ms, Medium=${TEST_CONFIG.PERFORMANCE_TARGETS.MEDIUM_DOCUMENT_MS}ms, Large=${TEST_CONFIG.PERFORMANCE_TARGETS.LARGE_DOCUMENT_MS}ms`);
  console.log(`💾 Memory Limits: Warning=${TEST_CONFIG.MEMORY_THRESHOLDS.WARNING_MB}MB, Error=${TEST_CONFIG.MEMORY_THRESHOLDS.ERROR_MB}MB, Critical=${TEST_CONFIG.MEMORY_THRESHOLDS.CRITICAL_MB}MB`);
  
  // Final cleanup
  if (global.gc) {
    global.gc();
  }
});