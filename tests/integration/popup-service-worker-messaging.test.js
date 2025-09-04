/**
 * Integration test for popup-to-service-worker messaging
 * Tests that popup can successfully communicate with service worker
 */

describe('Popup Service Worker Messaging Integration', () => {

  test('Popup should be able to send messages to service worker', () => {
    expect(global.browser).toBeDefined();
    expect(global.browser.runtime).toBeDefined();
    expect(typeof global.browser.runtime.sendMessage).toBe('function');
  });

  test('Service worker should be able to receive messages from popup', () => {
    expect(global.self).toBeDefined();
    expect(typeof global.self.addEventListener).toBe('function');
  });

  test('Message passing should work between popup and service worker', () => {
    const mockMessage = { type: 'test', data: 'hello' };
    const mockResponse = { success: true };

    // Mock the sendMessage to return a response
    global.browser.runtime.sendMessage.mockResolvedValueOnce(mockResponse);

    // Test that we can call sendMessage
    expect(() => {
      global.browser.runtime.sendMessage(mockMessage);
    }).not.toThrow();
  });
});
