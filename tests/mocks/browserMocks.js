/**
 * Enhanced Browser API Mocks for MarkDownload Testing
 * 
 * This file provides comprehensive mocking of browser extension APIs
 * with realistic behavior patterns and error scenarios.
 */

// Import browser-polyfill for consistent API structure
require('jest-webextension-mock');

// Ensure global.browser is available immediately
if (!global.browser) {
  global.browser = {};
}

// Enhanced Chrome/Firefox Extension API Mock
const createExtensionApiMock = () => {
  const mockStorage = new Map();
  let downloadId = 1000;
  const activeDownloads = new Map();
  
  return {
    // Runtime API with enhanced messaging
    runtime: {
      id: 'mock-extension-id',
      
      // Message passing system
      sendMessage: jest.fn().mockImplementation((extensionId, message, options, callback) => {
        // Simulate async message handling
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (typeof extensionId === 'object') {
              // sendMessage(message, callback) format
              message = extensionId;
              callback = options;
            }
            
            // Mock response based on message type
            let response;
            switch (message?.action) {
              case 'convertPage':
                response = { success: true, markdown: '# Test Content' };
                break;
              case 'getOptions':
                response = mockStorage.get('options') || {};
                break;
              case 'downloadMarkdown':
                response = { success: true, downloadId: downloadId++ };
                break;
              default:
                response = { success: true };
            }
            
            if (callback) callback(response);
            resolve(response);
          }, 10);
        });
      }),
      
      // Event listeners
      onMessage: {
        addListener: jest.fn((callback) => {
          // Store callback for potential triggering in tests
          if (!global.mockMessageListeners) {
            global.mockMessageListeners = [];
          }
          global.mockMessageListeners.push(callback);
        }),
        removeListener: jest.fn(),
        hasListener: jest.fn(() => true)
      },
      
      // Platform and browser info
      getPlatformInfo: jest.fn().mockResolvedValue({
        os: 'mac',
        arch: 'x86-64',
        nacl_arch: 'x86-64'
      }),
      
      getBrowserInfo: jest.fn().mockResolvedValue({
        name: 'Chrome',
        version: '120.0.0.0',
        buildID: 'mock-build-id'
      }),
      
      // Manifest and URL handling
      getManifest: jest.fn(() => ({
        manifest_version: 3,
        name: 'MarkDownload',
        version: '3.4.0',
        permissions: ['downloads', 'storage', 'activeTab']
      })),
      
      getURL: jest.fn((path) => `chrome-extension://mock-extension-id/${path}`),
      
      // Error handling
      lastError: null,
      setLastError: (error) => {
        global.browser.runtime.lastError = error;
      }
    },

    // Enhanced Downloads API
    downloads: {
      download: jest.fn().mockImplementation((options, callback) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const downloadId = downloadId++;
            const downloadItem = {
              id: downloadId,
              url: options.url,
              filename: options.filename,
              state: 'in_progress',
              paused: false,
              error: null,
              bytesReceived: 0,
              totalBytes: options.url.startsWith('data:') ? 
                Math.floor(options.url.length * 0.75) : 1024
            };
            
            activeDownloads.set(downloadId, downloadItem);
            
            // Simulate download completion
            setTimeout(() => {
              downloadItem.state = 'complete';
              downloadItem.bytesReceived = downloadItem.totalBytes;
              
              // Trigger onChanged event
              if (global.mockDownloadListeners) {
                global.mockDownloadListeners.forEach(listener => {
                  listener({
                    id: downloadId,
                    state: { current: 'complete', previous: 'in_progress' }
                  });
                });
              }
            }, 50);
            
            if (callback) callback(downloadId);
            resolve(downloadId);
          }, 10);
        });
      }),
      
      search: jest.fn().mockImplementation((query, callback) => {
        const results = Array.from(activeDownloads.values())
          .filter(item => !query.id || item.id === query.id)
          .filter(item => !query.state || item.state === query.state);
        
        if (callback) callback(results);
        return Promise.resolve(results);
      }),
      
      cancel: jest.fn().mockImplementation((downloadId, callback) => {
        const item = activeDownloads.get(downloadId);
        if (item) {
          item.state = 'cancelled';
          item.error = 'USER_CANCELED';
        }
        
        if (callback) callback();
        return Promise.resolve();
      }),
      
      // Event listeners
      onChanged: {
        addListener: jest.fn((callback) => {
          if (!global.mockDownloadListeners) {
            global.mockDownloadListeners = [];
          }
          global.mockDownloadListeners.push(callback);
        }),
        removeListener: jest.fn(),
        hasListener: jest.fn(() => true)
      },
      
      onCreated: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },

    // Enhanced Storage API with realistic behavior
    storage: {
      sync: {
        get: jest.fn().mockImplementation((keys, callback) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              let result = {};
              
              if (keys === null || keys === undefined) {
                // Return all stored data
                result = Object.fromEntries(mockStorage);
              } else if (typeof keys === 'string') {
                // Single key
                if (mockStorage.has(keys)) {
                  result[keys] = mockStorage.get(keys);
                }
              } else if (Array.isArray(keys)) {
                // Array of keys
                keys.forEach(key => {
                  if (mockStorage.has(key)) {
                    result[key] = mockStorage.get(key);
                  }
                });
              } else if (typeof keys === 'object') {
                // Object with default values
                Object.keys(keys).forEach(key => {
                  result[key] = mockStorage.has(key) ? mockStorage.get(key) : keys[key];
                });
              }
              
              if (callback) callback(result);
              resolve(result);
            }, 5);
          });
        }),
        
        set: jest.fn().mockImplementation((items, callback) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              Object.keys(items).forEach(key => {
                mockStorage.set(key, items[key]);
              });
              
              if (callback) callback();
              resolve();
            }, 5);
          });
        }),
        
        remove: jest.fn().mockImplementation((keys, callback) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              if (typeof keys === 'string') {
                mockStorage.delete(keys);
              } else if (Array.isArray(keys)) {
                keys.forEach(key => mockStorage.delete(key));
              }
              
              if (callback) callback();
              resolve();
            }, 5);
          });
        }),
        
        clear: jest.fn().mockImplementation((callback) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              mockStorage.clear();
              if (callback) callback();
              resolve();
            }, 5);
          });
        }),
        
        // Storage change events
        onChanged: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      
      local: {
        // Local storage with larger quota
        get: jest.fn().mockImplementation(function(...args) {
          return this.sync.get.apply(this, args);
        }),
        set: jest.fn().mockImplementation(function(...args) {
          return this.sync.set.apply(this, args);
        }),
        remove: jest.fn().mockImplementation(function(...args) {
          return this.sync.remove.apply(this, args);
        }),
        clear: jest.fn().mockImplementation(function(...args) {
          return this.sync.clear.apply(this, args);
        })
      }
    },

    // Context Menus API
    contextMenus: {
      create: jest.fn().mockImplementation((createProperties, callback) => {
        const menuId = createProperties.id || `menu-${Date.now()}`;
        
        setTimeout(() => {
          if (callback) callback();
        }, 1);
        
        return menuId;
      }),
      
      update: jest.fn().mockImplementation((id, updateProperties, callback) => {
        setTimeout(() => {
          if (callback) callback();
        }, 1);
      }),
      
      remove: jest.fn().mockImplementation((menuItemId, callback) => {
        setTimeout(() => {
          if (callback) callback();
        }, 1);
      }),
      
      removeAll: jest.fn().mockImplementation((callback) => {
        setTimeout(() => {
          if (callback) callback();
        }, 1);
      }),
      
      onClicked: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },

    // Enhanced Tabs API
    tabs: {
      query: jest.fn().mockImplementation((queryInfo, callback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const mockTabs = [
              {
                id: 1,
                windowId: 1,
                index: 0,
                url: 'https://example.com/test',
                title: 'Test Page',
                active: queryInfo.active !== false,
                highlighted: true,
                pinned: false,
                audible: false,
                discarded: false,
                autoDiscardable: true,
                mutedInfo: { muted: false },
                incognito: false,
                width: 1200,
                height: 800,
                status: 'complete'
              }
            ];
            
            const result = mockTabs.filter(tab => {
              if (queryInfo.active !== undefined && tab.active !== queryInfo.active) return false;
              if (queryInfo.currentWindow !== undefined && queryInfo.currentWindow !== tab.windowId === 1) return false;
              if (queryInfo.url && !tab.url.includes(queryInfo.url)) return false;
              return true;
            });
            
            if (callback) callback(result);
            resolve(result);
          }, 10);
        });
      }),
      
      get: jest.fn().mockImplementation((tabId, callback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const tab = {
              id: tabId,
              url: 'https://example.com/test',
              title: 'Test Page',
              active: true,
              status: 'complete'
            };
            
            if (callback) callback(tab);
            resolve(tab);
          }, 10);
        });
      }),
      
      getCurrent: jest.fn().mockImplementation((callback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const currentTab = {
              id: 1,
              url: 'https://example.com/test',
              title: 'Test Page',
              active: true
            };
            
            if (callback) callback(currentTab);
            resolve(currentTab);
          }, 10);
        });
      }),
      
      sendMessage: jest.fn().mockImplementation((tabId, message, options, callback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const response = { success: true, tabId };
            
            if (callback) callback(response);
            resolve(response);
          }, 10);
        });
      }),
      
      executeScript: jest.fn().mockImplementation((tabId, details, callback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const results = [{ result: 'mock-script-result' }];
            
            if (callback) callback(results);
            resolve(results);
          }, 20);
        });
      })
    },

    // Scripting API (Manifest V3)
    scripting: {
      executeScript: jest.fn().mockImplementation((injection, callback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            // Create execution context with navigator and other browser APIs
            const executionContext = {
              navigator: global.navigator,
              window: global.window,
              document: global.document,
              console: global.console
            };

            let result;
            try {
              if (injection.func) {
                // Bind the function to the execution context
                const boundFunc = injection.func.bind(executionContext);
                result = boundFunc(...(injection.args || []));
              } else {
                result = 'mock-result';
              }
            } catch (error) {
              console.error('Script execution error:', error);
              result = undefined;
            }

            const results = [{
              result: result,
              frameId: injection.target?.frameId || 0
            }];

            if (callback) callback(results);
            resolve(results);
          }, 20);
        });
      }),
      
      insertCSS: jest.fn().mockImplementation((injection, callback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            if (callback) callback();
            resolve();
          }, 10);
        });
      }),
      
      removeCSS: jest.fn().mockImplementation((injection, callback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            if (callback) callback();
            resolve();
          }, 10);
        });
      })
    },

    // Commands API (Keyboard shortcuts)
    commands: {
      onCommand: {
        addListener: jest.fn((callback) => {
          if (!global.mockCommandListeners) {
            global.mockCommandListeners = [];
          }
          global.mockCommandListeners.push(callback);
        }),
        removeListener: jest.fn()
      }
    },

    // Action API (Manifest V3 replacement for browserAction)
    action: {
      setTitle: jest.fn().mockResolvedValue(undefined),
      getTitle: jest.fn().mockResolvedValue('MarkDownload'),
      setIcon: jest.fn().mockResolvedValue(undefined),
      setPopup: jest.fn().mockResolvedValue(undefined),
      getPopup: jest.fn().mockResolvedValue('popup/popup.html'),
      setBadgeText: jest.fn().mockResolvedValue(undefined),
      getBadgeText: jest.fn().mockResolvedValue(''),
      setBadgeBackgroundColor: jest.fn().mockResolvedValue(undefined),
      onClicked: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },

    // Permissions API
    permissions: {
      contains: jest.fn().mockImplementation((permissions, callback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            // Grant all requested permissions for testing
            const result = true;
            if (callback) callback(result);
            resolve(result);
          }, 5);
        });
      }),
      
      request: jest.fn().mockImplementation((permissions, callback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            // Grant permission requests for testing
            const granted = true;
            if (callback) callback(granted);
            resolve(granted);
          }, 10);
        });
      })
    }
  };
};

// Create and assign the mock
const browserMock = createExtensionApiMock();

// Support both chrome and browser namespaces
global.chrome = browserMock;
global.browser = browserMock;

// Utility functions for test control
global.mockBrowserHelpers = {
  // Reset all mocks to initial state
  reset: () => {
    Object.values(browserMock).forEach(api => {
      if (api && typeof api === 'object') {
        Object.values(api).forEach(method => {
          if (method && method.mockReset) {
            method.mockReset();
          }
        });
      }
    });
    
    // Clear event listeners
    global.mockMessageListeners = [];
    global.mockDownloadListeners = [];
    global.mockCommandListeners = [];
  },
  
  // Simulate extension message
  triggerMessage: (message, sender = {}) => {
    if (global.mockMessageListeners) {
      global.mockMessageListeners.forEach(listener => {
        listener(message, sender, () => {});
      });
    }
  },
  
  // Simulate download state change
  triggerDownloadChange: (downloadId, changes) => {
    if (global.mockDownloadListeners) {
      global.mockDownloadListeners.forEach(listener => {
        listener({ id: downloadId, ...changes });
      });
    }
  },
  
  // Simulate command trigger
  triggerCommand: (command) => {
    if (global.mockCommandListeners) {
      global.mockCommandListeners.forEach(listener => {
        listener(command);
      });
    }
  }
};

module.exports = browserMock;