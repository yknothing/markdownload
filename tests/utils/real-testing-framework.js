/**
 * 真实测试框架
 * 
 * 目的：提供最小化Mock、最大化真实逻辑的测试工具集
 * 解决过度Mock导致的假阳性测试问题
 */

const TurndownService = require('turndown');
const turndownPluginGfm = require('turndown-plugin-gfm');
const { JSDOM } = require('jsdom');

/**
 * 创建最小化Mock的测试环境
 * 只Mock不可测试的浏览器API，保留所有业务逻辑
 */
function createRealTestingEnvironment() {
  // ✅ 只Mock浏览器特定API
  if (!global.browser) {
    global.browser = {
      runtime: {
        getURL: jest.fn(url => `chrome-extension://test-extension/${url}`),
        sendMessage: jest.fn().mockResolvedValue({ success: true }),
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      downloads: {
        download: jest.fn().mockResolvedValue(123),
        onChanged: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue()
        }
      },
      contextMenus: {
        create: jest.fn(),
        update: jest.fn(),
        removeAll: jest.fn()
      }
    };
  }

  // ✅ Mock DOM相关API（测试环境必须）
  if (!global.DOMParser) {
    global.DOMParser = jest.fn(() => ({
      parseFromString: jest.fn((str, mimeType) => {
        const dom = new JSDOM(str, { 
          url: 'https://example.com',
          contentType: mimeType 
        });
        return dom.window.document;
      })
    }));
  }

  if (!global.URL) {
    global.URL = class extends require('url').URL {
      static createObjectURL = jest.fn(() => 'blob:mock-url');
      static revokeObjectURL = jest.fn();
    };
  }

  if (!global.Blob) {
    global.Blob = jest.fn((data, options) => ({
      data,
      options,
      type: options?.type || 'text/plain'
    }));
  }

  // ✅ 最小化Mock XMLHttpRequest（仅用于图片下载测试）
  if (!global.XMLHttpRequest) {
    global.XMLHttpRequest = jest.fn(() => ({
      open: jest.fn(),
      send: jest.fn(),
      setRequestHeader: jest.fn(),
      onload: null,
      onerror: null,
      response: new global.Blob(['mock-image-data'], { type: 'image/jpeg' }),
      responseType: 'blob',
      status: 200
    }));
  }

  // ❌ 不Mock核心业务逻辑
  // 如 validateUri, generateValidFileName, textReplace 等
  // 这些应该使用真实实现进行测试
}

/**
 * 创建真实的TurndownService实例
 * 用于替代过度简化的Mock
 */
function createRealTurndownService(options = {}) {
  const defaultOptions = {
    headingStyle: 'atx',
    hr: '___',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    ...options
  };

  const service = new TurndownService(defaultOptions);
  
  // 使用真实的GFM插件
  if (turndownPluginGfm && turndownPluginGfm.gfm) {
    service.use(turndownPluginGfm.gfm);
  }

  return service;
}

/**
 * 真实网页内容测试数据
 * 基于实际网页结构，而非简化的测试HTML
 */
const realWorldHTMLSamples = {
  /**
   * 典型博客文章结构
   */
  blogArticle: `
    <article class="post">
      <header class="post-header">
        <h1 class="post-title">深度学习在自然语言处理中的应用</h1>
        <div class="post-meta">
          <span class="author">作者：王小明</span>
          <time datetime="2024-01-15T10:30:00Z">2024年1月15日</time>
          <span class="category">分类：<a href="/category/ai">人工智能</a></span>
        </div>
      </header>

      <div class="post-content">
        <p class="lead">深度学习技术在自然语言处理领域取得了突破性进展，从机器翻译到文本生成，各种应用层出不穷。</p>

        <h2 id="transformer-architecture">1. Transformer架构</h2>
        <p>Transformer架构是现代NLP的基础，其自注意力机制revolutionized了序列建模：</p>
        <ul>
          <li><strong>自注意力机制</strong> - 允许模型直接建模长距离依赖</li>
          <li><strong>并行计算</strong> - 相比RNN具有更好的训练效率</li>
          <li><strong>位置编码</strong> - 为序列提供位置信息</li>
        </ul>

        <h3>数学表达</h3>
        <p>注意力机制的核心公式：</p>
        <pre><code class="language-python">
def attention(Q, K, V, mask=None):
    d_k = Q.size(-1)
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)
    attention_weights = F.softmax(scores, dim=-1)
    return torch.matmul(attention_weights, V), attention_weights
        </code></pre>

        <h2 id="practical-applications">2. 实际应用案例</h2>
        
        <h3>机器翻译</h3>
        <blockquote>
          <p>现代神经机器翻译系统能够达到接近人类水平的翻译质量，特别是在高资源语言对上。</p>
          <cite>—— 《神经机器翻译综述》</cite>
        </blockquote>

        <table>
          <thead>
            <tr>
              <th>模型</th>
              <th>BLEU Score</th>
              <th>发布年份</th>
              <th>特点</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Transformer</td>
              <td>28.4</td>
              <td>2017</td>
              <td>首个纯注意力模型</td>
            </tr>
            <tr>
              <td>GPT-3</td>
              <td>32.1</td>
              <td>2020</td>
              <td>大规模预训练</td>
            </tr>
            <tr>
              <td>ChatGPT</td>
              <td>35.7</td>
              <td>2022</td>
              <td>指令微调</td>
            </tr>
          </tbody>
        </table>

        <h3>文本摘要</h3>
        <p>自动文本摘要技术已经应用到新闻聚合、论文总结等多个场景。主要方法包括：</p>
        <ol>
          <li><strong>抽取式摘要</strong> - 直接从原文选择重要句子</li>
          <li><strong>生成式摘要</strong> - 基于理解生成新的摘要文本</li>
          <li><strong>混合式摘要</strong> - 结合抽取和生成的优势</li>
        </ol>

        <div class="code-example">
          <h4>示例：使用Hugging Face进行文本摘要</h4>
          <pre><code class="language-python">
from transformers import pipeline

# 初始化摘要模型
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# 对长文本进行摘要
text = """
人工智能的发展历程可以追溯到20世纪50年代...
[此处省略大量文本]
"""

summary = summarizer(text, max_length=130, min_length=30, do_sample=False)
print(summary[0]['summary_text'])
          </code></pre>
        </div>

        <h2 id="challenges-and-future">3. 挑战与未来发展</h2>
        <p>尽管深度学习在NLP领域取得了巨大成功，但仍面临诸多挑战：</p>
        
        <dl>
          <dt>可解释性</dt>
          <dd>深度学习模型通常是"黑盒"，难以解释其决策过程。</dd>
          
          <dt>数据偏见</dt>
          <dd>训练数据中的偏见会被模型学习并放大。</dd>
          
          <dt>计算资源</dt>
          <dd>大型语言模型需要大量的计算资源进行训练和推理。</dd>
        </dl>

        <div class="warning">
          <p><strong>⚠️ 注意：</strong>在部署AI系统时，需要考虑伦理、隐私和安全等因素。</p>
        </div>
      </div>

      <footer class="post-footer">
        <div class="tags">
          <span>标签：</span>
          <a href="/tag/deep-learning" rel="tag">深度学习</a>
          <a href="/tag/nlp" rel="tag">自然语言处理</a>
          <a href="/tag/transformer" rel="tag">Transformer</a>
        </div>
        
        <div class="share">
          <a href="https://twitter.com/intent/tweet?text=..." target="_blank">分享到Twitter</a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=..." target="_blank">分享到Facebook</a>
        </div>
      </footer>
    </article>
  `,

  /**
   * 技术文档页面
   */
  technicalDoc: `
    <div class="documentation">
      <nav class="sidebar">
        <h2>目录</h2>
        <ul class="toc">
          <li><a href="#introduction">介绍</a></li>
          <li><a href="#installation">安装</a>
            <ul>
              <li><a href="#prerequisites">前置条件</a></li>
              <li><a href="#npm-install">NPM安装</a></li>
            </ul>
          </li>
          <li><a href="#api-reference">API参考</a></li>
          <li><a href="#examples">示例</a></li>
        </ul>
      </nav>

      <main class="content">
        <section id="introduction">
          <h1>MarkdownLoad - HTML到Markdown转换器</h1>
          <p>MarkdownLoad是一个强大的浏览器扩展，可以将网页内容转换为clean、结构化的Markdown格式。</p>
          
          <div class="feature-list">
            <h3>主要功能</h3>
            <ul>
              <li>🚀 快速转换 - 一键将网页转换为Markdown</li>
              <li>🖼️ 图片处理 - 支持本地下载和链接保留</li>
              <li>📝 格式保持 - 保留表格、代码块、列表等格式</li>
              <li>⚙️ 高度可定制 - 丰富的配置选项</li>
            </ul>
          </div>
        </section>

        <section id="installation">
          <h2>安装指南</h2>
          
          <h3 id="prerequisites">前置条件</h3>
          <p>在安装之前，请确保您的环境满足以下要求：</p>
          <ul>
            <li>Chrome 88+ 或 Firefox 85+</li>
            <li>支持Manifest V3的浏览器</li>
          </ul>

          <h3 id="npm-install">从Chrome应用商店安装</h3>
          <ol>
            <li>打开<a href="https://chrome.google.com/webstore">Chrome应用商店</a></li>
            <li>搜索"MarkdownLoad"</li>
            <li>点击"添加到Chrome"</li>
            <li>确认权限并完成安装</li>
          </ol>

          <div class="info-box">
            <p><strong>💡 提示：</strong>安装后，扩展图标会出现在工具栏中。</p>
          </div>
        </section>

        <section id="api-reference">
          <h2>API参考</h2>
          
          <h3>turndown(content, options, article)</h3>
          <p>核心转换函数，将HTML内容转换为Markdown。</p>
          
          <h4>参数</h4>
          <table class="api-table">
            <thead>
              <tr>
                <th>参数名</th>
                <th>类型</th>
                <th>必需</th>
                <th>描述</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>content</code></td>
                <td>string</td>
                <td>是</td>
                <td>要转换的HTML内容</td>
              </tr>
              <tr>
                <td><code>options</code></td>
                <td>Object</td>
                <td>否</td>
                <td>转换选项配置</td>
              </tr>
              <tr>
                <td><code>article</code></td>
                <td>Object</td>
                <td>否</td>
                <td>文章元数据</td>
              </tr>
            </tbody>
          </table>

          <h4>返回值</h4>
          <pre><code class="language-javascript">
{
  markdown: string,    // 转换后的Markdown内容
  imageList: Object   // 图片列表信息
}
          </code></pre>
        </section>

        <section id="examples">
          <h2>使用示例</h2>
          
          <h3>基本使用</h3>
          <pre><code class="language-javascript">
// 基本转换
const html = '&lt;h1&gt;标题&lt;/h1&gt;&lt;p&gt;段落内容&lt;/p&gt;';
const result = turndown(html);
console.log(result.markdown);
// 输出: # 标题\n\n段落内容
          </code></pre>

          <h3>带选项的转换</h3>
          <pre><code class="language-javascript">
const options = {
  headingStyle: 'setext',
  codeBlockStyle: 'indented',
  fence: '~~~',
  emDelimiter: '*',
  strongDelimiter: '__'
};

const result = turndown(html, options);
          </code></pre>

          <h3>处理图片</h3>
          <pre><code class="language-javascript">
const htmlWithImages = \`
  &lt;div&gt;
    &lt;img src="/path/to/image.jpg" alt="示例图片"&gt;
    &lt;p&gt;图片描述&lt;/p&gt;
  &lt;/div&gt;
\`;

const options = {
  downloadImages: true,
  imageStyle: 'markdown'
};

const article = {
  baseURI: 'https://example.com'
};

const result = turndown(htmlWithImages, options, article);
          </code></pre>
        </section>
      </main>
    </div>
  `,

  /**
   * 带有复杂表格和数据的页面
   */
  dataRichPage: `
    <div class="report">
      <header>
        <h1>2024年第一季度业绩报告</h1>
        <p class="subtitle">全面分析公司各项业务指标</p>
      </header>

      <section class="executive-summary">
        <h2>执行摘要</h2>
        <p>本季度公司实现了<strong>15%</strong>的营收增长，达到<em>$2.5亿美元</em>。主要增长驱动因素包括：</p>
        <ul>
          <li>新产品线的成功推出</li>
          <li>国际市场的拓展</li>
          <li>运营效率的提升</li>
        </ul>
      </section>

      <section class="financial-data">
        <h2>财务数据</h2>
        
        <h3>收入构成</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>产品线</th>
              <th>Q1 2024 ($M)</th>
              <th>Q1 2023 ($M)</th>
              <th>同比增长</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>云服务</td>
              <td>120.5</td>
              <td>95.2</td>
              <td>+26.6%</td>
              <td>48.2%</td>
            </tr>
            <tr>
              <td>软件许可</td>
              <td>75.3</td>
              <td>78.9</td>
              <td>-4.6%</td>
              <td>30.1%</td>
            </tr>
            <tr>
              <td>专业服务</td>
              <td>54.2</td>
              <td>43.1</td>
              <td>+25.8%</td>
              <td>21.7%</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td><strong>总计</strong></td>
              <td><strong>250.0</strong></td>
              <td><strong>217.2</strong></td>
              <td><strong>+15.1%</strong></td>
              <td><strong>100.0%</strong></td>
            </tr>
          </tfoot>
        </table>

        <h3>地区分布</h3>
        <table class="region-table">
          <thead>
            <tr>
              <th rowspan="2">地区</th>
              <th colspan="2">收入 ($M)</th>
              <th rowspan="2">增长率</th>
            </tr>
            <tr>
              <th>Q1 2024</th>
              <th>Q1 2023</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>北美</td>
              <td>125.0</td>
              <td>115.5</td>
              <td>+8.2%</td>
            </tr>
            <tr>
              <td>欧洲</td>
              <td>87.5</td>
              <td>72.3</td>
              <td>+21.0%</td>
            </tr>
            <tr>
              <td>亚太</td>
              <td>37.5</td>
              <td>29.4</td>
              <td>+27.6%</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="kpi-metrics">
        <h2>关键绩效指标</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <h4>客户获取成本 (CAC)</h4>
            <p class="metric-value">$1,245</p>
            <p class="metric-change decrease">↓ 8.5% vs Q4</p>
          </div>
          <div class="metric-card">
            <h4>客户生命周期价值 (LTV)</h4>
            <p class="metric-value">$15,680</p>
            <p class="metric-change increase">↑ 12.3% vs Q4</p>
          </div>
          <div class="metric-card">
            <h4>月活跃用户</h4>
            <p class="metric-value">2.8M</p>
            <p class="metric-change increase">↑ 18.7% vs Q4</p>
          </div>
        </div>
      </section>
    </div>
  `
};

/**
 * 验证转换结果的工具函数
 */
function validateMarkdownConversion(markdown, expectedElements) {
  const validations = [];

  expectedElements.forEach(element => {
    switch (element.type) {
      case 'heading':
        const headingPattern = new RegExp(`^#{${element.level}} ${element.text}`, 'm');
        validations.push({
          type: 'heading',
          text: element.text,
          passed: headingPattern.test(markdown)
        });
        break;
        
      case 'table':
        const hasTableHeader = markdown.includes('|') && markdown.includes('---');
        validations.push({
          type: 'table',
          passed: hasTableHeader
        });
        break;
        
      case 'code':
        const codePattern = element.inline 
          ? new RegExp(`\`${element.text}\``)
          : new RegExp(`\`\`\`${element.language || ''}[\\s\\S]*?${element.text}[\\s\\S]*?\`\`\``);
        validations.push({
          type: 'code',
          text: element.text,
          passed: codePattern.test(markdown)
        });
        break;
        
      case 'list':
        const listPattern = element.ordered 
          ? /^\d+\. /m 
          : /^- /m;
        validations.push({
          type: 'list',
          ordered: element.ordered,
          passed: listPattern.test(markdown)
        });
        break;
    }
  });

  return validations;
}

module.exports = {
  createRealTestingEnvironment,
  createRealTurndownService,
  realWorldHTMLSamples,
  validateMarkdownConversion
};