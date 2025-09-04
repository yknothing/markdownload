/**
 * MarkDownload 最终版 Popup Script
 * 简洁的界面，专注于核心功能：下载Markdown文件
 */

console.log('🚀 MarkDownload Final Popup: 加载中...');

// ============================================================================
// 状态管理
// ============================================================================

let browserAPIReady = false;
let serviceWorkerReady = false;

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
            console.log('🔌 测试服务工作者连接...');
            
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
// 内容提取
// ============================================================================

class ContentExtractor {
    async extractFromCurrentTab() {
        try {
            console.log('📋 从当前标签页提取内容...');
            
            // 获取当前活动标签页
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            const currentTab = tabs[0];
            
            if (!currentTab) {
                throw new Error('未找到活动标签页');
            }
            
            console.log(`📄 正在提取: ${currentTab.title} (${currentTab.url})`);
            
            // 使用脚本API提取DOM内容
            const results = await browser.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: () => {
                    try {
                        // 获取完整文档HTML
                        const dom = document.documentElement.outerHTML;
                        
                        // 获取选中的文本（如果有）
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
                console.log(`📊 选择长度: ${extractedData.selection?.length || 0} 字符`);
                
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
// 剪辑功能
// ============================================================================

async function clipAndDownload() {
    try {
        console.log('🔄 开始页面剪辑和下载过程...');
        
        // 显示加载状态
        showStatus('🔄 提取内容中...', 'loading');
        disableButton(true);
        
        // 检查服务工作者连接
        if (!serviceWorkerReady) {
            showStatus('🔌 连接服务工作者...', 'loading');
            const connected = await swCommunicator.initialize();
            if (!connected) {
                throw new Error('无法连接到服务工作者');
            }
        }
        
        // 从当前标签页提取内容
        showStatus('📄 处理页面内容...', 'loading');
        const extractedContent = await contentExtractor.extractFromCurrentTab();
        
        // 获取用户选项
        let options;
        try {
            options = await browser.storage.sync.get(defaultOptions);
        } catch (error) {
            console.warn('⚠️ 无法加载用户选项，使用默认值:', error);
            options = defaultOptions;
        }
        
        // 发送剪辑请求到服务工作者
        showStatus('🔄 转换为Markdown...', 'loading');
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
            console.log('✅ 剪辑和下载完成');
            
            // 显示结果
            displayResult(response.markdown, response.title, response.filename);
            showStatus(`✅ 已下载: ${response.filename}`, 'success');
            
        } else {
            throw new Error(response?.error || '剪辑失败 - 未知错误');
        }
        
    } catch (error) {
        console.error('❌ 剪辑失败:', error);
        showStatus(`❌ 错误: ${error.message}`, 'error');
        
        // 在markdown区域显示错误详情
        displayError(error);
    } finally {
        disableButton(false);
    }
}

// ============================================================================
// UI函数
// ============================================================================

function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        let icon = '🔄';
        switch (type) {
            case 'success': icon = '✅'; break;
            case 'error': icon = '❌'; break;
            case 'loading': icon = '🔄'; break;
            default: icon = 'ℹ️'; break;
        }
        
        statusElement.innerHTML = `<span class="icon">${icon}</span>${message}`;
        statusElement.className = `status ${type}`;
    }
    console.log(`📢 状态: ${message}`);
}

function disableButton(disabled) {
    const button = document.getElementById('clip-button');
    if (button) {
        button.disabled = disabled;
        if (disabled) {
            button.innerHTML = '<span class="icon">⏳</span>处理中...';
        } else {
            button.innerHTML = '<span class="icon">📄</span>下载为 Markdown';
        }
    }
}

function displayResult(markdown, title, filename) {
    const markdownElement = document.getElementById('markdown-output');
    const titleElement = document.getElementById('page-title');
    
    if (titleElement && title) {
        titleElement.textContent = `已处理: ${title}`;
    }
    
    if (markdownElement) {
        // 显示markdown的前500个字符作为预览
        const preview = markdown.length > 500 ? 
            markdown.substring(0, 500) + '\n\n... (已截断, 完整内容已保存到文件)' : 
            markdown;
        markdownElement.textContent = preview;
        markdownElement.style.display = 'block';
    }
}

function displayError(error) {
    const errorMarkdown = `# 剪辑错误\n\n**错误:** ${error.message}\n\n**时间:** ${new Date().toISOString()}\n\n**解决方法:**\n- 重新加载扩展\n- 检查页面是否完全加载\n- 验证扩展对此网站有权限`;
    
    displayResult(errorMarkdown, '错误报告', 'error.md');
}

// ============================================================================
// 事件处理器
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 Popup DOM已加载，正在初始化...');
    
    try {
        // 初始化浏览器API
        if (typeof browser !== 'undefined') {
            browserAPIReady = true;
            console.log('✅ 浏览器API可用');
        } else {
            throw new Error('浏览器API不可用');
        }
        
        // 设置事件监听器
        const clipButton = document.getElementById('clip-button');
        if (clipButton) {
            clipButton.addEventListener('click', clipAndDownload);
            console.log('🔘 剪辑按钮事件监听器已附加');
        }
        
        // 初始化服务工作者连接
        showStatus('🔌 初始化连接...', 'loading');
        const connected = await swCommunicator.initialize();
        
        if (connected) {
            showStatus('✅ 准备剪辑页面', 'success');
        } else {
            showStatus('⚠️ 连接问题', 'error');
        }
        
        console.log('✅ Popup初始化完成');
        
    } catch (error) {
        console.error('❌ Popup初始化失败:', error);
        showStatus(`❌ 初始化失败: ${error.message}`, 'error');
    }
});

// 处理popup关闭
window.addEventListener('beforeunload', () => {
    console.log('📱 Popup关闭中...');
});