// Browser API compatibility
const runtime = (typeof browser !== 'undefined' ? browser : chrome).runtime;

// Inject Readability.js into page context dynamically
function injectReadability() {
    return new Promise((resolve, reject) => {
        if (typeof window.Readability === 'function') {
            console.log('✅ Readability already available');
            resolve(window.Readability);
            return;
        }

        console.log('🔄 Injecting Readability.js into page context...');

        const script = document.createElement('script');
        script.src = runtime.getURL('background/Readability.js');
        script.onload = () => {
            console.log('✅ Readability.js loaded');
            // Give it a moment to initialize
            setTimeout(() => {
                if (typeof window.Readability === 'function') {
                    console.log('🎯 Readability ready for use');
                    resolve(window.Readability);
                } else {
                    reject(new Error('Readability not found after injection'));
                }
            }, 50);
        };
        script.onerror = reject;

        (document.head || document.documentElement).appendChild(script);
    });
}

// Handle messages from popup
function handlePopupMessage(message, sender, sendResponse) {
    console.log('📨 Content script received message:', message);

    if (message.type === 'triggerContentExtraction') {
        console.log('🚀 Triggering content extraction from popup message...');

        // Execute content extraction and return result
        extractContentForPopup()
            .then(result => {
                console.log('✅ Content extraction completed, returning result:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('❌ Content extraction failed:', error);
                sendResponse({
                    error: error.message,
                    dom: getHTMLOfDocument(),
                    selection: getHTMLOfSelection(),
                    readability: null
                });
            });

        // Return true to indicate async response
        return true;
    }
}

// Set up message listener with compatibility
if (typeof browser !== 'undefined' && browser.runtime) {
    browser.runtime.onMessage.addListener(handlePopupMessage);
} else if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener(handlePopupMessage);
} else {
    console.error('❌ No runtime API available for message listening');
}

// Test message handler for debugging
function handleTestMessage(message, sender, sendResponse) {
    if (message.type === 'testMessage') {
        console.log('🧪 Received test message:', message);
        sendResponse({
            success: true,
            message: 'Content script is working!',
            receivedData: message.data,
            timestamp: Date.now()
        });
        return true;
    }
}

// Add test message listener
if (typeof browser !== 'undefined' && browser.runtime) {
    browser.runtime.onMessage.addListener(handleTestMessage);
} else if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener(handleTestMessage);
}

// Extract content and return result (for popup communication)
async function extractContentForPopup() {
    console.log('🚀 Starting content extraction for popup...');

    try {
        // Step 1: Ensure Readability is available
        console.log('📋 Step 1: Checking Readability availability...');
        await injectReadability();

        if (typeof window.Readability !== 'function') {
            throw new Error('Readability is not available after injection');
        }

        console.log('✅ Readability is ready for use');

        // Step 2: Get basic page data
        console.log('📋 Step 2: Collecting page data...');
        const domData = getSelectionAndDom();
        console.log('📊 Page data collected:', {
            domLength: domData.dom?.length || 0,
            selectionLength: domData.selection?.length || 0,
            hasTitle: !!document.title,
            url: window.location.href
        });

        // Step 3: Extract content using Readability in page context
        console.log('📋 Step 3: Extracting content with Readability...');

        const readability = new window.Readability(document, {
            debug: false,
            maxElemsToParse: 0,
            nbTopCandidates: 5,
            charThreshold: 100, // Lower threshold for better detection
            classesToPreserve: [
                'markdown-body', 'markdown-content', 'post-content',
                'entry-content', 'article-content', 'content'
            ]
        });

        console.log('🎯 Readability instance created, calling parse()...');
        const article = readability.parse();

        console.log('📄 Readability result:', {
            success: !!article,
            hasTitle: !!(article?.title),
            hasContent: !!(article?.content),
            contentLength: article?.content?.length || 0,
            byline: article?.byline,
            excerptLength: article?.excerpt?.length || 0
        });

        if (article && article.content && article.content.trim().length > 0) {
            console.log('✅ Content extraction successful');
            console.log('📝 Content preview:', article.content.substring(0, 200) + '...');
        } else {
            console.warn('⚠️ Readability returned empty or invalid result');
            console.log('🔍 Article details:', article);
        }

        // Return result to popup
        const result = {
            dom: domData.dom,
            selection: domData.selection,
            readability: article && article.content && article.content.trim().length > 0 ? {
                title: article.title || document.title,
                content: article.content,
                byline: article.byline || null,
                excerpt: article.excerpt || null
            } : null
        };

        console.log('📤 Returning result to popup:', {
            hasDom: !!result.dom,
            hasReadability: !!result.readability,
            readabilityContentLength: result.readability?.content?.length || 0
        });

        return result;

    } catch (error) {
        console.error('❌ Content extraction failed at step:', error.message);
        console.error('📋 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        // Return fallback result
        console.log('🔄 Returning fallback result...');
        return {
            dom: getHTMLOfDocument(),
            selection: getHTMLOfSelection(),
            readability: null
        };
    }
}

// Content script initialization
console.log('🚀 Content script loaded and ready');
console.log('📋 Content script URL:', window.location.href);
console.log('🔧 Available APIs:', {
    chrome: typeof chrome !== 'undefined',
    browser: typeof browser !== 'undefined',
    runtime: typeof (chrome || browser)?.runtime !== 'undefined'
});

// Export functions for potential debugging
window.debugContentScript = {
    injectReadability,
    extractContentForPopup,
    getHTMLOfDocument,
    getHTMLOfSelection,
    getSelectionAndDom
};

function getHTMLOfDocument() {
    // make sure a title tag exists so that pageTitle is not empty and
    // a filename can be genarated.
    if (document.head.getElementsByTagName('title').length == 0) {
        let titleEl = document.createElement('title');
        // prepate a good default text (the text displayed in the window title)
        titleEl.innerText = document.title;
        document.head.append(titleEl);
    }

    // if the document doesn't have a "base" element make one
    // this allows the DOM parser in future steps to fix relative uris

    let baseEls = document.head.getElementsByTagName('base');
    let baseEl;

    if (baseEls.length > 0) {
        baseEl = baseEls[0];
    } else {
        baseEl = document.createElement('base');
        document.head.append(baseEl);
    }

    // make sure the 'base' element always has a good 'href`
    // attribute so that the DOMParser generates usable
    // baseURI and documentURI properties when used in the
    // background context.

    let href = baseEl.getAttribute('href');

    if (!href || !href.startsWith(window.location.origin)) {
        baseEl.setAttribute('href', window.location.href);
    }

    // remove truly hidden elements while preserving content
    cleanHiddenElements(document.body);

    // get the content of the page as a string
    return document.documentElement.outerHTML;
}

// Configuration constants for hidden element cleaning
const CONTENT_CLEANING_CONFIG = {
    // Minimum text length to consider an element as having significant content
    SIGNIFICANT_CONTENT_THRESHOLD: 50,
    // Maximum preview length for logging hidden content
    CONTENT_PREVIEW_LENGTH: 100
};

/**
 * Clean hidden elements from the DOM while preserving content-rich elements
 * This function intelligently removes truly hidden elements but keeps elements 
 * that contain significant content, even if they appear hidden
 * @param {HTMLElement} root - The root element to clean
 * @returns {HTMLElement} The cleaned root element
 */
function cleanHiddenElements(root) {
    const nodeIterator = createElementIterator(root);
    const removedCount = removeHiddenElements(nodeIterator);
    
    console.log(`🧹 Removed ${removedCount} truly hidden elements while preserving content`);
    return root;
}

/**
 * Create node iterator for filtering elements based on visibility and content importance
 * @param {HTMLElement} root - Root element to iterate through
 * @returns {NodeIterator} Configured node iterator
 */
function createElementIterator(root) {
    return document.createNodeIterator(root, NodeFilter.SHOW_ELEMENT, function(node) {
        return shouldRemoveElement(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    });
}

/**
 * Determine if an element should be removed based on multiple criteria
 * @param {HTMLElement} node - Element to evaluate
 * @returns {boolean} True if element should be removed
 */
function shouldRemoveElement(node) {
    const nodeName = node.nodeName.toLowerCase();
    
    // Never remove script, style, noscript (handled elsewhere)
    if (isSystemElement(nodeName)) {
        return false;
    }
    
    // Don't remove elements with article context
    if (hasArticleContext(node)) {
        console.log(`🛡️ Preserving potentially important element: ${nodeName}.${node.className}`);
        return false;
    }
    
    // Only consider truly hidden elements
    return isElementHiddenAndRemovable(node);
}

/**
 * Check if element is a system element that should never be removed via this method
 * @param {string} nodeName - Lowercase node name
 * @returns {boolean} True if element is a system element
 */
function isSystemElement(nodeName) {
    const systemElements = ["script", "style", "noscript"];
    return systemElements.includes(nodeName);
}

/**
 * Check if element or its parent has article-related context
 * @param {HTMLElement} node - Element to check
 * @returns {boolean} True if element has article context
 */
function hasArticleContext(node) {
    const articleSelectors = [
        'article', 'main', 'section', 'content', 'post', 'entry',
        'article-content', 'post-content', 'entry-content', 'content-container'
    ];
    
    return articleSelectors.some(selector => {
        return elementMatchesSelector(node, selector) || 
               (node.parentElement && elementMatchesSelector(node.parentElement, selector));
    });
}

/**
 * Check if element matches a given selector in class or id
 * @param {HTMLElement} element - Element to check
 * @param {string} selector - Selector to match against
 * @returns {boolean} True if element matches selector
 */
function elementMatchesSelector(element, selector) {
    const className = (element.className || '').toString().toLowerCase();
    const elementId = (element.id || '').toString().toLowerCase();
    
    return className.includes(selector) || elementId.includes(selector);
}

/**
 * Check if element is hidden and can be safely removed
 * @param {HTMLElement} node - Element to check
 * @returns {boolean} True if element is hidden and removable
 */
function isElementHiddenAndRemovable(node) {
    // Only consider elements not in the normal document flow
    if (node.offsetParent !== null) {
        return false;
    }
    
    const computedStyle = window.getComputedStyle(node, null);
    const isHidden = computedStyle.getPropertyValue("visibility") === "hidden" || 
                    computedStyle.getPropertyValue("display") === "none";
    
    if (!isHidden) {
        return false;
    }
    
    // Don't remove if element has significant text content
    if (node.textContent.trim().length > CONTENT_CLEANING_CONFIG.SIGNIFICANT_CONTENT_THRESHOLD) {
        console.log(`⚠️ Hidden element has content, keeping: ${node.textContent.substring(0, CONTENT_CLEANING_CONFIG.CONTENT_PREVIEW_LENGTH)}...`);
        return false;
    }
    
    return true;
}

/**
 * Remove elements identified by the node iterator
 * @param {NodeIterator} nodeIterator - Iterator containing elements to remove
 * @returns {number} Number of elements removed
 */
function removeHiddenElements(nodeIterator) {
    let removedCount = 0;
    let node;
    let iterationCount = 0;
    
    while ((node = nodeIterator.nextNode()) && ++iterationCount) {
        if (node.parentNode instanceof HTMLElement) {
            removedCount++;
            node.parentNode.removeChild(node);
        }
    }
    
    return removedCount;
}

// code taken from here: https://stackoverflow.com/a/5084044/304786
function getHTMLOfSelection() {
    var range;
    if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        return range.htmlText;
    } else if (window.getSelection) {
        var selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let content = '';
            for (let i = 0; i < selection.rangeCount; i++) {
                range = selection.getRangeAt(0);
                var clonedSelection = range.cloneContents();
                var div = document.createElement('div');
                div.appendChild(clonedSelection);
                content += div.innerHTML;
            }
            return content;
        } else {
            return '';
        }
    } else {
        return '';
    }
}

function getSelectionAndDom() {
    return {
        selection: getHTMLOfSelection(),
        dom: getHTMLOfDocument()
    }
}

// This function must be called in a visible page, such as a browserAction popup
// or a content script. Calling it in a background page has no effect!
function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
}

function downloadMarkdown(filename, text) {
    let datauri = `data:text/markdown;base64,${text}`;
    var link = document.createElement('a');
    link.download = filename;
    link.href = datauri;
    link.click();
}

function downloadImage(filename, url) {

    /* Link with a download attribute? CORS says no.
    var link = document.createElement('a');
    link.download = filename.substring(0, filename.lastIndexOf('.'));
    link.href = url;
    console.log(link);
    link.click();
    */

    /* Try via xhr? Blocked by CORS.
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
        console.log('onload!')
        var file = new Blob([xhr.response], {type: 'application/octet-stream'});
        var link = document.createElement('a');
        link.download = filename;//.substring(0, filename.lastIndexOf('.'));
        link.href = window.URL.createObjectURL(file);
        console.log(link);
        link.click();
    }
    xhr.send();
    */

    /* draw on canvas? Inscure operation
    let img = new Image();
    img.src = url;
    img.onload = () => {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        var link = document.createElement('a');
        const ext = filename.substring(filename.lastIndexOf('.'));
        link.download = filename;
        link.href = canvas.toDataURL(`image/png`);
        console.log(link);
        link.click();
    }
    */
}

(function loadPageContextScript(){
    var s = document.createElement('script');
    s.src = browser.runtime.getURL('contentScript/pageContext.js');
    (document.head||document.documentElement).appendChild(s);
})()
