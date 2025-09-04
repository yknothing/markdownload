/**
 * MarkDownload 优化版 Popup Script
 * 实现：打开时自动转换，分离转换和下载功能，全文预览
 */

console.log('🚀 MarkDownload Optimized Popup: 加载中...');

// ============================================================================
// 状态管理
// ============================================================================

let browserAPIReady = false;
let serviceWorkerReady = false;
let currentMarkdown = null;
let currentFilename = null;
let currentPageInfo = null;
let currentImageList = {};

// ============================================================================
// 服务工作者通信
// ============================================================================

class ServiceWorkerCommunicator {
    constructor() {
        this.isReady = false;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }
    
    async initialize() {
        try {
            const response = await this.sendMessage({
                type: 'health-check',
                timestamp: Date.now()
            });
            
            if (response && response.success) {
                this.isReady = true;
                serviceWorkerReady = true;
                console.log('✅ 服务工作者连接成功');
                return true;
            } else {
                throw new Error('服务工作者健康检查失败');
            }
        } catch (error) {
            console.error('❌ 服务工作者初始化失败:', error);
            this.isReady = false;
            serviceWorkerReady = false;
            return false;
        }
    }
    
    async sendMessage(message, retryCount = 0) {
        try {
            console.log(`📤 发送消息: ${message.type}`);
            const response = await browser.runtime.sendMessage(message);
            
            if (response) {
                console.log(`📥 收到响应: ${message.type}`, response.success ? '✅' : '❌');
                return response;
            } else {
                throw new Error('服务工作者无响应');
            }
        } catch (error) {
            console.error(`❌ 消息发送失败 (尝试 ${retryCount + 1}):`, error);
            
            if (retryCount < this.retryAttempts) {
                console.log(`🔄 ${this.retryDelay}ms后重试...`);
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
// 内容提取器
// ============================================================================

class ContentExtractor {
    async extractFromCurrentTab() {
        try {
            console.log('📋 从当前标签页提取内容...');
            
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            const currentTab = tabs[0];
            
            if (!currentTab) {
                throw new Error('未找到活动标签页');
            }
            
            console.log(`📄 正在提取: ${currentTab.title} (${currentTab.url})`);
            
            const results = await browser.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: () => {
                    try {
                        const dom = document.documentElement.outerHTML;
                        const selection = window.getSelection ? window.getSelection().toString() : '';
                        
                        return {
                            dom: dom,
                            selection: selection,
                            title: document.title,
                            url: window.location.href
                        };
                    } catch (error) {
                        console.error('内容提取错误:', error);
                        return {
                            dom: document.documentElement ? document.documentElement.outerHTML : '',
                            selection: '',
                            title: document.title || '无标题',
                            url: window.location.href
                        };
                    }
                }
            });
            
            if (results && results[0] && results[0].result) {
                const extractedData = results[0].result;
                console.log('✅ 内容提取成功');
                console.log(`📊 DOM长度: ${extractedData.dom?.length || 0} 字符`);
                
                return {
                    ...extractedData,
                    tabId: currentTab.id,
                    baseURI: currentTab.url
                };
            } else {
                throw new Error('从标签页提取内容失败');
            }
        } catch (error) {
            console.error('❌ 内容提取失败:', error);
            throw error;
        }
    }
}

const contentExtractor = new ContentExtractor();

// ============================================================================
// 核心功能
// ============================================================================

async function convertToMarkdown() {
    try {
        console.log('🔄 开始转换为Markdown...');
        
        showStatus('loading', '正在提取页面内容...');
        setButtonState('refresh', 'loading');
        
        // 检查服务工作者连接
        if (!serviceWorkerReady) {
            showStatus('loading', '连接服务工作者...');
            const connected = await swCommunicator.initialize();
            if (!connected) {
                throw new Error('无法连接到服务工作者');
            }
        }
        
        // 提取内容
        showStatus('loading', '分析页面结构...');
        const extractedContent = await contentExtractor.extractFromCurrentTab();
        currentPageInfo = extractedContent;
        
        // 显示页面信息
        displayPageInfo(extractedContent);
        
        // 获取选项
        let options;
        try {
            options = await browser.storage.sync.get(defaultOptions);
        } catch (error) {
            console.warn('⚠️ 无法加载用户选项，使用默认值:', error);
            options = defaultOptions;
        }
        
        // 转换为Markdown
        showStatus('loading', '转换为Markdown格式...');
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
            console.log('✅ 转换完成');
            
            // 保存结果
            currentMarkdown = response.markdown;
            currentFilename = response.filename;
            currentImageList = response.imageList || {};
            
            // 显示结果
            displayMarkdownPreview(response.markdown);
            showStatus('success', '转换完成！');
            
            // 启用下载按钮
            setButtonState('download', 'ready');
            
        } else {
            throw new Error(response?.error || '转换失败 - 未知错误');
        }
        
    } catch (error) {
        console.error('❌ 转换失败:', error);
        showStatus('error', `转换失败: ${error.message}`);
        displayError(error);
    } finally {
        setButtonState('refresh', 'ready');
    }
}

async function downloadMarkdown() {
    // 验证当前状态
    if (!currentMarkdown || typeof currentMarkdown !== 'string' || currentMarkdown.trim().length === 0) {
        showStatus('error', '没有可下载的Markdown内容，请先转换页面');
        return;
    }
    
    // 如果没有文件名，生成一个默认的
    let finalFilename = currentFilename;
    if (!finalFilename || typeof finalFilename !== 'string' || finalFilename.trim().length === 0) {
        console.warn('⚠️ 没有有效的文件名，生成默认文件名');
        finalFilename = generateSafeFilename(currentPageInfo?.title || 'Untitled');
    }
    
    try {
        console.log('📥 开始下载Markdown文件...');
        
        showStatus('loading', '准备下载文件...');
        setButtonState('download', 'loading');
        
        const downloadMessage = {
            type: 'download',
            markdown: currentMarkdown,
            filename: finalFilename,
            imageList: currentImageList,
            title: currentPageInfo?.title || finalFilename
        };
        
        const response = await swCommunicator.sendMessage(downloadMessage);
        
        if (response && response.success) {
            console.log('✅ 下载开始');
            showStatus('success', `文件已开始下载: ${finalFilename}`);
        } else {
            throw new Error(response?.error || '下载失败 - 未知错误');
        }
        
    } catch (error) {
        console.error('❌ 下载失败:', error);
        showStatus('error', `下载失败: ${error.message}`);
    } finally {
        setButtonState('download', 'ready');
    }
}

// ============================================================================
// 安全文件名生成函数
// ============================================================================

function generateSafeFilename(title) {
    if (!title || typeof title !== 'string') {
        return 'Untitled.md';
    }
    
    let filename = title.trim();
    
    // 如果为空，使用默认名
    if (filename.length === 0) {
        return 'Untitled.md';
    }
    
    // 移除/替换非法字符（跨平台）：控制字符、尖括号、冒号、引号、斜杠、反斜杠、竖线、问号、星号
    filename = filename.replace(/[\x00-\x1F<>:\"/\\|?*]/g, '_');

    // 防止路径片段与穿越
    filename = filename.replace(/\.\.+/g, '.');
    filename = filename.replace(/[\\/]+/g, '_');
    
    // 清理连续的下划线和空格
    filename = filename.replace(/[_\s]+/g, '_').replace(/^_+|_+$/g, '');

    // 移除结尾的点和空格（Windows 不允许）
    filename = filename.replace(/[\s\.]+$/g, '');
    
    // 如果清理后为空，使用默认名
    if (!filename || filename.length === 0) {
        return 'Untitled.md';
    }
    
    // 限制长度
    if (filename.length > 200) {
        filename = filename.substring(0, 200);
    }
    
    // 加上.md扩展名
    if (!filename.endsWith('.md')) {
        filename += '.md';
    }
    
    return filename;
}

// ============================================================================
// UI 控制函数
// ============================================================================

function showStatus(type, message) {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    let iconHtml = '';
    let className = `status ${type}`;
    
    switch (type) {
        case 'loading':
            iconHtml = '<div class="loading-spinner"></div>';
            break;
        case 'success':
            iconHtml = '<span>✅</span>';
            break;
        case 'error':
            iconHtml = '<span>❌</span>';
            break;
        default:
            iconHtml = '<span>ℹ️</span>';
            break;
    }
    
    statusElement.innerHTML = `${iconHtml}${message}`;
    statusElement.className = className;
    
    console.log(`📢 状态: ${message}`);
}

function setButtonState(buttonType, state) {
    if (buttonType === 'refresh') {
        const button = document.getElementById('refresh-button');
        const icon = document.getElementById('refresh-icon');
        if (!button || !icon) return;
        
        switch (state) {
            case 'loading':
                button.disabled = true;
                icon.innerHTML = '⏳';
                button.innerHTML = '<span id="refresh-icon">⏳</span>转换中...';
                break;
            case 'ready':
            default:
                button.disabled = false;
                icon.innerHTML = '🔄';
                button.innerHTML = '<span id="refresh-icon">🔄</span>重新转换';
                break;
        }
    } else if (buttonType === 'download') {
        const button = document.getElementById('download-button');
        if (!button) return;
        
        switch (state) {
            case 'loading':
                button.disabled = true;
                button.innerHTML = '<span>⏳</span>下载中...';
                break;
            case 'ready':
                button.disabled = false;
                button.innerHTML = '<span>📥</span>下载文件';
                break;
            case 'disabled':
            default:
                button.disabled = true;
                button.innerHTML = '<span>📥</span>下载文件';
                break;
        }
    }
}

function displayPageInfo(pageInfo) {
    const pageInfoElement = document.getElementById('page-info');
    const pageTitleElement = document.getElementById('page-title');
    const pageUrlElement = document.getElementById('page-url');
    
    if (pageInfoElement && pageTitleElement && pageUrlElement) {
        pageTitleElement.textContent = pageInfo.title || '无标题';
        pageUrlElement.textContent = pageInfo.url || '';
        pageInfoElement.style.display = 'block';
    }
}

function displayMarkdownPreview(markdown) {
    const previewElement = document.getElementById('markdown-preview');
    const wordCountElement = document.getElementById('word-count');
    
    if (previewElement) {
        previewElement.textContent = markdown;
        previewElement.classList.add('show');
        
        // 更新字数统计
        if (wordCountElement) {
            const charCount = markdown.length;
            const wordCount = markdown.split(/\s+/).filter(word => word.length > 0).length;
            wordCountElement.textContent = `${wordCount} 词，${charCount} 字符`;
        }
    }
}

function displayError(error) {
    const errorMarkdown = `# 转换错误\n\n**错误:** ${error.message}\n\n**时间:** ${new Date().toISOString()}\n\n**解决方法:**\n- 点击"重新转换"重试\n- 检查页面是否完全加载\n- 验证扩展对此网站有权限\n- 重新加载扩展`;
    
    displayMarkdownPreview(errorMarkdown);
    
    // 设置错误时的文件名
    currentFilename = 'error-report.md';
    setButtonState('download', 'ready');
}

// ============================================================================
// 事件处理
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 Popup DOM已加载，正在初始化...');
    
    try {
        // 检查浏览器API
        if (typeof browser !== 'undefined') {
            browserAPIReady = true;
            console.log('✅ 浏览器API可用');
        } else {
            throw new Error('浏览器API不可用');
        }
        
        // 设置事件监听器
        const refreshButton = document.getElementById('refresh-button');
        const downloadButton = document.getElementById('download-button');
        
        if (refreshButton) {
            refreshButton.addEventListener('click', convertToMarkdown);
            console.log('🔘 重新转换按钮事件监听器已附加');
        }
        
        if (downloadButton) {
            downloadButton.addEventListener('click', downloadMarkdown);
            console.log('🔘 下载按钮事件监听器已附加');
        }
        
        // 自动开始转换
        console.log('🔄 自动开始转换当前页面...');
        await convertToMarkdown();
        
        console.log('✅ Popup初始化完成');
        
    } catch (error) {
        console.error('❌ Popup初始化失败:', error);
        showStatus('error', `初始化失败: ${error.message}`);
    }
});

// 处理popup关闭
window.addEventListener('beforeunload', () => {
    console.log('📱 Popup关闭中...');
});
