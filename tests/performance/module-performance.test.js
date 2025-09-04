/**
 * Performance tests for modular architecture
 * Measures module loading and execution performance
 */

// Mock the Service Worker environment
global.self = {
  addEventListener: jest.fn(),
  ErrorHandler: null,
  DOMPolyfill: null,
  ServiceWorkerInit: null
};

// Mock global objects
global.globalThis = {
  document: undefined,
  DOMParser: undefined,
  Node: undefined
};

// Load modules
const startLoadTime = Date.now();
require('../../src/background/core/error-handling.js');
require('../../src/background/polyfills/dom-polyfill.js');
require('../../src/background/core/initialization.js');
const endLoadTime = Date.now();

describe('Module Performance Tests', () => {

  test('Module loading performance should be acceptable', () => {
    const loadTime = endLoadTime - startLoadTime;

    console.log(`Module loading time: ${loadTime}ms`);

    // Should load within 1 second
    expect(loadTime).toBeLessThan(1000);

    // Should load within 500ms ideally
    expect(loadTime).toBeLessThan(500);
  });

  test('DOM operations should be performant', () => {
    const dom = global.self.DOMPolyfill;

    const startTime = Date.now();

    // Perform 1000 DOM operations
    for (let i = 0; i < 1000; i++) {
      const element = globalThis.document.createElement('div');
      element.innerHTML = `<p>Test content ${i}</p>`;
      element.textContent; // Trigger textContent computation
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`1000 DOM operations: ${duration}ms`);

    // Should complete within 2 seconds
    expect(duration).toBeLessThan(2000);

    // Should be reasonably fast (under 1 second ideally)
    expect(duration).toBeLessThan(1000);
  });

  test('Error handling should be performant', () => {
    const eh = global.self.ErrorHandler;

    const startTime = Date.now();

    // Log 1000 errors
    for (let i = 0; i < 1000; i++) {
      eh.logError(new Error(`Performance test error ${i}`), {
        iteration: i,
        timestamp: Date.now()
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`1000 error logs: ${duration}ms`);

    // Should complete within 1 second
    expect(duration).toBeLessThan(1000);

    // Should be very fast (under 500ms ideally)
    expect(duration).toBeLessThan(500);
  });

  test('Memory usage should be controlled', () => {
    const eh = global.self.ErrorHandler;

    // Clear existing errors
    eh.clearLog();

    // Log many errors to test memory limits
    for (let i = 0; i < 200; i++) {
      eh.logError(new Error(`Memory test ${i}`));
    }

    const stats = eh.getStats();

    // Should not exceed the configured limit (100)
    expect(stats.total).toBeLessThanOrEqual(100);

    // Should maintain performance with limited memory
    expect(stats.recent).toHaveLength(10); // Last 10 errors
  });

  test('Concurrent operations should be handled efficiently', async () => {
    const eh = global.self.ErrorHandler;
    const dom = global.self.DOMPolyfill;

    const startTime = Date.now();

    // Simulate concurrent operations
    const promises = [];

    for (let i = 0; i < 100; i++) {
      promises.push(
        Promise.resolve().then(() => {
          // DOM operation
          const element = globalThis.document.createElement('div');
          element.innerHTML = `<span>Concurrent test ${i}</span>`;

          // Error logging
          eh.logError(new Error(`Concurrent error ${i}`), {}, eh.CATEGORIES.DOM);

          return element.textContent;
        })
      );
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`100 concurrent operations: ${duration}ms`);

    // Should complete within 3 seconds
    expect(duration).toBeLessThan(3000);

    // All operations should succeed
    expect(results).toHaveLength(100);
    results.forEach(result => {
      expect(typeof result).toBe('string');
      expect(result).toMatch(/Concurrent test/);
    });
  });

  test('Module cleanup should be efficient', () => {
    const eh = global.self.ErrorHandler;

    // Fill error log
    for (let i = 0; i < 50; i++) {
      eh.logError(new Error(`Cleanup test ${i}`));
    }

    const startTime = Date.now();
    eh.clearLog();
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Error log cleanup: ${duration}ms`);

    // Cleanup should be very fast
    expect(duration).toBeLessThan(100);

    // Log should be empty
    const stats = eh.getStats();
    expect(stats.total).toBe(0);
  });

  test('Large HTML parsing should be performant', () => {
    const startTime = Date.now();

    // Generate large HTML content
    let htmlContent = '<div>';
    for (let i = 0; i < 100; i++) {
      htmlContent += `<article><h2>Article ${i}</h2><p>This is paragraph ${i} with some content.</p></article>`;
    }
    htmlContent += '</div>';

    const element = globalThis.document.createElement('div');
    element.innerHTML = htmlContent;

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Large HTML parsing (100 articles): ${duration}ms`);

    // Should complete within 1 second
    expect(duration).toBeLessThan(1000);

    // Should parse correctly
    expect(element.childNodes).toHaveLength(1);
    expect(element.firstChild.tagName).toBe('DIV');
    expect(element.firstChild.childNodes).toHaveLength(100);
  });
});
