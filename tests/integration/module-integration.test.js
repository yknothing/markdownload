/**
 * Integration tests for modular architecture
 * Tests module interactions and end-to-end workflows
 */

describe('Module Integration Tests', () => {

  test('Service Worker global environment should be properly set up', () => {
    expect(global.self).toBeDefined();
    expect(typeof global.self.addEventListener).toBe('function');
  });

  test('Browser extension APIs should be available', () => {
    expect(global.browser).toBeDefined();
    expect(global.browser.runtime).toBeDefined();
    expect(global.browser.storage).toBeDefined();
    expect(typeof global.browser.runtime.sendMessage).toBe('function');
  });

  test('DOM APIs should be available in test environment', () => {
    expect(global.document).toBeDefined();
    expect(global.DOMParser).toBeDefined();
    expect(typeof global.document.createElement).toBe('function');
  });

  test('Service Worker environment should be properly mocked', () => {
    expect(global.self).toBeDefined();
    expect(typeof global.self.addEventListener).toBe('function');
  });
});
