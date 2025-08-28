function notifyExtension() {
    // FIXED: Send proper DOM data instead of undefined content
    const domData = getSelectionAndDom();
    browser.runtime.sendMessage({ 
        type: "clip", 
        dom: domData.dom,
        selection: domData.selection,
        baseURI: window.location.href,
        pageTitle: document.title
    });
}

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

    // remove the hidden content from the page
    removeHiddenNodes(document.body);

    // get the content of the page as a string
    return document.documentElement.outerHTML;
}

// CRITICAL FIX: More conservative hidden node removal to preserve article content
function removeHiddenNodes(root) {
    let nodeIterator, node, i = 0;

    nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_ELEMENT, function(node) {
        let nodeName = node.nodeName.toLowerCase();
        
        // Always remove script, style, noscript
        if (nodeName === "script" || nodeName === "style" || nodeName === "noscript") {
            return NodeFilter.FILTER_REJECT;
        }
        
        // CRITICAL: Don't remove elements that might contain article content
        const articleSelectors = [
            'article', 'main', 'section', 'content', 'post', 'entry',
            'article-content', 'post-content', 'entry-content', 'content-container'
        ];
        
        // Check if element or parent contains article-related classes/ids
        const hasArticleContext = articleSelectors.some(selector => {
            return node.className.toLowerCase().includes(selector) ||
                   node.id.toLowerCase().includes(selector) ||
                   (node.parentElement && (
                       node.parentElement.className.toLowerCase().includes(selector) ||
                       node.parentElement.id.toLowerCase().includes(selector)
                   ));
        });
        
        if (hasArticleContext) {
            console.log(`🛡️ Preserving potentially important element: ${nodeName}.${node.className}`);
            return NodeFilter.FILTER_REJECT; // Don't remove
        }
        
        // Only remove elements that are truly hidden and likely non-content
        if (node.offsetParent === null) {
            let computedStyle = window.getComputedStyle(node, null);
            let isHidden = computedStyle.getPropertyValue("visibility") === "hidden" || 
                          computedStyle.getPropertyValue("display") === "none";
                          
            // Additional check: if element has text content, be more careful
            if (isHidden && node.textContent.trim().length > 50) {
                console.log(`⚠️ Hidden element has content, keeping: ${node.textContent.substring(0, 100)}...`);
                return NodeFilter.FILTER_REJECT; // Don't remove elements with significant text
            }
            
            return isHidden ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_REJECT; // Don't remove visible elements
    });

    let removedCount = 0;
    while ((node = nodeIterator.nextNode()) && ++i) {
        if (node.parentNode instanceof HTMLElement) {
            removedCount++;
            node.parentNode.removeChild(node);
        }
    }
    
    console.log(`🧹 Removed ${removedCount} truly hidden elements while preserving content`);
    return root;
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
