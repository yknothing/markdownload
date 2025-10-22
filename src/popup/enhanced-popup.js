/**
 * Enhanced MarkDownload Popup Script
 *
 * NOTE: Not referenced by manifest.json. Kept for experiments/dev.
 * The runtime popup is optimized-popup.html/js.
 */

console.log('🚀 MarkDownload Enhanced Popup: Loading...');

// ============================================================================
// CONFIGURATION AND STATE
// ============================================================================

let browserAPIReady = false;
let serviceWorkerReady = false;

// defaultOptions is already loaded from the imported script
// No need to redeclare it

// ============================================================================
// SERVICE WORKER COMMUNICATION
// ============================================================================

class ServiceWorkerCommunicator {
    constructor() {
        this.isReady = false;
        this.messageQueue = [];
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }
    
    async initialize() {
        try {
            console.log('🔌 Testing service worker connection...');
            
            const response = await this.sendMessage({
                type: 'health-check',
                timestamp: Date.now()
            });
            
            if (response && response.success) {
                this.isReady = true;
                serviceWorkerReady = true;
                console.log('✅ Service worker connection established');
                return true;
            } else {
                throw new Error('Service worker health check failed');
            }
        } catch (error) {
            console.error('❌ Service worker initialization failed:', error);
            this.isReady = false;
            serviceWorkerReady = false;
            return false;
        }
    }
    
    async sendMessage(message, retryCount = 0) {
        try {
            console.log(`📤 Sending message: ${message.type}`);
            
            const response = await browser.runtime.sendMessage(message);
            
            if (response) {
                console.log(`📥 Received response: ${message.type}`, response.success ? '✅' : '❌');
                return response;
            } else {
                throw new Error('No response from service worker');
            }
            
        } catch (error) {
            console.error(`❌ Message failed (attempt ${retryCount + 1}):`, error);
            
            if (retryCount < this.retryAttempts) {
                console.log(`🔄 Retrying in ${this.retryDelay}ms...`);
                await this.delay(this.retryDelay * (retryCount + 1));
                return await this.sendMessage(message, retryCount + 1);
            } else {
                throw error;
            }
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const swCommunicator = new ServiceWorkerCommunicator();

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================

class ContentExtractor {
    async extractFromCurrentTab() {
        try {
            console.log('📋 Extracting content from current tab...');
            
            // Get current active tab
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            const currentTab = tabs[0];
            
            if (!currentTab) {
                throw new Error('No active tab found');
            }
            
            console.log(`📄 Extracting from: ${currentTab.title} (${currentTab.url})`);
            
            // Extract DOM content using scripting API
            const results = await browser.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: () => {
                    try {
                        // Get the full document HTML
                        const dom = document.documentElement.outerHTML;
                        
                        // Get selected text if any
                        const selection = window.getSelection ? window.getSelection().toString() : '';
                        
                        return {
                            dom: dom,
                            selection: selection,
                            title: document.title,
                            url: window.location.href
                        };
                    } catch (error) {
                        console.error('Content extraction error:', error);
                        return {
                            dom: document.documentElement ? document.documentElement.outerHTML : '',
                            selection: '',
                            title: document.title || 'Untitled',
                            url: window.location.href
                        };
                    }
                }
            });
            
            if (results && results[0] && results[0].result) {
                const extractedData = results[0].result;
                console.log('✅ Content extracted successfully');
                console.log(`📊 DOM length: ${extractedData.dom?.length || 0} chars`);
                console.log(`📊 Selection length: ${extractedData.selection?.length || 0} chars`);
                
                return {
                    ...extractedData,
                    tabId: currentTab.id,
                    baseURI: currentTab.url
                };
            } else {
                throw new Error('Failed to extract content from tab');
            }
            
        } catch (error) {
            console.error('❌ Content extraction failed:', error);
            throw error;
        }
    }
}

const contentExtractor = new ContentExtractor();

// ============================================================================
// CLIPPING FUNCTIONALITY
// ============================================================================

async function clipPage() {
    try {
        console.log('🔄 Starting page clipping process...');
        
        // Show loading state
        showStatus('⏳ Extracting content...', 'loading');
        
        // Check service worker connection
        if (!serviceWorkerReady) {
            showStatus('🔌 Connecting to service worker...', 'loading');
            const connected = await swCommunicator.initialize();
            if (!connected) {
                throw new Error('Could not establish connection to service worker');
            }
        }
        
        // Extract content from current tab
        showStatus('📄 Processing page content...', 'loading');
        const extractedContent = await contentExtractor.extractFromCurrentTab();
        
        // Get user options with fallback
        let options;
        try {
            options = await browser.storage.sync.get(defaultOptions);
        } catch (error) {
            console.warn('⚠️ Could not load user options, using defaults:', error);
            options = defaultOptions;
        }
        
        // Send clip request to service worker
        showStatus('🔄 Converting to markdown...', 'loading');
        const clipMessage = {
            type: 'clip',
            dom: extractedContent.dom,
            selection: extractedContent.selection,
            title: extractedContent.title,
            baseURI: extractedContent.baseURI,
            clipSelection: options.clipSelection || false,
            ...options
        };
        
        const response = await swCommunicator.sendMessage(clipMessage);
        
        if (response && response.success) {
            console.log('✅ Clipping completed successfully');
            
            // Display the result
            displayMarkdown(response.markdown, response.title);
            showStatus('✅ Page clipped successfully!', 'success');
            
        } else {
            throw new Error(response?.error || 'Clipping failed - unknown error');
        }
        
    } catch (error) {
        console.error('❌ Clipping failed:', error);
        showStatus(`❌ Error: ${error.message}`, 'error');
        
        // Show error details in the markdown area
        displayError(error);
    }
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }
    console.log(`📢 Status: ${message}`);
}

function displayMarkdown(markdown, title) {
    const markdownElement = document.getElementById('markdown-output');
    const titleElement = document.getElementById('page-title');
    
    if (titleElement && title) {
        titleElement.textContent = title;
    }
    
    if (markdownElement) {
        markdownElement.textContent = markdown;
        markdownElement.style.display = 'block';
    }
}

function displayError(error) {
    const errorMarkdown = `# Clipping Error\n\n**Error:** ${error.message}\n\n**Time:** ${new Date().toISOString()}\n\n**Troubleshooting:**\n- Try reloading the extension\n- Check if the page is fully loaded\n- Verify the extension has permissions for this site`;
    
    displayMarkdown(errorMarkdown, 'Error Report');
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 Popup DOM loaded, initializing...');
    
    try {
        // Initialize browser API
        if (typeof browser !== 'undefined') {
            browserAPIReady = true;
            console.log('✅ Browser API available');
        } else {
            throw new Error('Browser API not available');
        }
        
        // Set up event listeners
        const clipButton = document.getElementById('clip-button');
        if (clipButton) {
            clipButton.addEventListener('click', clipPage);
            console.log('🔘 Clip button event listener attached');
        }
        
        const testButton = document.getElementById('test-connection');
        if (testButton) {
            testButton.addEventListener('click', async () => {
                showStatus('🧪 Testing connection...', 'loading');
                const connected = await swCommunicator.initialize();
                if (connected) {
                    showStatus('✅ Connection test passed!', 'success');
                } else {
                    showStatus('❌ Connection test failed', 'error');
                }
            });
        }
        
        // Initialize service worker connection
        showStatus('🔌 Initializing connection...', 'loading');
        const connected = await swCommunicator.initialize();
        
        if (connected) {
            showStatus('✅ Ready to clip pages', 'success');
        } else {
            showStatus('⚠️ Connection issues detected', 'warning');
        }
        
        console.log('✅ Popup initialization completed');
        
    } catch (error) {
        console.error('❌ Popup initialization failed:', error);
        showStatus(`❌ Initialization failed: ${error.message}`, 'error');
    }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Handle popup closing
window.addEventListener('beforeunload', () => {
    console.log('📱 Popup closing...');
});
