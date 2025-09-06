/**
 * Browser API Mocks
 * Collection of browser API mocking utilities
 */

const BrowserApiMocks = {
  // Mock storage API
  storage: {
    sync: {
      get: jest.fn().mockImplementation((keys, callback) => {
        const mockData = {
          'markdownOptions': {
            includeImages: true,
            includeLinks: true,
            frontMatter: true
          },
          'downloadSettings': {
            autoDownload: false,
            filenameTemplate: '[title]-[date]'
          }
        };

        let result = {};
        if (typeof keys === 'string') {
          result[keys] = mockData[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (mockData[key]) result[key] = mockData[key];
          });
        } else {
          result = mockData;
        }

        if (callback) callback(result);
        return Promise.resolve(result);
      }),

      set: jest.fn().mockImplementation((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),

      remove: jest.fn().mockImplementation((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      })
    },

    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  },

  // Mock downloads API
  downloads: {
    download: jest.fn().mockImplementation((options) => {
      return Promise.resolve(Math.floor(Math.random() * 10000));
    }),

    search: jest.fn().mockResolvedValue([]),
    cancel: jest.fn().mockResolvedValue(),

    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },

  // Mock tabs API
  tabs: {
    query: jest.fn().mockResolvedValue([
      { id: 1, url: 'https://example.com', title: 'Test Page', active: true }
    ]),

    get: jest.fn().mockImplementation((tabId) => {
      return Promise.resolve({
        id: tabId,
        url: 'https://example.com',
        title: 'Test Page',
        active: true
      });
    }),

    getCurrent: jest.fn().mockResolvedValue({
      id: 1,
      url: 'https://example.com',
      title: 'Test Page',
      active: true
    }),

    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    executeScript: jest.fn().mockResolvedValue([{ result: 'mock result' }])
  },

  // Mock runtime API
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({ success: true }),

    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },

    getPlatformInfo: jest.fn().mockResolvedValue({
      os: 'mac',
      arch: 'x86-64'
    }),

    getBrowserInfo: jest.fn().mockResolvedValue({
      name: 'Chrome',
      version: '120.0.0.0'
    }),

    getManifest: jest.fn().mockReturnValue({
      manifest_version: 3,
      name: 'MarkDownload',
      version: '3.4.0'
    }),

    getURL: jest.fn().mockImplementation((path) => {
      return `chrome-extension://mock-extension-id/${path}`;
    })
  },

  // Mock context menus API
  contextMenus: {
    create: jest.fn().mockReturnValue('mock-menu-id'),
    update: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn(),

    onClicked: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },

  // Utility functions
  resetAllMocks: jest.fn(() => {
    Object.values(BrowserApiMocks).forEach(api => {
      if (typeof api === 'object' && api !== null) {
        Object.values(api).forEach(method => {
          if (method && typeof method.mockReset === 'function') {
            method.mockReset();
          }
        });
      }
    });
  }),

  // Mock error scenarios
  simulateApiError: jest.fn((api, method, error) => {
    const apiObj = BrowserApiMocks[api];
    if (apiObj && apiObj[method]) {
      apiObj[method].mockRejectedValueOnce(error);
    }
  }),

  simulateNetworkError: jest.fn(() => {
    BrowserApiMocks.runtime.sendMessage.mockRejectedValueOnce(
      new Error('Network error')
    );
  })
};

module.exports = BrowserApiMocks;
