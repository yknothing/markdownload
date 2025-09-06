/**
 * Browser API Factory Mock
 * Provides mocking for browser API factory functionality
 */

// Define instance first
const mockInstance = {
  createBrowserApi: jest.fn().mockReturnValue({
    storage: {
      sync: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(),
        remove: jest.fn().mockResolvedValue()
      },
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(),
        remove: jest.fn().mockResolvedValue()
      }
    },
    downloads: {
      download: jest.fn().mockResolvedValue(123),
      search: jest.fn().mockResolvedValue([]),
      cancel: jest.fn().mockResolvedValue()
    },
    tabs: {
      query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
      get: jest.fn().mockResolvedValue({ id: 1, url: 'https://example.com' }),
      getCurrent: jest.fn().mockResolvedValue({ id: 1, url: 'https://example.com' })
    },
    runtime: {
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
      getPlatformInfo: jest.fn().mockResolvedValue({ os: 'mac', arch: 'x86-64' }),
      getBrowserInfo: jest.fn().mockResolvedValue({ name: 'Chrome', version: '120.0.0.0' })
    }
  }),

  getBrowserApi: jest.fn().mockReturnValue({
    isAvailable: jest.fn().mockReturnValue(true),
    getVersion: jest.fn().mockReturnValue('120.0.0.0'),
    supportsManifestV3: jest.fn().mockReturnValue(true)
  })
};

const BrowserApiFactoryMock = {
  // Mock browser API factory instance
  instance: mockInstance,

  // Factory methods
  create: jest.fn().mockReturnValue(mockInstance),
  getInstance: jest.fn().mockReturnValue(mockInstance),

  // Mock error scenarios
  createWithError: jest.fn().mockImplementation(() => {
    throw new Error('Browser API Factory creation failed');
  }),

  // Reset mock state
  reset: jest.fn(() => {
    jest.clearAllMocks();
  })
};

module.exports = BrowserApiFactoryMock;
