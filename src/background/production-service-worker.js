/**
 * MarkDownload Extension - Production Service Worker
 *
 * This is the ONLY service worker used at runtime.
 * It is referenced by manifest.json and ships with the extension.
 *
 * For any end-user runtime changes, update this file.
 * Do not change src/background/service-worker.js for production behavior.
 */
// Diagnostic flag (harmless for tests). Do not rely on this at runtime.
self.__MD_SW_ROLE = 'production';

// Import browser polyfill and required libraries
importScripts('../browser-polyfill.min.js');
importScripts('polyfills/dom-polyfill.js');
importScripts('turndown.js');
importScripts('turndown-plugin-gfm.js');
importScripts('Readability.js');
importScripts('../shared/context-menus.js');
importScripts('../shared/default-options.js');

console.log('🚀 MarkDownload Production Service Worker: Starting...');

// ============================================================================
// SERVICE WORKER STATE MANAGEMENT
// ============================================================================

// Track filenames for our blob/data URLs to fight external overrides
const pendingFilenameByUrl = new Map();
const urlByDownloadId = new Map();

// Best-effort: enforce filename via onDeterminingFilename
try {
    if (browser?.downloads?.onDeterminingFilename) {
        browser.downloads.onDeterminingFilename.addListener((details, suggest) => {
            try {
                const wanted = pendingFilenameByUrl.get(details.url);
                if (wanted) {
                    suggest({ filename: wanted, conflictAction: 'uniquify' });
                }
            } catch (e) {
                // ignore
            }
        });
    }
    if (browser?.downloads?.onChanged) {
        browser.downloads.onChanged.addListener((delta) => {
            try {
                if (delta?.id && delta?.state?.current === 'complete') {
                    const url = urlByDownloadId.get(delta.id);
                    if (url) {
                        pendingFilenameByUrl.delete(url);
                        urlByDownloadId.delete(delta.id);
                        try { URL.revokeObjectURL(url); } catch (_) {}
                    }
                }
            } catch (_) {}
        });
    }
} catch (_) {}

class ServiceWorkerState {
    constructor() {
        this.isInitialized = false;
        this.messageQueue = [];
        this.pendingMessages = new Map();
        this.healthStatus = {
            serviceWorker: 'initializing',
            messageHandler: 'not_registered',
            contextMenus: 'not_created',
            lastActivity: Date.now()
        };
    }
    
    markInitialized() {
        this.isInitialized = true;
        this.healthStatus.serviceWorker = 'operational';
        this.healthStatus.lastActivity = Date.now();
        this.processQueuedMessages();
    }
    
    updateActivity() {
        this.healthStatus.lastActivity = Date.now();
    }
    
    async processQueuedMessages() {
        if (this.messageQueue.length === 0) return;
        
        console.log(`📬 Processing ${this.messageQueue.length} queued messages`);
        
        const queue = [...this.messageQueue];
        this.messageQueue = [];
        
        for (const { message, sender, sendResponse } of queue) {
            try {
                await this.handleMessage(message, sender, sendResponse);
            } catch (error) {
                console.error('❌ Error processing queued message:', error);
                sendResponse({ success: false, error: error.message });
            }
        }
    }
    
    async handleMessage(message, sender, sendResponse) {
        this.updateActivity();
        
        const messageType = message.type || message.action;
        console.log(`📨 Handling message: ${messageType}`);
        
        try {
            switch (messageType) {
                case 'health-check':
                    return this.handleHealthCheck(message, sender, sendResponse);
                    
                case 'clip':
                    return await this.handleClipMessage(message, sender, sendResponse);
                    
                case 'download':
                    return await this.handleDownloadMessage(message, sender, sendResponse);
                    
                default:
                    console.warn(`⚠️ Unknown message type: ${messageType}`);
                    sendResponse({ 
                        success: false, 
                        error: `Unknown message type: ${messageType}` 
                    });
                    return false;
            }
        } catch (error) {
            console.error(`❌ Error handling ${messageType}:`, error);
            sendResponse({ 
                success: false, 
                error: error.message 
            });
            return false;
        }
    }
    
    handleHealthCheck(message, sender, sendResponse) {
        const status = {
            success: true,
            message: 'Service worker is healthy',
            timestamp: Date.now(),
            healthStatus: this.healthStatus,
            isInitialized: this.isInitialized
        };
        
        console.log('💚 Health check passed:', status);
        sendResponse(status);
        return true;
    }
    
    async handleClipMessage(message, sender, sendResponse) {
        console.log('📄 Processing clip message');
        
        try {
            // Get options
            const options = await getOptions();
            
            // Extract article from DOM
            const article = await this.getArticleFromDom(message.dom, message.baseURI);
            
            // Handle selection clipping
            if (message.selection && message.clipSelection) {
                article.content = message.selection;
            }
            
            // Convert to markdown
            const { markdown, imageList } = await this.convertArticleToMarkdown(article, options);
            
            // Format title
            const title = this.formatTitle(article.title || message.title, options);
            
            // 格式化文件名但不立即下载
            const filename = this.generateFilename(title, options);
            
            const response = {
                success: true,
                markdown: markdown,
                title: title,
                imageList: imageList || {},
                filename: filename,
                timestamp: Date.now()
            };
            
            console.log('✅ Clip processing completed successfully');
            sendResponse(response);
            return true;
            
        } catch (error) {
            console.error('❌ Clip processing failed:', error);
            sendResponse({
                success: false,
                error: error.message || 'Failed to process clip request'
            });
            return false;
        }
    }
    
    async handleDownloadMessage(message, sender, sendResponse) {
        console.log('💾 Processing download message:', message);
        
        try {
            if (!message.markdown) {
                throw new Error('没有提供Markdown内容');
            }
            
            // 修复：支持从title或filename获取文件名
            let rawFilename = message.filename || message.title;
            if (!rawFilename || typeof rawFilename !== 'string' || rawFilename.trim().length === 0) {
                rawFilename = 'Untitled';
                console.log('⚠️ 没有提供有效的文件名或标题，使用默认值:', rawFilename);
            }

            // 使用统一的 generateFilename 函数生成安全的文件名
            // 注意：即使提供了 disallowedChars，也始终强制移除路径分隔符和冒号等跨平台非法字符
            // 同时应用用户在选项中配置的 disallowedChars
            let userOptions = {};
            try {
                userOptions = await getOptions();
            } catch (_) { userOptions = {}; }
            const filename = this.generateFilename(rawFilename, userOptions);
            
            // 验证生成的文件名是否有效
            if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
                throw new Error(`Invalid filename generated: ${filename}`);
            }
            
            console.log('📄 使用文件名:', filename);
            
            // 图片处理（根据选项）
            const imageList = message.imageList || {};
            if (userOptions.downloadImages && imageList && Object.keys(imageList).length > 0) {
                if (userOptions.imageStyle === 'base64') {
                    try { message.markdown = await this.embedImagesAsBase64(message.markdown, imageList); } catch (_) {}
                } else if (userOptions.downloadMode === 'downloadsApi' || !userOptions.downloadMode) {
                    try { await this.downloadImages(imageList); } catch (_) {}
                }
            }

            // 执行下载
            const downloadId = await this.downloadMarkdownFile(message.markdown, filename);
            
            sendResponse({
                success: true,
                message: `文件已开始下载: ${filename}`,
                downloadId: downloadId,
                timestamp: Date.now()
            });
            return true;
            
        } catch (error) {
            console.error('❌ Download processing failed:', error);
            sendResponse({
                success: false,
                error: error.message
            });
            return false;
        }
    }
    
    async getArticleFromDom(htmlContent, baseURI = '') {
        if (!htmlContent) {
            throw new Error('No HTML content provided');
        }
        
        try {
            console.log('🔍 Extracting article from HTML content...');
            // First try DOMParser + Readability when available
            try {
                if (typeof DOMParser !== 'undefined' && typeof Readability !== 'undefined') {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlContent, 'text/html');
                    if (doc && doc.documentElement) {
                        // Clean noisy nodes that are never part of content
                        doc.querySelectorAll('script, style, noscript').forEach(n => n.remove());

                        // Math and code preprocessing to improve extraction fidelity
                        try {
                            const math = {};
                            const storeMathInfo = (el, mathInfo) => {
                                let randomId = URL.createObjectURL(new Blob([]));
                                randomId = randomId.substring(randomId.length - 36);
                                el.id = randomId;
                                math[randomId] = mathInfo;
                            };
                            // MathJax v2
                            doc.body?.querySelectorAll('script[id^=MathJax-Element-]')?.forEach(mathSource => {
                                const type = mathSource.getAttribute('type') || '';
                                storeMathInfo(mathSource, {
                                    tex: mathSource.textContent || '',
                                    inline: type ? !type.includes('mode=display') : false
                                });
                                mathSource.parentNode?.removeChild(mathSource);
                            });
                            // MathJax v3 (markdownload-latex)
                            doc.body?.querySelectorAll('[markdownload-latex]')?.forEach(mjx =>  {
                                const tex = mjx.getAttribute('markdownload-latex') || '';
                                const display = mjx.getAttribute('display');
                                const inline = !(display && display === 'true');
                                const mathNode = doc.createElement(inline ? 'i' : 'p');
                                mathNode.textContent = tex;
                                mjx.parentNode?.insertBefore(mathNode, mjx.nextSibling);
                                mjx.parentNode?.removeChild(mjx);
                                storeMathInfo(mathNode, { tex, inline });
                            });
                            // KaTeX
                            doc.body?.querySelectorAll('.katex-mathml')?.forEach(ka => {
                                const ann = ka.querySelector('annotation');
                                if (!ann) return;
                                storeMathInfo(ka, { tex: ann.textContent || '', inline: true });
                            });
                            // Language hints for code blocks
                            doc.body?.querySelectorAll('[class*=highlight-text],[class*=highlight-source]')?.forEach(codeSource => {
                                const m = (codeSource.getAttribute('class') || '').match(/highlight-(?:text|source)-([a-z0-9]+)/);
                                const language = m && m[1];
                                if (language && codeSource.firstChild && codeSource.firstChild.nodeName === 'PRE') {
                                    (codeSource.firstChild).setAttribute('id', `code-lang-${language}`);
                                }
                            });
                            doc.body?.querySelectorAll('[class*=language-]')?.forEach(codeSource => {
                                const m = (codeSource.getAttribute('class') || '').match(/language-([a-z0-9]+)/);
                                const language = m && m[1];
                                if (language) codeSource.setAttribute('id', `code-lang-${language}`);
                            });
                            doc.body?.querySelectorAll('pre br')?.forEach(br => {
                                br.outerHTML = '<br-keep></br-keep>';
                            });
                            doc.body?.querySelectorAll('h1, h2, h3, h4, h5, h6')?.forEach(h => {
                                h.removeAttribute('class');
                                h.outerHTML = h.outerHTML; // normalize
                            });
                            doc.documentElement?.removeAttribute('class');
                            // Attach for later use
                            doc.__md_math = math;
                        } catch (_) {}

                        const readability = new Readability(doc);
                        const art = readability.parse();
                        if (art && art.content && art.content.trim().length > 0) {
                            const a = {
                                title: art.title || doc.title || 'Untitled',
                                content: art.content,
                                textContent: (art.textContent || '').trim(),
                                excerpt: art.excerpt || '',
                                byline: art.byline || '',
                                dir: art.dir || '',
                                siteName: art.siteName || '',
                                lang: doc.documentElement.getAttribute('lang') || '',
                                baseURI: baseURI || doc.baseURI
                            };
                            try { if (doc.__md_math && Object.keys(doc.__md_math).length) a.math = doc.__md_math; } catch (_) {}
                            console.log(`✅ Readability extraction succeeded: ${a.title}`);
                            return a;
                        }
                    }
                }
            } catch (e) {
                console.warn('⚠️ Readability extraction failed, falling back:', e?.message || e);
            }
            
            // Fallback: simplified regex extraction
            // Extract title from HTML
            const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
            
            // Extract body content if available
            const bodyMatch = htmlContent.match(/<body[^>]*>(.*)<\/body>/is);
            let bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;

            // Prefer main article containers if present
            // Prefer the largest <article> or <main> block if multiple exist
            const allArticles = Array.from(bodyContent.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/gi)).map(m => m[1]);
            const allMains = Array.from(bodyContent.matchAll(/<main[^>]*>([\s\S]*?)<\/main>/gi)).map(m => m[1]);
            if (allArticles.length > 0) {
                bodyContent = allArticles.sort((a,b)=>b.length-a.length)[0];
            } else if (allMains.length > 0) {
                bodyContent = allMains.sort((a,b)=>b.length-a.length)[0];
            }

            // Remove executable or non-content blocks entirely before any conversion
            // This prevents inline JavaScript/CSS from leaking into the markdown output
            bodyContent = bodyContent
                // Remove script blocks (including inline MathJax configs)
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                // Remove style blocks
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                // Remove noscript fallbacks
                .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
                // Remove common non-content blocks
                .replace(/<(nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, '')
                // Remove obvious navigation/menus/sidebars by class/id patterns (conservative; exclude 'toc')
                .replace(/<(div|section)[^>]*(class|id)\s*=\s*['"][^"']*(nav|menu|header|footer|sidebar|breadcrumbs?|share|social)[^"']*['"][^>]*>[\s\S]*?<\/\1>/gi, '');
            
            // Extract text content by removing remaining HTML tags (after script/style cleanup)
            const textContent = bodyContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            
            // Extract meta description for excerpt
            const descMatch = htmlContent.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
            const excerpt = descMatch ? descMatch[1] : textContent.substring(0, 150) + '...';
            
            // Extract author/byline
            const authorMatch = htmlContent.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i);
            const byline = authorMatch ? authorMatch[1] : '';
            
            // Extract language
            const langMatch = htmlContent.match(/<html[^>]+lang=["']([^"']+)["']/i);
            const lang = langMatch ? langMatch[1] : '';
            
            const article = {
                title: title,
                content: bodyContent,
                textContent: textContent,
                length: bodyContent.length,
                excerpt: excerpt,
                byline: byline,
                dir: '',
                siteName: '',
                lang: lang,
                baseURI: baseURI
            };
            
            console.log(`✅ Article extracted: ${title} (${textContent.length} chars)`);
            return article;
            
        } catch (error) {
            console.error('❌ Error extracting article from HTML:', error);
            
            // Ultimate fallback: return raw HTML with minimal processing
            return {
                title: 'Untitled',
                content: htmlContent,
                textContent: htmlContent.replace(/<[^>]*>/g, ''),
                length: htmlContent.length,
                excerpt: '',
                byline: '',
                dir: '',
                siteName: '',
                lang: '',
                baseURI: baseURI
            };
        }
    }
    
    async convertArticleToMarkdown(article, options) {
        console.log('🔄 Converting article to markdown');
        // Prefer Turndown-based conversion for higher fidelity. Fallback on regex converter.
        try {
            const primary = this.turndownArticleToMarkdown(article, options);
            if (primary && typeof primary.markdown === 'string' && primary.markdown.trim().length > 200) {
                return primary;
            }
        } catch (e) {
            console.warn('⚠️ Turndown conversion failed, using fallback:', e?.message || e);
        }
        return this.fallbackHtmlToMarkdown(article, options);
    }

    turndownArticleToMarkdown(article, options = {}) {
        if (!article || !article.content) return { markdown: '', imageList: {} };
        const imageList = {};

        // eslint-disable-next-line no-undef
        const service = new TurndownService(options);
        // eslint-disable-next-line no-undef
        service.use(turndownPluginGfm.gfm);
        service.keep(['iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small', 'big']);

        // Helpers
        const repeat = (ch, n) => Array(n + 1).join(ch);
        const convertToFencedCodeBlock = (node, tdopts) => {
            node.innerHTML = (node.innerHTML || '').replaceAll('<br-keep></br-keep>', '<br>');
            let language = '';
            const cls = node.getAttribute('class') || node.className || '';
            const viaClass = cls.match(/language-([^\s]+)/) || cls.match(/lang-([^\s]+)/);
            if (viaClass?.length) language = viaClass[1]; else {
                const idStr = node.getAttribute('id') || node.id || '';
                const m = idStr.match(/code-lang-(.+)/);
                if (m?.length) language = m[1];
            }
            const code = node.innerText || node.textContent || '';
            const fenceChar = (tdopts.fence || '```').charAt(0);
            let fenceSize = 3;
            const fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm');
            let match;
            while ((match = fenceInCodeRegex.exec(code))) {
                if (match[0].length >= fenceSize) fenceSize = match[0].length + 1;
            }
            const fence = repeat(fenceChar, fenceSize);
            return '\n\n' + fence + (language || '') + '\n' + code.replace(/\n$/, '') + '\n' + fence + '\n\n';
        };

        // Images
        service.addRule('images', {
            filter: (node) => node.nodeName === 'IMG' && node.getAttribute('src'),
            replacement: (content, node, tdopts) => {
                const imgStyle = options.imageStyle || 'markdown';
                if (imgStyle === 'noImage') return '';

                let src = node.getAttribute('src') || '';
                const alt = node.getAttribute('alt') || '';
                const title = node.getAttribute('title') || '';
                src = this.resolveUrl(src, article.baseURI);

                let displayedSrc = src;
                if (options.downloadImages) {
                    const fn = this.generateImageFilename(src, options, article.title || '');
                    let unique = fn, i = 1;
                    while (Object.values(imageList).includes(unique)) {
                        const parts = fn.split('.');
                        if (i === 1) parts.splice(parts.length - 1, 0, i++);
                        else parts.splice(parts.length - 2, 1, i++);
                        unique = parts.join('.');
                    }
                    imageList[src] = unique;
                    if (imgStyle !== 'originalSource' && imgStyle !== 'base64') {
                        if (imgStyle.startsWith('obsidian')) {
                            displayedSrc = (imgStyle === 'obsidian-nofolder') ? unique.substring(unique.lastIndexOf('/') + 1) : unique;
                        } else {
                            displayedSrc = unique.split('/').map(s => encodeURI(s)).join('/');
                        }
                    }
                }

                if ((imgStyle || '').startsWith('obsidian')) {
                    return `![[${displayedSrc}]]`;
                } else {
                    const titlePart = title ? ` "${title}"` : '';
                    return displayedSrc ? `![${alt}](${displayedSrc}${titlePart})` : '';
                }
            }
        });

        // Links
        service.addRule('links', {
            filter: (node) => node.nodeName === 'A' && node.getAttribute('href'),
            replacement: (content, node) => {
                const href = this.resolveUrl(node.getAttribute('href'), article.baseURI);
                if ((options.linkStyle || '') === 'stripLinks') return content;
                return `[${content}](${href})`;
            }
        });

        // Code blocks
        service.addRule('fencedCodeBlock', {
            filter: (node, tdopts) => (tdopts.codeBlockStyle === 'fenced' && node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE'),
            replacement: (content, node, tdopts) => convertToFencedCodeBlock(node.firstChild, tdopts)
        });
        service.addRule('pre', {
            filter: (node) => (node.nodeName === 'PRE' && (!node.firstChild || node.firstChild.nodeName !== 'CODE') && !node.querySelector('img')),
            replacement: (content, node, tdopts) => convertToFencedCodeBlock(node, tdopts)
        });

        // MathJax
        if (article.math && typeof article.math === 'object') {
            service.addRule('mathjax', {
                filter: (node) => article.math && Object.prototype.hasOwnProperty.call(article.math, node.id),
                replacement: (content, node) => {
                    const math = article.math[node.id];
                    let tex = (math?.tex || '').trim().replaceAll('\u00a0', '');
                    if (math?.inline) {
                        tex = tex.replaceAll('\n', ' ');
                        return `$${tex}$`;
                    }
                    return `$$\n${tex}\n$$`;
                }
            });
        }

        let markdown = service.turndown(article.content || '');
        markdown = markdown
            .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, '')
            .replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

        return { markdown, imageList };
    }
    
    fallbackHtmlToMarkdown(article, options) {
        console.log('🔄 Using enhanced fallback HTML to Markdown conversion');
        
        try {
            let content = article.content || '';

            // Safety: strip non-content blocks again in case content did not go through getArticleFromDom
            content = content
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
            const imageList = {};
            
            // First, clean up complex JavaScript/React artifacts
            content = this.cleanupJavaScriptArtifacts(content);
            
            // Enhanced HTML to Markdown conversion
            // Headers (handle nested content better)
            content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (match, inner) => {
                return '# ' + this.cleanHeadingText(this.stripHtml(inner)) + '\n\n';
            });
            content = content.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (match, inner) => {
                return '## ' + this.cleanHeadingText(this.stripHtml(inner)) + '\n\n';
            });
            content = content.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (match, inner) => {
                return '### ' + this.cleanHeadingText(this.stripHtml(inner)) + '\n\n';
            });
            content = content.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (match, inner) => {
                return '#### ' + this.cleanHeadingText(this.stripHtml(inner)) + '\n\n';
            });
            content = content.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (match, inner) => {
                return '##### ' + this.cleanHeadingText(this.stripHtml(inner)) + '\n\n';
            });
            content = content.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (match, inner) => {
                return '###### ' + this.cleanHeadingText(this.stripHtml(inner)) + '\n\n';
            });
            
            // Bold and italic (handle nested content)
            content = content.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (match, inner) => {
                return '**' + this.stripHtml(inner) + '**';
            });
            content = content.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (match, inner) => {
                return '**' + this.stripHtml(inner) + '**';
            });
            content = content.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (match, inner) => {
                return '*' + this.stripHtml(inner) + '*';
            });
            content = content.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (match, inner) => {
                return '*' + this.stripHtml(inner) + '*';
            });

            // Tables (convert to Markdown GFM tables)
            content = this.convertTablesToMarkdown(content);
            
            // Links (better attribute parsing)
            content = content.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (match, href, inner) => {
                const linkText = this.stripHtml(inner).trim();
                return `[${linkText}](${href})`;
            });
            
            // Images: extract, optionally rewrite and collect list for downloads
            content = content.replace(/<img\b[^>]*>/gi, (tag) => {
                try {
                    const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
                    const altMatch = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);
                    const titleMatch = tag.match(/\btitle\s*=\s*["']([^"']*)["']/i);
                    let src = srcMatch ? srcMatch[1] : '';
                    const alt = altMatch ? altMatch[1] : '';
                    const title = titleMatch ? titleMatch[1] : '';
                    if (!src) return '';

                    // Resolve to absolute URL
                    src = this.resolveUrl(src, article.baseURI);

                    const imageStyle = (options && options.imageStyle) || 'markdown';
                    const wantDownload = !!(options && options.downloadImages);

                    if (imageStyle === 'noImage') return '';

                    let displayedSrc = src;
                    if (wantDownload) {
                        const fileName = this.generateImageFilename(src, options, article.title || '');
                        // ensure uniqueness
                        let uniqueName = fileName;
                        let i = 1;
                        while (Object.values(imageList).includes(uniqueName)) {
                            const parts = fileName.split('.');
                            if (i === 1) parts.splice(parts.length - 1, 0, i++);
                            else parts.splice(parts.length - 2, 1, i++);
                            uniqueName = parts.join('.');
                        }
                        imageList[src] = uniqueName;

                        if (imageStyle !== 'originalSource' && imageStyle !== 'base64') {
                            if (imageStyle.startsWith('obsidian')) {
                                displayedSrc = imageStyle === 'obsidian-nofolder'
                                    ? uniqueName.substring(uniqueName.lastIndexOf('/') + 1)
                                    : uniqueName;
                            } else {
                                displayedSrc = uniqueName.split('/').map(s => encodeURI(s)).join('/');
                            }
                        }
                    }

                    if ((options && options.imageStyle || 'markdown').startsWith('obsidian')) {
                        return `![[${displayedSrc}]]`;
                    } else {
                        const titlePart = title ? ` \"${this.stripHtml(title)}\"` : '';
                        return `![${this.stripHtml(alt)}](${displayedSrc}${titlePart})`;
                    }
                } catch (_) {
                    return '';
                }
            });
            
            // Code blocks and inline code
            content = content.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (match, code) => {
                const cleanCode = this.decodeHtmlEntities(code);
                return '```\n' + cleanCode + '\n```\n\n';
            });
            content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (match, code) => {
                const cleanCode = this.stripHtml(code);
                return '`' + cleanCode + '`';
            });
            
            // Blockquotes
            content = content.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, quote) => {
                const cleanQuote = this.stripHtml(quote).trim();
                return '\n> ' + cleanQuote.replace(/\n/g, '\n> ') + '\n\n';
            });
            
            // Lists (improved handling)
            content = content.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, listItems) => {
                const items = listItems.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
                if (!items) return '';
                
                let result = '\n';
                items.forEach(item => {
                    const itemContent = item.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, '$1');
                    const cleanItem = this.stripHtml(itemContent).trim();
                    if (cleanItem) {
                        result += '- ' + cleanItem + '\n';
                    }
                });
                return result + '\n';
            });
            
            content = content.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, listItems) => {
                const items = listItems.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
                if (!items) return '';
                
                let result = '\n';
                items.forEach((item, index) => {
                    const itemContent = item.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, '$1');
                    const cleanItem = this.stripHtml(itemContent).trim();
                    if (cleanItem) {
                        result += `${index + 1}. ${cleanItem}\n`;
                    }
                });
                return result + '\n';
            });
            
            // Paragraphs
            content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (match, para) => {
                const cleanPara = this.stripHtml(para).trim();
                return cleanPara ? cleanPara + '\n\n' : '';
            });
            
            // Divs (treat as paragraphs)
            content = content.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, (match, divContent) => {
                const cleanDiv = this.stripHtml(divContent).trim();
                return cleanDiv ? cleanDiv + '\n\n' : '';
            });
            
            // Line breaks
            content = content.replace(/<br[^>]*>/gi, '\n');
            
            // Remove remaining HTML tags
            content = content.replace(/<[^>]+>/g, '');
            
            // Decode HTML entities
            content = this.decodeHtmlEntities(content);

            // Normalize inline ToC rows like: "Table of Contents - [A](#a) - [B](#b) - [C](#c)"
            content = this.convertInlineLinkRunsToList(content);

            // Clean up extra whitespace (collapse 3+ newlines) and trim edges
            content = content.replace(/\r\n?/g, '\n');
            content = content.replace(/\n{3,}/g, '\n\n');
            content = content.replace(/^\s+|\s+$/g, '');

            // Ensure block-level separation for Markdown readability
            content = this.ensureMarkdownBlockSeparation(content);

            // Final normalization: collapse any accidental 3+ newlines created above
            content = content.replace(/\n{3,}/g, '\n\n');

            // Remove stray anchor glyph-only lines (common from blog anchor icons)
            content = content.replace(/^\s*([#¶❡§•]|\u00B6|\u00A7)\s*$/gmu, '');

            // Ensure trailing newline for POSIX-friendly editors
            if (!content.endsWith('\n')) content += '\n';

            const markdown = content;
            
            console.log(`✅ Enhanced fallback conversion completed: ${markdown.length} chars`);
            
            return {
                markdown: markdown,
                imageList: imageList
            };
            
        } catch (error) {
            console.error('❌ Enhanced fallback conversion failed:', error);
            
            // Ultimate fallback: return plain text
            return {
                markdown: article.textContent || 'Conversion failed',
                imageList: {}
            };
        }
    }
    
    cleanupJavaScriptArtifacts(content) {
        // Remove specific JS artifacts injected by frameworks, conservatively
        // Do NOT remove generic braces/arrays/tokens to avoid dropping valid content (math, code, text)
        try {
            content = content.replace(/self\.__next_f[\s\S]*?\]\)/g, '');
        } catch (_) {}
        return content;
    }

    // Convert inline link runs into a bulleted list (esp. ToC rows)
    convertInlineLinkRunsToList(text) {
        if (!text || typeof text !== 'string') return text;
        const lines = text.split('\n');
        const out = lines.map((line) => {
            const links = Array.from(line.matchAll(/\[[^\]]+\]\([^)]+\)/g)).map(m => m[0]);
            if (links.length === 0) return line;

            const hasToc = /table of contents/i.test(line);
            const sepCount = (line.match(/\s(?:-\s|\|\s|•\s)/g) || []).length;

            // Heuristic: if 3+ links in a row, or labeled ToC, render as a bulleted list
            if (links.length >= 3 || (hasToc && links.length >= 2) || (hasToc && sepCount >= 1)) {
                let result = hasToc ? '## Table of Contents\n' : '';
                result += links.map(l => `- ${l}`).join('\n');
                return result;
            }

            return line;
        });
        return out.join('\n');
    }

    // Ensure Markdown block elements are separated by blank lines
    ensureMarkdownBlockSeparation(text) {
        if (!text) return '';
        let out = text;

        // Headings: ensure blank line before any heading not at start
        out = out.replace(/([^\n])\s*(#{1,6}\s[^\n]+)/g, '$1\n\n$2');
        // Ensure separation between adjacent headings (e.g., "# A# B" -> "# A\n\n# B")
        out = out.replace(/(#{1,6}\s[^\n]+)(#{1,6}\s)/g, '$1\n\n$2');

        // Fenced code blocks: ensure blank line before ```
        out = out.replace(/([^\n])\n?(```)/g, '$1\n\n$2');

        // Unordered list items: ensure blank line before first list item of a block
        out = out.replace(/([^\n])\n?(-\s[^\n]+)/g, '$1\n\n$2');

        // Ordered list items: ensure blank line before first numbered item
        out = out.replace(/([^\n])\n?(\d+\.\s[^\n]+)/g, '$1\n\n$2');

        // Blockquotes: ensure blank line before '>' blocks
        out = out.replace(/([^\n])\n?(>\s[^\n]+)/g, '$1\n\n$2');

        return out;
    }
    
    stripHtml(text) {
        if (!text) return '';
        return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }
    
    cleanHeadingText(text) {
        if (!text) return '';
        // Remove trailing anchor glyphs commonly used in blog headers
        return String(text).replace(/\s*([#¶❡§•]|\u00B6|\u00A7)+\s*$/u, '').trim();
    }
    
    decodeHtmlEntities(text) {
        const entityMap = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#x27;': "'",
            '&#x2F;': '/',
            '&#x60;': '`',
            '&#x3D;': '=',
            '&nbsp;': ' ',
            '&rsquo;': "'",
            '&lsquo;': "'",
            '&rdquo;': '"',
            '&ldquo;': '"',
            '&mdash;': '—',
            '&ndash;': '–'
        };
        
        return text.replace(/&[#\w]+;/g, (entity) => {
            return entityMap[entity] || entity;
        });
    }
    
    // Convert HTML tables to GFM Markdown tables in a lightweight way (no DOM dependency)
    convertTablesToMarkdown(html) {
        if (!html || typeof html !== 'string') return html;
        const replaceTable = (tableHtml) => {
            try {
                // Extract rows
                const rows = [];
                const theadMatch = tableHtml.match(/<thead[\s\S]*?<\/thead>/i);
                const tbodyMatch = tableHtml.match(/<tbody[\s\S]*?<\/tbody>/i);
                const body = (theadMatch ? theadMatch[0] : '') + (tbodyMatch ? tbodyMatch[0] : tableHtml);
                const trRegex = /<tr[\s\S]*?<\/tr>/gi;
                let m;
                while ((m = trRegex.exec(body))) {
                    const tr = m[0];
                    const ths = Array.from(tr.matchAll(/<th[\s\S]*?>([\s\S]*?)<\/th>/gi)).map(x => x[1]);
                    const tds = Array.from(tr.matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi)).map(x => x[1]);
                    const cells = (ths.length ? ths : tds).map(raw => {
                        let txt = this.stripHtml(raw);
                        txt = this.decodeHtmlEntities(txt);
                        txt = txt.replace(/\|/g, '\\|').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
                        return txt;
                    });
                    if (cells.length) rows.push(cells);
                }
                if (rows.length === 0) return '';

                // Determine header
                const headerFromThead = /<thead[\s\S]*?<\/thead>/i.test(tableHtml);
                let header = null;
                let bodyRows = rows;
                if (headerFromThead || /<th\b/i.test(tableHtml)) {
                    header = rows[0];
                    bodyRows = rows.slice(1);
                } else {
                    header = rows[0];
                    bodyRows = rows.slice(1);
                }

                const colCount = Math.max(header.length, ...bodyRows.map(r => r.length));
                const normalize = (arr) => {
                    const out = arr.slice(0, colCount);
                    while (out.length < colCount) out.push('');
                    return out;
                };
                header = normalize(header);
                bodyRows = bodyRows.map(normalize);

                // Build Markdown
                const rowToMd = (cells) => `| ${cells.join(' | ')} |`;
                const sep = `| ${new Array(colCount).fill('---').join(' | ')} |`;
                const lines = [rowToMd(header), sep, ...bodyRows.map(rowToMd)];
                return '\n\n' + lines.join('\n') + '\n\n';
            } catch (_) {
                return tableHtml; // fallback: keep original if parsing fails
            }
        };
        return html.replace(/<table[\s\S]*?<\/table>/gi, replaceTable);
    }
    
    resolveUrl(href, baseURI) {
        try {
            if (!href) return '';
            try { new URL(href); return href; } catch (_) {}
            return new URL(href, baseURI || self.location?.origin || undefined).href;
        } catch (_) { return href; }
    }
    
    generateImageFilename(src, options = {}, pageTitle = '') {
        let prefix = options.imagePrefix || '';
        if (prefix) {
            const titleClean = (pageTitle || 'Untitled')
                .replace(/[\x00-\x1F<>:"/\\|?*]/g, '_')
                .replace(/\s+/g, '_')
                .replace(/^_+|_+$/g, '');
            prefix = prefix.replace('{pageTitle}', titleClean);
            if (prefix && !prefix.endsWith('/')) prefix += '/';
        }

        let base = '';
        if (typeof src === 'string' && src.startsWith('data:')) {
            const m = /^data:([^;]+);base64,/.exec(src);
            const mime = m ? m[1] : 'image/png';
            const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp' };
            const ext = extMap[mime] || 'png';
            base = `image_${Date.now()}.${ext}`;
        } else {
            const noQuery = src.split('?')[0].split('#')[0];
            const parts = noQuery.split('/');
            base = parts[parts.length - 1] || 'image';
            if (!/\.[A-Za-z0-9]+$/.test(base)) base = base + '.jpg';
        }
        base = base.replace(/[\x00-\x1F<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').replace(/^_+|_+$/g, '');
        return prefix + base;
    }
    
    async embedImagesAsBase64(markdown, imageList) {
        const entries = Object.entries(imageList || {});
        for (const [src] of entries) {
            try {
                const res = await fetch(src);
                const blob = await res.blob();
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                markdown = markdown.split(src).join(String(dataUrl));
            } catch (e) {
                console.warn('embedImagesAsBase64 failed for', src, e?.message);
            }
        }
        return markdown;
    }
    
    async downloadImages(imageList) {
        const out = [];
        for (const [src, dest] of Object.entries(imageList || {})) {
            try {
                // Help enforce filename via onDeterminingFilename
                try { pendingFilenameByUrl.set(src, dest); } catch (_) {}
                const id = await browser.downloads.download({ url: src, filename: dest, saveAs: false });
                try { urlByDownloadId.set(id, src); } catch (_) {}
                out.push(id);
            } catch (e) {
                console.warn('download image failed', src, e?.message);
            }
        }
        return out;
    }
    
    formatTitle(title, options) {
        if (!title) return 'Untitled';
        
        // Basic title formatting
        let formattedTitle = title.trim();
        
        // Remove disallowed characters if specified
        if (options.disallowedChars) {
            const disallowedRegex = new RegExp(`[${options.disallowedChars.replace(/[\[\]\\-]/g, '\\$&')}]`, 'g');
            formattedTitle = formattedTitle.replace(disallowedRegex, '');
        }
        
        return formattedTitle;
    }
    
    generateFilename(title, options = {}) {
        // 处理输入验证
        if (title == null) {
            console.warn('⚠️ generateFilename received null/undefined title');
            title = 'Untitled';
        }
        
        let filename = String(title).trim();
        
        // 如果输入为空字符串，使用默认名称
        if (filename.length === 0) {
            filename = 'Untitled';
        }

        // 统一清理：移除所有跨平台非法字符
        // - 始终替换为下划线，保持可读性
        // - 强制包含控制字符、尖括号、冒号、引号、斜杠、反斜杠、竖线、问号、星号
        // 用转义序列表示控制字符范围，避免在源码中嵌入真实的 NUL 等控制字符
        // 字符类最终形式：[\x00-\x1F<>:"/\\|?*<userIllegal>]
        const baseIllegal = '\\x00-\\x1F<>:"/\\\\|?*';
        const userIllegal = (options.disallowedChars ? String(options.disallowedChars) : '')
          .replace(/[\[\]\\-]/g, '\\$&');
        const illegalClass = `[${baseIllegal}${userIllegal}]`;
        filename = filename.replace(new RegExp(illegalClass, 'g'), '_');
        
        // 移除相对路径序列，避免子目录/路径穿越
        filename = filename.replace(/\.\.+/g, '.');
        filename = filename.replace(/[\\/]+/g, '_');

        // 清理连续的下划线和空格为单个下划线，并去除首尾下划线
        filename = filename.replace(/[_\s]+/g, '_').replace(/^_+|_+$/g, '');

        // 如果清理后为空或只有下划线/空格，使用默认名称
        if (!filename || filename.replace(/[_\s]+/g, '') === '') {
            filename = 'Untitled';
        }

        // 处理Windows保留名
        const reserved = ['CON','PRN','AUX','NUL','COM1','COM2','COM3','COM4','LPT1','LPT2','LPT3'];
        const base = filename.split('.')[0].toUpperCase();
        if (reserved.includes(base)) {
            filename = filename + '_';
        }

        // 移除结尾的空格与点（Windows 不允许）
        filename = filename.replace(/[\s\.]+$/g, '');

        // 限制文件名长度（为扩展名留出空间）
        const maxLength = 200;
        if (filename.length > maxLength) {
            filename = filename.substring(0, maxLength);
        }

        // 确保以.md结尾
        if (!filename.endsWith('.md')) {
            // 如果加上.md会超长，截断一些内容
            if (filename.length + 3 > 255) {
                filename = filename.substring(0, 252);
            }
            filename += '.md';
        }

        return filename;
    }
    
    async downloadMarkdownFile(markdown, filename) {
        try {
            // 验证输入参数
            if (!markdown || typeof markdown !== 'string') {
                throw new Error('Invalid markdown content provided');
            }
            
            if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
                throw new Error('Invalid filename provided');
            }
            
            // 最终文件名验证
            const safeFilename = filename.trim();
            if (safeFilename.length === 0) {
                throw new Error('Filename cannot be empty after cleaning');
            }
            
            // 优先使用 Blob URL；若不可用（MV3 SW 中可能缺失），回退到 data URL
            let downloadUrl = '';
            try {
                if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
                    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
                    downloadUrl = URL.createObjectURL(blob);
                } else {
                    throw new Error('createObjectURL not available');
                }
            } catch (_) {
                downloadUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);
            }

            // 记录以便 onDeterminingFilename 强制使用我们提供的名称
            pendingFilenameByUrl.set(downloadUrl, safeFilename);

            // 使用Chrome下载API
            const downloadOptions = {
                url: downloadUrl,
                filename: safeFilename,
                conflictAction: 'uniquify',
                saveAs: false // 直接下载到默认位置
            };
            
            const downloadId = await browser.downloads.download(downloadOptions);
            // 保存映射以便完成后释放 URL
            urlByDownloadId.set(downloadId, downloadUrl);
            console.log(`📥 下载开始: ${safeFilename} (ID: ${downloadId})`);
            
            return downloadId;
            
        } catch (error) {
            console.error('❌ 下载失败:', error);
            throw new Error(`Download failed: ${error.message}`);
        }
    }
}

// ============================================================================
// GLOBAL SERVICE WORKER INSTANCE
// ============================================================================

const swState = new ServiceWorkerState();

// Store default escape function
if (typeof TurndownService !== 'undefined') {
    TurndownService.prototype.defaultEscape = TurndownService.prototype.escape;
}

// ============================================================================
// MESSAGE HANDLER REGISTRATION
// ============================================================================

// Register message handler
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Message received:', message?.type || message?.action);
    
    if (!swState.isInitialized) {
        console.log('⏳ Service worker not initialized, queuing message');
        swState.messageQueue.push({ message, sender, sendResponse });
        return true; // Keep message channel open
    }
    
    // Handle message asynchronously
    swState.handleMessage(message, sender, sendResponse);
    return true; // Keep message channel open for async response
});

swState.healthStatus.messageHandler = 'registered';
console.log('📡 Message handlers registered');

// ============================================================================
// CONTEXT MENUS SETUP
// ============================================================================

// Initialize context menus
if (typeof createMenus === 'function') {
    try {
        createMenus();
        swState.healthStatus.contextMenus = 'created';
        console.log('📋 Context menus created');
    } catch (error) {
        console.error('❌ Failed to create context menus:', error);
        swState.healthStatus.contextMenus = 'failed';
    }
} else {
    console.debug('⚠️ createMenus function not available');
    swState.healthStatus.contextMenus = 'not_available';
}

// ============================================================================
// SERVICE WORKER LIFECYCLE EVENTS
// ============================================================================

// Install event
self.addEventListener('install', (event) => {
    console.log('⚡ Service Worker installing...');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activated');
    event.waitUntil(clients.claim());
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize the service worker
(async function initialize() {
    try {
        console.log('🔧 Initializing service worker...');
        
        // Log platform info
        try {
            const platformInfo = await browser.runtime.getPlatformInfo();
            const browserInfo = browser.runtime.getBrowserInfo ? 
                await browser.runtime.getBrowserInfo() : 
                "Can't get browser info";
            console.info('🔍 Platform:', platformInfo, browserInfo);
        } catch (error) {
            console.warn('⚠️ Could not get platform info:', error);
        }
        
        // Mark as initialized
        swState.markInitialized();
        
        console.log('✅ Service Worker fully operational');
        console.log('📊 Health Status:', swState.healthStatus);
        
    } catch (error) {
        console.error('❌ Service worker initialization failed:', error);
        swState.healthStatus.serviceWorker = 'failed';
    }
})();
