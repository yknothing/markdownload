
/**
 * Legacy Popup Script
 * NOTE: Not referenced by manifest.json in MV3 builds.
 * Kept for legacy/dev/testing. Production uses optimized-popup.*
 */

// Popup initialization with robust browser API handling
let browserAPIReady = false;
let browserAPI = null;

// Initialize browser API with fallback mechanisms
async function initializeBrowserAPI() {
  console.log('🔄 Initializing browser API in popup...');

  // Wait for browser API to be available
  if (typeof browser === 'undefined') {
    console.warn('⚠️ Browser API not immediately available, waiting...');

    // Wait for browser API to load (from Service Worker)
    for (let attempt = 1; attempt <= 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100));

      if (typeof browser !== 'undefined') {
        console.log('✅ Browser API loaded after delay');
        break;
      }

      if (attempt === 10) {
        console.error('❌ Browser API failed to load');
        showError('Extension failed to initialize. Please reload the extension.');
        return false;
      }
    }
  }

  // Apply MV3 Scripting API polyfill if needed
  if (typeof browser !== 'undefined' && !browser.scripting && typeof chrome !== 'undefined' && chrome.scripting) {
    browser.scripting = chrome.scripting;
    console.log("✅ Added scripting API polyfill to browser object in popup");
  }

  // Apply tabs.sendMessage polyfill if needed
  if (typeof browser !== 'undefined' && !browser.tabs && typeof chrome !== 'undefined' && chrome.tabs) {
    browser.tabs = chrome.tabs;
    console.log("✅ Added tabs API polyfill to browser object in popup");
  }

  browserAPI = browser;
  browserAPIReady = true;
  console.log('✅ Browser API initialization completed');
  return true;
}

// Check if extension is properly initialized
function checkExtensionHealth() {
  if (!browserAPIReady || !browserAPI) {
    console.error('❌ Browser API not ready');
    showError('Extension not properly loaded. Please reload the extension.');
    return false;
  }

  if (!browserAPI.runtime || !browserAPI.runtime.sendMessage) {
    console.error('❌ Runtime messaging not available');
    showError('Extension messaging not available. Please reload the extension.');
    return false;
  }

  console.log('✅ Extension health check passed');
  return true;
}

// Initialize extension
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 MarkDownload popup DOM content loaded');

  // Initialize browser API first
  const apiReady = await initializeBrowserAPI();
  if (!apiReady) {
    return;
  }

  // Then check extension health
  if (!checkExtensionHealth()) {
    return;
  }

  console.log('✅ Browser API ready, setting up popup functionality...');

  // NOW that browser API is ready, set up all browser-dependent functionality
  try {
    // Setup message listener
    browser.runtime.onMessage.addListener(notify);
    console.log('✅ Message listener registered');

    // Setup options and inject scripts
    await setupOptionsAndInjectScripts();
    
  } catch (error) {
    console.error('❌ Error setting up popup functionality:', error);
    showError('Failed to initialize popup. Please reload the extension.');
  }

  console.log('🚀 MarkDownload popup initialized successfully');
});

// default variables
var selectedText = null;
var imageList = null;
var mdClipsFolder = '';

const darkMode = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) || false;
// set up event handlers
const mdTextarea = document.getElementById("md");
const cm = mdTextarea ? CodeMirror.fromTextArea(mdTextarea, {
    theme: darkMode ? "xq-dark" : "xq-light",
    mode: "markdown",
    lineWrapping: true
}) : null;

if (cm) {
    cm.on("cursorActivity", (cm) => {
    const somethingSelected = cm.somethingSelected();
    var a = document.getElementById("downloadSelection");

    if (somethingSelected) {
        if(a.style.display != "block") a.style.display = "block";
    }
    else {
        if(a.style.display != "none") a.style.display = "none";
    }
});
} // close if (cm)

const downloadBtn = document.getElementById("download");
const downloadSelectionBtn = document.getElementById("downloadSelection");

if (downloadBtn) downloadBtn.addEventListener("click", download);
if (downloadSelectionBtn) downloadSelectionBtn.addEventListener("click", downloadSelection);

const defaultOptions = {
    includeTemplate: false,
    clipSelection: true,
    downloadImages: false
}

const checkInitialSettings = options => {
    if (options.includeTemplate)
        document.querySelector("#includeTemplate").classList.add("checked");

    if (options.downloadImages)
        document.querySelector("#downloadImages").classList.add("checked");

    if (options.clipSelection)
        document.querySelector("#selected").classList.add("checked");
    else
        document.querySelector("#document").classList.add("checked");
}

const toggleClipSelection = async (options) => {
    if (!browserAPIReady) {
        console.error('❌ Browser API not ready for toggleClipSelection');
        return;
    }
    
    try {
        options.clipSelection = !options.clipSelection;
        document.querySelector("#selected").classList.toggle("checked");
        document.querySelector("#document").classList.toggle("checked");
        
        await browser.storage.sync.set(options);
        
        // Get current tab for clipping
        const tabs = await browser.tabs.query({
            currentWindow: true,
            active: true
        });
        
        if (tabs && tabs.length > 0) {
            await clipSite(tabs[0].id);
        }
    } catch (error) {
        console.error('❌ Error in toggleClipSelection:', error);
        showError(error);
    }
}

const toggleIncludeTemplate = async (options) => {
    if (!browserAPIReady) {
        console.error('❌ Browser API not ready for toggleIncludeTemplate');
        return;
    }
    
    try {
        options.includeTemplate = !options.includeTemplate;
        document.querySelector("#includeTemplate").classList.toggle("checked");
        
        await browser.storage.sync.set(options);
        
        // Update context menus
        try {
            await browser.contextMenus.update("toggle-includeTemplate", {
                checked: options.includeTemplate
            });
        } catch (error) {
            console.warn('⚠️ Could not update main context menu:', error);
        }
        
        try {
            await browser.contextMenus.update("tabtoggle-includeTemplate", {
                checked: options.includeTemplate
            });
        } catch (error) {
            console.warn('⚠️ Could not update tab context menu:', error);
        }
        
        // Get current tab for clipping
        const tabs = await browser.tabs.query({
            currentWindow: true,
            active: true
        });
        
        if (tabs && tabs.length > 0) {
            await clipSite(tabs[0].id);
        }
    } catch (error) {
        console.error('❌ Error in toggleIncludeTemplate:', error);
        showError(error);
    }
}

const toggleDownloadImages = async (options) => {
    if (!browserAPIReady) {
        console.error('❌ Browser API not ready for toggleDownloadImages');
        return;
    }
    
    try {
        options.downloadImages = !options.downloadImages;
        document.querySelector("#downloadImages").classList.toggle("checked");
        
        await browser.storage.sync.set(options);
        
        // Update context menus
        try {
            await browser.contextMenus.update("toggle-downloadImages", {
                checked: options.downloadImages
            });
        } catch (error) {
            console.warn('⚠️ Could not update main context menu:', error);
        }
        
        try {
            await browser.contextMenus.update("tabtoggle-downloadImages", {
                checked: options.downloadImages
            });
        } catch (error) {
            console.warn('⚠️ Could not update tab context menu:', error);
        }
    } catch (error) {
        console.error('❌ Error in toggleDownloadImages:', error);
        showError(error);
    }
}
const showOrHideClipOption = selection => {
    if (selection) {
        document.getElementById("clipOption").style.display = "flex";
    }
    else {
        document.getElementById("clipOption").style.display = "none";
    }
}

const clipSite = async (id) => {
    if (!browserAPIReady) {
        console.error('❌ Browser API not ready for clipSite');
        return;
    }
    
        try {
        console.log(`🔄 Clipping site for tab ${id}...`);

        // Send message to content script to trigger content extraction
        console.log('📤 Sending trigger message to content script...');
        const result = await browser.tabs.sendMessage(id, {
            type: 'triggerContentExtraction',
            timestamp: Date.now()
        });

        console.log('📥 Received response from content script:', result);

        if (!result) {
            // Fallback if content script doesn't respond
            console.warn('⚠️ No response from content script, using direct execution...');
            const fallbackResult = await browser.scripting.executeScript({
                target: { tabId: id },
                func: () => {
                    const data = typeof getSelectionAndDom === 'function' ? getSelectionAndDom() : { dom: document.documentElement.outerHTML, selection: '' };
                    return { ...data, readability: null };
                }
            });

            if (fallbackResult && fallbackResult[0] && fallbackResult[0].result) {
                result = fallbackResult[0].result;
            }
        }

        if (result) {
            // Handle both direct result and wrapped result
            const actualResult = result.dom ? result : (result[0] && result[0].result ? result[0].result : null);

            if (actualResult) {
                showOrHideClipOption(actualResult.selection);

                // Enhance message with tab metadata for better extraction
                let tabInfo = null;
                try {
                    tabInfo = await browser.tabs.get(id);
                } catch (e) {
                    console.warn('⚠️ Unable to fetch tab info for clipSite:', e);
                }

                const message = {
                    type: "clip",
                    dom: actualResult.dom,
                    selection: actualResult.selection,
                    readability: actualResult.readability || null,
                    title: tabInfo?.title,
                    baseURI: tabInfo?.url
                };

                try {
                    // Get options from storage
                    const options = await browser.storage.sync.get(defaultOptions);

                    // Send message with options and handle response
                    const response = await browser.runtime.sendMessage({
                        ...message,
                        ...options
                    });

                    console.log('✅ Clip message sent successfully:', response);

                    // Handle service worker response
                    if (response && response.success) {
                        // Forward the response to the notify function
                        if (response.markdown || response.title) {
                            notify({
                                type: "display.md",
                                markdown: response.markdown,
                                title: response.title,
                                imageList: response.imageList || {},
                                mdClipsFolder: response.mdClipsFolder || ""
                            });
                        }
                    } else {
                        throw new Error(response?.error || 'Service worker returned unsuccessful response');
                    }
                } catch (error) {
                    console.warn('⚠️ Error getting options, using defaults:', error);

                    try {
                        // Fallback: send message with default options
                        const response = await browser.runtime.sendMessage({
                            ...message,
                            ...defaultOptions
                        });

                        // Handle fallback response
                        if (response && response.success) {
                            if (response.markdown || response.title) {
                                notify({
                                    type: "display.md",
                                    markdown: response.markdown,
                                    title: response.title,
                                    imageList: response.imageList || {},
                                    mdClipsFolder: response.mdClipsFolder || ""
                                });
                            }
                        } else {
                            throw new Error(response?.error || 'Service worker returned unsuccessful response');
                        }
                    } catch (fallbackError) {
                        console.error('❌ Both primary and fallback clip requests failed:', fallbackError);
                        throw fallbackError;
                    }
                }
            } else {
                console.warn('⚠️ No valid result from content script');
            }
        } else {
            console.warn('⚠️ No result from content script execution');
        }
    } catch (error) {
        console.error('❌ Error in clipSite:', error);
        showError(error);
    }
}

// Setup options and inject scripts (moved into DOMContentLoaded)
async function setupOptionsAndInjectScripts() {
    console.log('🔧 Setting up options and injecting scripts...');
    
    try {
        // Get options from storage
        const options = await browser.storage.sync.get(defaultOptions);
        console.log('✅ Options loaded:', options);
        
        // Setup initial settings
        checkInitialSettings(options);
        
        // Setup event listeners for option buttons
        const selectedBtn = document.getElementById("selected");
        if (selectedBtn) selectedBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            // Get fresh options from storage before toggling
            const currentOptions = await browser.storage.sync.get(defaultOptions);
            await toggleClipSelection(currentOptions);
        });
        
        const documentBtn = document.getElementById("document");
        if (documentBtn) documentBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            // Get fresh options from storage before toggling
            const currentOptions = await browser.storage.sync.get(defaultOptions);
            await toggleClipSelection(currentOptions);
        });
        
        const includeTemplateBtn = document.getElementById("includeTemplate");
        if (includeTemplateBtn) includeTemplateBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            // Get fresh options from storage before toggling
            const currentOptions = await browser.storage.sync.get(defaultOptions);
            await toggleIncludeTemplate(currentOptions);
        });
        
        const downloadImagesBtn = document.getElementById("downloadImages");
        if (downloadImagesBtn) downloadImagesBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            // Get fresh options from storage before toggling
            const currentOptions = await browser.storage.sync.get(defaultOptions);
            await toggleDownloadImages(currentOptions);
        });
        
        console.log('✅ Option button listeners registered');
        
        // Get current tab
        const tabs = await browser.tabs.query({
            currentWindow: true,
            active: true
        });
        
        if (!tabs || tabs.length === 0) {
            throw new Error('No active tab found');
        }
        
        const tabId = tabs[0].id;
        const tabUrl = tabs[0].url;
        
        console.log(`✅ Found active tab: ${tabId} - ${tabUrl}`);
        
        // Inject browser polyfill first
        await browser.scripting.executeScript({
            target: { tabId: tabId },
            files: ["/browser-polyfill.min.js"]
        });
        console.log('✅ Browser polyfill injected');
        
        // Inject Readability into the page context (so content script can use it)
        try {
            await browser.scripting.executeScript({
                target: { tabId: tabId },
                files: ["/background/Readability.js"]
            });
            console.log('✅ Readability injected into page');
        } catch (e) {
            console.warn('⚠️ Could not inject Readability into page:', e);
        }

        // Inject unified logger for content scripts (optional but useful for debugging)
        try {
            await browser.scripting.executeScript({
                target: { tabId: tabId },
                files: ["/shared/logger.js"]
            });
            console.log('✅ Logger injected into page');
        } catch (e) {
            console.warn('⚠️ Could not inject logger into page:', e);
        }

        // Content script is already injected via manifest.json
        console.log('✅ Content script already available via manifest');

        // Finally clip the site
        await clipSite(tabId);
        console.log('✅ Site clipping initiated');
        
    } catch (error) {
        console.error('❌ Error in setupOptionsAndInjectScripts:', error);
        showError(error);
        throw error;
    }
}

// Robust message sending with connection management
class PopupMessenger {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.connectionTimeout = 5000; // 5 seconds
        this.isConnected = false;
    }

    /**
     * Ensure connection to service worker
     */
    async ensureConnection() {
        if (this.isConnected) {
            return true;
        }

        console.log('🔗 Establishing connection to service worker...');

        try {
            // Test connection by sending a health check
            const response = await Promise.race([
                browser.runtime.sendMessage({ action: 'getHealthStatus' }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), this.connectionTimeout)
                )
            ]);

            if (response && response.success) {
                this.isConnected = true;
                console.log('✅ Connection to service worker established');
                return true;
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            console.error('❌ Failed to establish connection:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Send message with retry mechanism
     */
    async sendMessage(message) {
        // Ensure connection first
        const connected = await this.ensureConnection();
        if (!connected) {
            throw new Error('Cannot connect to service worker');
        }

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`📤 Sending message (attempt ${attempt}/${this.maxRetries}):`, message.action || message.type);

                const response = await browser.runtime.sendMessage(message);

                console.log('✅ Message sent successfully');
                return response;

            } catch (error) {
                console.error(`❌ Message attempt ${attempt} failed:`, error);

                if (attempt === this.maxRetries) {
                    // Final attempt failed
                    this.isConnected = false; // Reset connection status

                    // Show user-friendly error message
                    showError('Failed to communicate with extension. Please try reloading the extension.');

                    // Log detailed error for debugging
                    if (typeof browser !== 'undefined' && browser.runtime) {
                        console.log('🔍 Runtime info:', {
                            lastError: browser.runtime.lastError,
                            id: browser.runtime.id
                        });
                    }

                    throw error;
                }

                // Wait before retry with exponential backoff
                const delay = this.retryDelay * Math.pow(2, attempt - 1);
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));

                // Re-establish connection for retry
                this.isConnected = false;
                await this.ensureConnection();
            }
        }
    }
}

// Initialize messenger
const popupMessenger = new PopupMessenger();

// Enhanced download message sending function
async function sendDownloadMessage(text) {
    if (text == null) {
        return;
    }

    if (!browserAPIReady) {
        console.error('❌ Browser API not ready for sendDownloadMessage');
        showError('Extension not ready. Please try again.');
        return;
    }

    try {
        // Get current tab information
        const tabs = await browser.tabs.query({
            currentWindow: true,
            active: true
        });

        const message = {
            type: "download",
            markdown: text,
            title: document.getElementById("title").value || tabs[0]?.title || 'download',
            tab: tabs[0],
            imageList: imageList,
            mdClipsFolder: mdClipsFolder,
            includeTemplate: document.querySelector("#includeTemplate").classList.contains("checked"),
            downloadImages: document.querySelector("#downloadImages").classList.contains("checked"),
            clipSelection: document.querySelector("#selected").classList.contains("checked")
        };

        // Use robust messenger
        const response = await popupMessenger.sendMessage(message);

        console.log('✅ Download message processed successfully');
        return response;

    } catch (error) {
        console.error('❌ Failed to send download message:', error);

        // Error already handled by messenger, just re-throw
        throw error;
    }
}

// event handler for download button
async function download(e) {
    e.preventDefault();
    await sendDownloadMessage(cm ? cm.getValue() : '');
    window.close();
}

// event handler for download selected button
async function downloadSelection(e) {
    e.preventDefault();
    if (cm && cm.somethingSelected()) {
        await sendDownloadMessage(cm.getSelection());
    }
}

//function that handles messages from the injected script into the site
function notify(message) {
    // message for displaying markdown
    if (message.type == "display.md") {
        // CRITICAL FIX: Handle both success and error cases
        if (message.error) {
            // Show error message instead of markdown
            showError(message.error);
            return;
        }

        // CRITICAL FIX: Add null safety for message properties and CodeMirror instance
        if (message.markdown) {
            if (cm) cm.setValue(message.markdown);
        } else {
            if (cm) cm.setValue("No content available");
        }
        
        // CRITICAL FIX: Safe title access with fallback
        const title = message.title || (message.article && message.article.title) || "Untitled";
        document.getElementById("title").value = title;
        
        imageList = message.imageList || {};
        mdClipsFolder = message.mdClipsFolder || "";
        
        // show the hidden elements
        const container = document.getElementById("container");
        const spinner = document.getElementById("spinner");
        if (container) container.style.display = 'flex';
        if (spinner) spinner.style.display = 'none';
         // focus the download button
        const downloadBtnFocus = document.getElementById("download");
        if (downloadBtnFocus) downloadBtnFocus.focus();
        if (cm) cm.refresh();
    }
}

function showError(err) {
    // show the hidden elements
    const errorContainer = document.getElementById("container");
    const errorSpinner = document.getElementById("spinner");
    if (errorContainer) errorContainer.style.display = 'flex';
    if (errorSpinner) errorSpinner.style.display = 'none';
    if (cm) cm.setValue(`Error clipping the page\n\n${err}`);
}
