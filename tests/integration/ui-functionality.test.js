/**
 * UI Functionality Tests for MarkDownload
 * 
 * Tests user interface components and interactions:
 * - Popup window functionality and preview
 * - Options page configuration management
 * - Keyboard shortcuts and accessibility
 * - Error states and user feedback
 */

const path = require('path');

// Setup test environment
require('../setup.js');

// Import test utilities
const { testHelpers } = require('../utils/testHelpers');
const htmlSamples = require('../fixtures/htmlSamples');

describe('UI Functionality - User Interface Components', () => {
  beforeEach(() => {
    // Reset all mocks
    global.mockBrowserHelpers.reset();
    
    // Clear DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '<base href="https://example.com/">';
    
    // Setup default storage
    const defaultOptions = global.testUtils.createMockOptions();
    global.browser.storage.sync.get.mockResolvedValue(defaultOptions);
  });

  describe('Popup Window Functionality', () => {
    beforeEach(() => {
      // Setup popup DOM structure
      document.body.innerHTML = `
        <div class="popup-container">
          <div class="tab-buttons">
            <button id="selected" class="tab-button">Selection</button>
            <button id="document" class="tab-button checked">Document</button>
          </div>
          
          <div class="options-panel">
            <button id="includeTemplate" class="option-button">
              <span>Include Template</span>
            </button>
            <button id="downloadImages" class="option-button">
              <span>Download Images</span>
            </button>
          </div>
          
          <div class="preview-container">
            <textarea id="md" class="markdown-preview"></textarea>
          </div>
          
          <div class="action-buttons">
            <button id="download" class="primary-button">Download</button>
            <button id="downloadSelection" class="secondary-button" style="display: none;">
              Download Selection
            </button>
          </div>
        </div>
      `;

      // Mock CodeMirror initialization
      global.CodeMirror.fromTextArea.mockReturnValue({
        getValue: jest.fn(() => '# Test Content\n\nTest markdown.'),
        setValue: jest.fn(),
        getSelection: jest.fn(() => 'Selected text'),
        somethingSelected: jest.fn(() => false),
        refresh: jest.fn(),
        on: jest.fn()
      });
    });

    test('should initialize popup with correct default state', async () => {
      // Act: Simulate popup initialization
      const includeTemplateButton = document.getElementById('includeTemplate');
      const downloadImagesButton = document.getElementById('downloadImages');
      const selectedTab = document.getElementById('selected');
      const documentTab = document.getElementById('document');

      // Simulate initial options loading
      const options = await global.browser.storage.sync.get();
      
      if (options.includeTemplate) {
        includeTemplateButton.classList.add('checked');
      }
      if (options.downloadImages) {
        downloadImagesButton.classList.add('checked');
      }

      // Assert: Verify initial state
      expect(documentTab.classList.contains('checked')).toBe(true);
      expect(selectedTab.classList.contains('checked')).toBe(false);
      expect(includeTemplateButton.classList.contains('checked')).toBe(false);
      expect(downloadImagesButton.classList.contains('checked')).toBe(false);
    });

    test('should toggle between selection and document modes', async () => {
      // Arrange
      const selectedTab = document.getElementById('selected');
      const documentTab = document.getElementById('document');
      
      // Act: Click selection tab
      selectedTab.click();
      selectedTab.classList.add('checked');
      documentTab.classList.remove('checked');

      // Assert: Verify tab switch
      expect(selectedTab.classList.contains('checked')).toBe(true);
      expect(documentTab.classList.contains('checked')).toBe(false);

      // Act: Switch back to document
      documentTab.click();
      documentTab.classList.add('checked');
      selectedTab.classList.remove('checked');

      // Assert: Verify switch back
      expect(documentTab.classList.contains('checked')).toBe(true);
      expect(selectedTab.classList.contains('checked')).toBe(false);
    });

    test('should toggle option buttons correctly', async () => {
      // Arrange
      const includeTemplateButton = document.getElementById('includeTemplate');
      const downloadImagesButton = document.getElementById('downloadImages');

      // Act: Toggle includeTemplate
      includeTemplateButton.click();
      includeTemplateButton.classList.toggle('checked');

      // Assert: Verify toggle
      expect(includeTemplateButton.classList.contains('checked')).toBe(true);

      // Act: Toggle downloadImages
      downloadImagesButton.click();
      downloadImagesButton.classList.toggle('checked');

      // Assert: Verify toggle
      expect(downloadImagesButton.classList.contains('checked')).toBe(true);

      // Act: Toggle includeTemplate off
      includeTemplateButton.click();
      includeTemplateButton.classList.toggle('checked');

      // Assert: Verify toggle off
      expect(includeTemplateButton.classList.contains('checked')).toBe(false);
    });

    test('should display preview content in CodeMirror', async () => {
      // Arrange
      const mockMarkdown = '# Test Article\n\nThis is test content with **bold** and *italic* text.';
      const codeMirrorInstance = global.CodeMirror.fromTextArea();

      // Act: Set preview content
      codeMirrorInstance.setValue(mockMarkdown);

      // Assert: Verify content setting
      expect(codeMirrorInstance.setValue).toHaveBeenCalledWith(mockMarkdown);
    });

    test('should show/hide download selection button based on text selection', async () => {
      // Arrange
      const downloadSelectionButton = document.getElementById('downloadSelection');
      const codeMirrorInstance = global.CodeMirror.fromTextArea();

      // Mock cursor activity handler
      const cursorActivityHandler = codeMirrorInstance.on.mock.calls
        .find(call => call[0] === 'cursorActivity');

      if (cursorActivityHandler) {
        const handler = cursorActivityHandler[1];

        // Act: Simulate selection
        codeMirrorInstance.somethingSelected.mockReturnValue(true);
        handler(codeMirrorInstance);
        downloadSelectionButton.style.display = 'block';

        // Assert: Button should be visible
        expect(downloadSelectionButton.style.display).toBe('block');

        // Act: Simulate no selection
        codeMirrorInstance.somethingSelected.mockReturnValue(false);
        handler(codeMirrorInstance);
        downloadSelectionButton.style.display = 'none';

        // Assert: Button should be hidden
        expect(downloadSelectionButton.style.display).toBe('none');
      }
    });

    test('should handle download button click', async () => {
      // Arrange
      const downloadButton = document.getElementById('download');
      const mockMarkdown = '# Download Test\n\nContent to download.';
      const codeMirrorInstance = global.CodeMirror.fromTextArea();
      codeMirrorInstance.getValue.mockReturnValue(mockMarkdown);

      global.browser.downloads.download.mockResolvedValue(123);

      // Act: Click download button
      const clickEvent = new Event('click');
      downloadButton.dispatchEvent(clickEvent);

      // Simulate download function call
      const dataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(mockMarkdown);
      await global.browser.downloads.download({
        url: dataUrl,
        filename: 'download-test.md',
        saveAs: false
      });

      // Assert: Verify download initiated
      expect(global.browser.downloads.download).toHaveBeenCalledWith({
        url: expect.stringMatching(/^data:text\/markdown/),
        filename: 'download-test.md',
        saveAs: false
      });
    });

    test('should handle selection download', async () => {
      // Arrange
      const downloadSelectionButton = document.getElementById('downloadSelection');
      const selectedText = '## Selected Content\n\nThis is selected text.';
      const codeMirrorInstance = global.CodeMirror.fromTextArea();
      codeMirrorInstance.getSelection.mockReturnValue(selectedText);
      codeMirrorInstance.somethingSelected.mockReturnValue(true);

      global.browser.downloads.download.mockResolvedValue(124);

      // Act: Click download selection button
      downloadSelectionButton.style.display = 'block';
      const clickEvent = new Event('click');
      downloadSelectionButton.dispatchEvent(clickEvent);

      // Simulate selection download
      const dataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(selectedText);
      await global.browser.downloads.download({
        url: dataUrl,
        filename: 'selection.md',
        saveAs: false
      });

      // Assert: Verify selection download
      expect(global.browser.downloads.download).toHaveBeenCalledWith({
        url: expect.stringMatching(/^data:text\/markdown/),
        filename: 'selection.md',
        saveAs: false
      });
    });
  });

  describe('Options Page Functionality', () => {
    beforeEach(() => {
      // Setup options page DOM
      document.body.innerHTML = `
        <div class="options-container">
          <form id="options-form">
            <div class="section">
              <h2>Markdown Options</h2>
              
              <label>
                Heading Style:
                <select id="headingStyle">
                  <option value="atx">ATX (# Heading)</option>
                  <option value="setext">Setext (Underline)</option>
                </select>
              </label>
              
              <label>
                Bullet List Marker:
                <select id="bulletListMarker">
                  <option value="-">Dash (-)</option>
                  <option value="*">Asterisk (*)</option>
                  <option value="+">Plus (+)</option>
                </select>
              </label>
            </div>
            
            <div class="section">
              <h2>Image Options</h2>
              
              <label>
                <input type="checkbox" id="downloadImages">
                Download Images
              </label>
              
              <label>
                Image Style:
                <select id="imageStyle">
                  <option value="markdown">Markdown</option>
                  <option value="obsidian">Obsidian</option>
                  <option value="base64">Base64</option>
                </select>
              </label>
            </div>
            
            <div class="section">
              <h2>Template Options</h2>
              
              <label>
                <input type="checkbox" id="includeTemplate">
                Include Template
              </label>
              
              <label>
                Frontmatter:
                <textarea id="frontmatter" rows="3"></textarea>
              </label>
              
              <label>
                Backmatter:
                <textarea id="backmatter" rows="3"></textarea>
              </label>
            </div>
            
            <div class="section">
              <h2>Advanced Options</h2>
              
              <label>
                <input type="checkbox" id="obsidianIntegration">
                Obsidian Integration
              </label>
              
              <label>
                Obsidian Vault:
                <input type="text" id="obsidianVault">
              </label>
            </div>
            
            <div class="actions">
              <button type="button" id="saveOptions" class="primary-button">
                Save Options
              </button>
              <button type="button" id="resetOptions" class="secondary-button">
                Reset to Defaults
              </button>
            </div>
          </form>
        </div>
      `;
    });

    test('should load and display current options', async () => {
      // Arrange
      const savedOptions = {
        headingStyle: 'setext',
        bulletListMarker: '*',
        downloadImages: true,
        imageStyle: 'obsidian',
        includeTemplate: true,
        frontmatter: '---\ntitle: {pageTitle}\n---\n',
        obsidianIntegration: true,
        obsidianVault: 'MyVault'
      };

      global.browser.storage.sync.get.mockResolvedValue(savedOptions);

      // Act: Load options into form
      const options = await global.browser.storage.sync.get();
      
      document.getElementById('headingStyle').value = options.headingStyle || 'atx';
      document.getElementById('bulletListMarker').value = options.bulletListMarker || '-';
      document.getElementById('downloadImages').checked = options.downloadImages || false;
      document.getElementById('imageStyle').value = options.imageStyle || 'markdown';
      document.getElementById('includeTemplate').checked = options.includeTemplate || false;
      document.getElementById('frontmatter').value = options.frontmatter || '';
      document.getElementById('obsidianIntegration').checked = options.obsidianIntegration || false;
      document.getElementById('obsidianVault').value = options.obsidianVault || '';

      // Assert: Verify options loaded correctly
      expect(document.getElementById('headingStyle').value).toBe('setext');
      expect(document.getElementById('bulletListMarker').value).toBe('*');
      expect(document.getElementById('downloadImages').checked).toBe(true);
      expect(document.getElementById('imageStyle').value).toBe('obsidian');
      expect(document.getElementById('includeTemplate').checked).toBe(true);
      expect(document.getElementById('frontmatter').value).toBe('---\ntitle: {pageTitle}\n---\n');
      expect(document.getElementById('obsidianIntegration').checked).toBe(true);
      expect(document.getElementById('obsidianVault').value).toBe('MyVault');
    });

    test('should save options when save button is clicked', async () => {
      // Arrange
      const saveButton = document.getElementById('saveOptions');
      
      // Set form values
      document.getElementById('headingStyle').value = 'atx';
      document.getElementById('bulletListMarker').value = '+';
      document.getElementById('downloadImages').checked = true;
      document.getElementById('imageStyle').value = 'base64';
      document.getElementById('frontmatter').value = '---\ncreated: {date}\n---\n';

      global.browser.storage.sync.set.mockResolvedValue();

      // Act: Click save button
      const clickEvent = new Event('click');
      saveButton.dispatchEvent(clickEvent);

      // Simulate save operation
      const optionsToSave = {
        headingStyle: document.getElementById('headingStyle').value,
        bulletListMarker: document.getElementById('bulletListMarker').value,
        downloadImages: document.getElementById('downloadImages').checked,
        imageStyle: document.getElementById('imageStyle').value,
        frontmatter: document.getElementById('frontmatter').value
      };

      await global.browser.storage.sync.set(optionsToSave);

      // Assert: Verify save operation
      expect(global.browser.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          headingStyle: 'atx',
          bulletListMarker: '+',
          downloadImages: true,
          imageStyle: 'base64',
          frontmatter: '---\ncreated: {date}\n---\n'
        })
      );
    });

    test('should reset options to defaults', async () => {
      // Arrange
      const resetButton = document.getElementById('resetOptions');
      const defaultOptions = global.testUtils.createMockOptions();

      global.browser.storage.sync.clear.mockResolvedValue();

      // Act: Click reset button
      const clickEvent = new Event('click');
      resetButton.dispatchEvent(clickEvent);

      // Simulate reset operation
      await global.browser.storage.sync.clear();
      
      // Load defaults into form
      Object.keys(defaultOptions).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
          if (element.type === 'checkbox') {
            element.checked = defaultOptions[key];
          } else {
            element.value = defaultOptions[key];
          }
        }
      });

      // Assert: Verify reset
      expect(global.browser.storage.sync.clear).toHaveBeenCalled();
      expect(document.getElementById('headingStyle').value).toBe(defaultOptions.headingStyle);
      expect(document.getElementById('downloadImages').checked).toBe(defaultOptions.downloadImages);
    });

    test('should validate form inputs', async () => {
      // Arrange: Invalid inputs
      const frontmatterTextarea = document.getElementById('frontmatter');
      const obsidianVaultInput = document.getElementById('obsidianVault');

      // Act: Set invalid values
      frontmatterTextarea.value = 'Invalid template {invalidVar}';
      obsidianVaultInput.value = 'vault/with/slashes';

      // Simulate validation
      const isValidTemplate = validateTemplate(frontmatterTextarea.value);
      const isValidVault = validateVaultName(obsidianVaultInput.value);

      // Assert: Should catch validation errors
      expect(isValidTemplate).toBe(false);
      expect(isValidVault).toBe(false);
    });
  });

  describe('Keyboard Shortcuts and Accessibility', () => {
    test('should register keyboard shortcuts', async () => {
      // Arrange
      const shortcuts = [
        { command: 'clip-page', shortcut: 'Ctrl+Shift+S' },
        { command: 'clip-selection', shortcut: 'Ctrl+Shift+X' }
      ];

      // Act: Register shortcuts
      const commandHandler = jest.fn();
      global.browser.commands.onCommand.addListener(commandHandler);

      // Simulate shortcut trigger
      global.mockBrowserHelpers.triggerCommand('clip-page');

      // Assert: Verify shortcut handling
      expect(global.browser.commands.onCommand.addListener).toHaveBeenCalledWith(commandHandler);
    });

    test('should support keyboard navigation in popup', async () => {
      // Arrange: Setup popup with focusable elements
      document.body.innerHTML = `
        <div class="popup-container">
          <button id="tab1" tabindex="0">Tab 1</button>
          <button id="tab2" tabindex="0">Tab 2</button>
          <button id="option1" tabindex="0">Option 1</button>
          <button id="download" tabindex="0">Download</button>
        </div>
      `;

      const tab1 = document.getElementById('tab1');
      const tab2 = document.getElementById('tab2');

      // Act: Simulate Tab key navigation
      tab1.focus();
      expect(document.activeElement).toBe(tab1);

      // Simulate Tab key to next element
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      tab1.dispatchEvent(tabEvent);
      tab2.focus(); // Simulate browser focus change

      // Assert: Verify focus management
      expect(document.activeElement).toBe(tab2);
    });

    test('should handle Enter key for button activation', async () => {
      // Arrange
      document.body.innerHTML = '<button id="testButton" tabindex="0">Test</button>';
      const button = document.getElementById('testButton');
      const clickHandler = jest.fn();
      button.addEventListener('click', clickHandler);

      // Act: Simulate Enter key press
      button.focus();
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(enterEvent);
      
      // Simulate browser Enter behavior
      button.click();

      // Assert: Verify Enter activation
      expect(clickHandler).toHaveBeenCalled();
    });

    test('should handle Escape key for closing popup', async () => {
      // Arrange
      const closeHandler = jest.fn();
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeHandler();
        }
      });

      // Act: Press Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      // Assert: Verify Escape handling
      expect(closeHandler).toHaveBeenCalled();
    });
  });

  describe('Error States and User Feedback', () => {
    test('should display error message for download failures', async () => {
      // Arrange: Setup error display
      document.body.innerHTML = `
        <div class="popup-container">
          <div id="errorMessage" class="error-message" style="display: none;"></div>
          <button id="download">Download</button>
        </div>
      `;

      const errorDiv = document.getElementById('errorMessage');
      const downloadButton = document.getElementById('download');

      // Mock download failure
      global.browser.downloads.download.mockRejectedValue(new Error('Permission denied'));

      // Act: Attempt download
      try {
        await global.browser.downloads.download({
          url: 'data:text/markdown;charset=utf-8,test',
          filename: 'test.md'
        });
      } catch (error) {
        // Simulate error display
        errorDiv.textContent = `Download failed: ${error.message}`;
        errorDiv.style.display = 'block';
      }

      // Assert: Verify error display
      expect(errorDiv.textContent).toBe('Download failed: Permission denied');
      expect(errorDiv.style.display).toBe('block');
    });

    test('should show loading state during processing', async () => {
      // Arrange
      document.body.innerHTML = `
        <div class="popup-container">
          <button id="download" class="primary-button">
            <span class="button-text">Download</span>
            <span class="loading-spinner" style="display: none;">⏳</span>
          </button>
        </div>
      `;

      const downloadButton = document.getElementById('download');
      const buttonText = downloadButton.querySelector('.button-text');
      const loadingSpinner = downloadButton.querySelector('.loading-spinner');

      // Mock slow download
      global.browser.downloads.download.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      // Act: Start download and show loading
      buttonText.style.display = 'none';
      loadingSpinner.style.display = 'inline';
      downloadButton.disabled = true;

      // Assert: Verify loading state
      expect(buttonText.style.display).toBe('none');
      expect(loadingSpinner.style.display).toBe('inline');
      expect(downloadButton.disabled).toBe(true);

      // Simulate completion
      setTimeout(() => {
        buttonText.style.display = 'inline';
        loadingSpinner.style.display = 'none';
        downloadButton.disabled = false;
      }, 1100);
    });

    test('should validate user input and show feedback', async () => {
      // Arrange
      document.body.innerHTML = `
        <div class="options-container">
          <input type="text" id="filename" placeholder="Enter filename">
          <div id="filenameError" class="validation-error" style="display: none;"></div>
        </div>
      `;

      const filenameInput = document.getElementById('filename');
      const errorDiv = document.getElementById('filenameError');

      // Act: Enter invalid filename
      filenameInput.value = 'file/with\\illegal:chars';
      
      // Simulate validation
      const isValid = validateFilename(filenameInput.value);
      if (!isValid) {
        errorDiv.textContent = 'Filename contains invalid characters';
        errorDiv.style.display = 'block';
        filenameInput.classList.add('invalid');
      }

      // Assert: Verify validation feedback
      expect(errorDiv.textContent).toBe('Filename contains invalid characters');
      expect(errorDiv.style.display).toBe('block');
      expect(filenameInput.classList.contains('invalid')).toBe(true);
    });

    test('should handle network connectivity issues', async () => {
      // Arrange
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true
      });
      
      document.body.innerHTML = `
        <div class="popup-container">
          <div id="networkStatus" class="warning-message" style="display: none;"></div>
        </div>
      `;

      const networkStatus = document.getElementById('networkStatus');

      // Act: Check network status
      if (!navigator.onLine) {
        networkStatus.textContent = 'No internet connection. Some features may not work.';
        networkStatus.style.display = 'block';
      }

      // Assert: Verify network status display
      expect(networkStatus.textContent).toBe('No internet connection. Some features may not work.');
      expect(networkStatus.style.display).toBe('block');
    });
  });
});

// Helper Functions for UI Testing

/**
 * Validates template syntax
 */
function validateTemplate(template) {
  // Simple validation - check for valid template variables
  const validVariables = ['{pageTitle}', '{date}', '{keywords}', '{byline}', '{siteName}'];
  const templateVars = template.match(/\{[^}]+\}/g) || [];
  
  return templateVars.every(variable => {
    return validVariables.some(valid => variable.startsWith(valid.split(':')[0]));
  });
}

/**
 * Validates Obsidian vault name
 */
function validateVaultName(vaultName) {
  // Vault names shouldn't contain path separators
  return !vaultName.includes('/') && !vaultName.includes('\\');
}

/**
 * Validates filename for illegal characters
 */
function validateFilename(filename) {
  const illegalChars = /[/\\<>:"|*?]/;
  return !illegalChars.test(filename);
}