/**
 * Unified Date Mocking Strategy
 * Provides consistent date/time handling across all tests
 * Replaces scattered moment mocks with centralized date provider
 */

const { DateProvider, createMomentMock } = require('../utils/testHelpers.js');

/**
 * Fixed test date for consistent testing
 */
const FIXED_TEST_DATE = new Date('2024-01-15T10:30:00Z');

/**
 * Default date provider for tests
 */
const defaultDateProvider = new DateProvider({
  fixedDate: FIXED_TEST_DATE,
  useFixed: true
});

/**
 * Standard format mappings for moment mock
 */
const STANDARD_FORMAT_MAP = {
  'YYYY': '2024',
  'MM': '01',
  'DD': '15',
  'HH': '10',
  'mm': '30',
  'ss': '00',
  'YYYY-MM-DD': '2024-01-15',
  'YYYY-MM-DDTHH:mm:ss': '2024-01-15T10:30:00',
  'dddd, MMMM Do YYYY': 'Monday, January 15th 2024',
  'MMMM YYYY': 'January 2024',
  'MMM D, YYYY': 'Jan 15, 2024',
  'MMM DD, YYYY': 'Jan 15, 2024',
  'ddd MMM DD YYYY': 'Mon Jan 15 2024',
  'YYYY/MM/DD': '2024/01/15',
  'MM/DD/YYYY': '01/15/2024',
  'DD-MM-YYYY': '15-01-2024',
  'DD/MM/YYYY': '15/01/2024'
};

/**
 * Creates a unified moment mock
 * @param {Object} options - Configuration options
 * @param {Object} options.customFormats - Custom format mappings
 * @param {Date} options.fixedDate - Custom fixed date
 * @returns {jest.Mock} Configured moment mock
 */
function createUnifiedMomentMock(options = {}) {
  const { customFormats = {}, fixedDate = FIXED_TEST_DATE } = options;
  
  const formatMap = {
    ...STANDARD_FORMAT_MAP,
    ...customFormats
  };

  const mockMoment = jest.fn();
  
  mockMoment.mockImplementation((dateInput) => {
    const date = dateInput ? new Date(dateInput) : fixedDate;
    
    return {
      format: jest.fn((fmt) => formatMap[fmt] || formatMap['YYYY-MM-DD']),
      toDate: () => date,
      valueOf: () => date.getTime(),
      toString: () => date.toString(),
      toISOString: () => date.toISOString(),
      unix: () => Math.floor(date.getTime() / 1000),
      isValid: () => !isNaN(date.getTime()),
      // Add common moment methods as needed
      add: jest.fn(() => mockMoment.mockImplementation()),
      subtract: jest.fn(() => mockMoment.mockImplementation()),
      clone: jest.fn(() => mockMoment(date))
    };
  });

  return mockMoment;
}

/**
 * Sets up unified date mocking for a test environment
 * Should be called in test setup
 */
function setupUnifiedDateMocks(options = {}) {
  const mockMoment = createUnifiedMomentMock(options);
  
  // Set global moment mock
  global.moment = mockMoment;
  
  // Mock native Date if requested
  if (options.mockNativeDate) {
    const OriginalDate = global.Date;
    global.Date = jest.fn(() => options.fixedDate || FIXED_TEST_DATE);
    global.Date.now = jest.fn(() => (options.fixedDate || FIXED_TEST_DATE).getTime());
    global.Date.UTC = OriginalDate.UTC;
    global.Date.parse = OriginalDate.parse;
    global.Date.prototype = OriginalDate.prototype;
  }
  
  return {
    mockMoment,
    dateProvider: defaultDateProvider,
    fixedDate: options.fixedDate || FIXED_TEST_DATE
  };
}

/**
 * Resets all date mocks
 * Should be called in test cleanup
 */
function resetDateMocks() {
  if (global.moment && jest.isMockFunction(global.moment)) {
    global.moment.mockReset();
  }
  
  jest.restoreAllMocks();
}

/**
 * Creates a moment mock that throws errors for testing error handling
 */
function createErrorMomentMock(errorMessage = 'Mock moment error') {
  const mockMoment = jest.fn();
  mockMoment.mockReturnValue({
    format: jest.fn(() => {
      throw new Error(errorMessage);
    })
  });
  return mockMoment;
}

/**
 * Pre-configured mock for common test scenarios
 */
const commonMockConfigurations = {
  // Standard configuration for most tests
  standard: {
    customFormats: STANDARD_FORMAT_MAP
  },
  
  // Configuration with different date
  pastDate: {
    fixedDate: new Date('2023-12-01T09:15:30Z'),
    customFormats: {
      'YYYY': '2023',
      'MM': '12',
      'DD': '01',
      'YYYY-MM-DD': '2023-12-01'
    }
  },
  
  // Configuration for error testing
  errorProne: {
    customFormats: {
      'INVALID': () => { throw new Error('Invalid format'); }
    }
  }
};

module.exports = {
  createUnifiedMomentMock,
  setupUnifiedDateMocks,
  resetDateMocks,
  createErrorMomentMock,
  commonMockConfigurations,
  defaultDateProvider,
  FIXED_TEST_DATE,
  STANDARD_FORMAT_MAP
};
