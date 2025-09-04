/**
 * Real-world HTML test samples for comprehensive testing
 * Addresses issues with content extraction failures and edge cases
 * Based on actual website structures that previously caused problems
 */

// Modern blog post with dynamic content structure
const modernBlogPost = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Understanding Modern Web Development</title>
    <meta name="description" content="A comprehensive guide to modern web development practices">
    <meta name="author" content="Alex Smith">
    <meta property="og:title" content="Understanding Modern Web Development">
    <meta property="og:description" content="A comprehensive guide to modern web development practices">
    <meta property="og:type" content="article">
    <base href="https://techblog.example.com/">
</head>
<body>
    <header class="site-header">
        <nav aria-label="Main navigation">
            <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/blog">Blog</a></li>
                <li><a href="/about">About</a></li>
            </ul>
        </nav>
    </header>

    <main class="content-wrapper">
        <article class="post-content" role="main">
            <header class="post-header">
                <h1 class="post-title">Understanding Modern Web Development</h1>
                <div class="post-meta">
                    <time datetime="2024-01-15T10:30:00Z" class="published-date">January 15, 2024</time>
                    <span class="author-name">By Alex Smith</span>
                    <div class="reading-time">8 min read</div>
                </div>
            </header>

            <div class="post-body">
                <p class="lead">Modern web development has evolved dramatically over the past decade. This article explores the key technologies and practices that define today's development landscape.</p>

                <h2 id="frontend-frameworks">Frontend Frameworks</h2>
                <p>The rise of component-based frameworks has transformed how we build user interfaces:</p>
                
                <ul>
                    <li><strong>React</strong> - Declarative UI library with virtual DOM</li>
                    <li><strong>Vue.js</strong> - Progressive framework with excellent developer experience</li>
                    <li><strong>Angular</strong> - Full-featured framework for enterprise applications</li>
                </ul>

                <figure class="code-example">
                    <pre><code class="language-javascript">
import React from 'react';

function Welcome({ name }) {
    return <h1>Hello, {name}!</h1>;
}

export default Welcome;
                    </code></pre>
                    <figcaption>A simple React component example</figcaption>
                </figure>

                <h2 id="backend-technologies">Backend Technologies</h2>
                <p>Server-side development has also seen significant improvements:</p>

                <blockquote cite="https://nodejs.org">
                    <p>"Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine."</p>
                    <footer>— <cite>Node.js Official Documentation</cite></footer>
                </blockquote>

                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Technology</th>
                            <th>Type</th>
                            <th>Performance</th>
                            <th>Use Case</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Node.js</td>
                            <td>Runtime</td>
                            <td>High</td>
                            <td>API Development</td>
                        </tr>
                        <tr>
                            <td>Python</td>
                            <td>Language</td>
                            <td>Medium</td>
                            <td>Data Science</td>
                        </tr>
                        <tr>
                            <td>Go</td>
                            <td>Language</td>
                            <td>Very High</td>
                            <td>Microservices</td>
                        </tr>
                    </tbody>
                </table>

                <h2 id="tools-workflow">Development Tools and Workflow</h2>
                <p>Modern development relies heavily on automation and tooling:</p>

                <div class="info-box">
                    <h3>Essential Tools</h3>
                    <p>Every modern developer should be familiar with:</p>
                    <ol>
                        <li>Version control systems (Git)</li>
                        <li>Package managers (npm, yarn)</li>
                        <li>Build tools (Webpack, Vite)</li>
                        <li>Testing frameworks (Jest, Cypress)</li>
                    </ol>
                </div>

                <p>The image below shows a typical modern development workflow:</p>
                <img src="images/dev-workflow.png" alt="Modern Development Workflow Diagram" loading="lazy" width="600" height="400">
                
                <p>For more detailed information, check out the <a href="https://developer.mozilla.org/en-US/docs/Web/Guide">MDN Web Docs</a>.</p>
            </div>

            <footer class="post-footer">
                <div class="tags">
                    <span class="tag">web-development</span>
                    <span class="tag">javascript</span>
                    <span class="tag">react</span>
                    <span class="tag">node-js</span>
                </div>
                <div class="share-buttons">
                    <button class="share-btn twitter" data-url="https://techblog.example.com/modern-web-dev">Share on Twitter</button>
                    <button class="share-btn facebook" data-url="https://techblog.example.com/modern-web-dev">Share on Facebook</button>
                </div>
            </footer>
        </article>

        <aside class="sidebar">
            <div class="author-bio">
                <h3>About the Author</h3>
                <p>Alex Smith is a senior web developer with 10 years of experience in full-stack development.</p>
            </div>
            
            <div class="related-posts">
                <h3>Related Articles</h3>
                <ul>
                    <li><a href="/javascript-best-practices">JavaScript Best Practices</a></li>
                    <li><a href="/css-grid-guide">Complete CSS Grid Guide</a></li>
                </ul>
            </div>
        </aside>
    </main>

    <footer class="site-footer">
        <p>&copy; 2024 Tech Blog. All rights reserved.</p>
    </footer>

    <!-- Analytics and tracking scripts -->
    <script>
        // Google Analytics tracking code
        (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
        ga('create', 'UA-XXXXXX-X', 'auto');
        ga('send', 'pageview');
    </script>
</body>
</html>`;

// Single Page Application (SPA) structure
const spaStructure = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SPA Dashboard</title>
    <meta name="description" content="Modern single page application dashboard">
</head>
<body>
    <div id="root">
        <div class="app-container">
            <nav class="app-nav">
                <div class="nav-brand">
                    <h1>Dashboard</h1>
                </div>
                <ul class="nav-links">
                    <li><a href="#/dashboard" class="nav-link active">Dashboard</a></li>
                    <li><a href="#/analytics" class="nav-link">Analytics</a></li>
                    <li><a href="#/settings" class="nav-link">Settings</a></li>
                </ul>
            </nav>

            <main class="app-main">
                <div class="route-container" data-route="dashboard">
                    <header class="page-header">
                        <h2>Welcome to Your Dashboard</h2>
                        <p class="page-description">Monitor your key metrics and performance indicators</p>
                    </header>

                    <section class="metrics-grid">
                        <div class="metric-card" data-metric="users">
                            <h3 className="metric-title">Active Users</h3>
                            <div className="metric-value">15,247</div>
                            <div className="metric-change positive">+12%</div>
                        </div>

                        <div class="metric-card" data-metric="revenue">
                            <h3 className="metric-title">Revenue</h3>
                            <div className="metric-value">$45,892</div>
                            <div className="metric-change positive">+8.5%</div>
                        </div>

                        <div class="metric-card" data-metric="conversion">
                            <h3 className="metric-title">Conversion Rate</h3>
                            <div className="metric-value">3.24%</div>
                            <div className="metric-change negative">-2.1%</div>
                        </div>
                    </section>

                    <section class="charts-section">
                        <div class="chart-container">
                            <h3>Traffic Overview</h3>
                            <div class="chart-placeholder" data-chart="traffic">
                                <p>Chart will be rendered here by JavaScript</p>
                                <canvas id="trafficChart" width="400" height="200"></canvas>
                            </div>
                        </div>

                        <div class="chart-container">
                            <h3>User Demographics</h3>
                            <div class="chart-placeholder" data-chart="demographics">
                                <ul class="demo-list">
                                    <li>18-24: 25%</li>
                                    <li>25-34: 35%</li>
                                    <li>35-44: 22%</li>
                                    <li>45+: 18%</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section class="recent-activity">
                        <h3>Recent Activity</h3>
                        <div class="activity-list">
                            <div class="activity-item">
                                <span class="activity-time">2 minutes ago</span>
                                <span class="activity-text">New user registration from New York</span>
                            </div>
                            <div class="activity-item">
                                <span class="activity-time">5 minutes ago</span>
                                <span class="activity-text">Payment processed: $129.99</span>
                            </div>
                            <div class="activity-item">
                                <span class="activity-time">12 minutes ago</span>
                                <span class="activity-text">System backup completed successfully</span>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    </div>

    <!-- Application scripts -->
    <script>
        // Simulate SPA routing and dynamic content loading
        const routes = {
            dashboard: 'Dashboard content loaded',
            analytics: 'Analytics content loaded', 
            settings: 'Settings content loaded'
        };

        function loadRoute(route) {
            console.log('Loading route:', route);
            // Dynamic content would be loaded here
        }

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            loadRoute('dashboard');
        });
    </script>
</body>
</html>`;

// Documentation page with complex nested structure
const documentationPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation - MarkDownload Extension</title>
    <meta name="description" content="Complete API documentation for the MarkDownload browser extension">
    <meta name="keywords" content="api,documentation,markdown,browser,extension">
    <base href="https://docs.markdownload.com/">
</head>
<body>
    <div class="docs-layout">
        <aside class="docs-sidebar">
            <nav class="docs-nav">
                <div class="nav-section">
                    <h3>Getting Started</h3>
                    <ul>
                        <li><a href="#installation">Installation</a></li>
                        <li><a href="#quick-start">Quick Start</a></li>
                        <li><a href="#configuration">Configuration</a></li>
                    </ul>
                </div>

                <div class="nav-section">
                    <h3>API Reference</h3>
                    <ul>
                        <li><a href="#api-overview">Overview</a></li>
                        <li><a href="#content-extraction">Content Extraction</a></li>
                        <li><a href="#markdown-conversion">Markdown Conversion</a></li>
                        <li><a href="#options-management">Options Management</a></li>
                    </ul>
                </div>

                <div class="nav-section">
                    <h3>Examples</h3>
                    <ul>
                        <li><a href="#basic-usage">Basic Usage</a></li>
                        <li><a href="#advanced-features">Advanced Features</a></li>
                        <li><a href="#troubleshooting">Troubleshooting</a></li>
                    </ul>
                </div>
            </nav>
        </aside>

        <main class="docs-content">
            <article class="docs-article">
                <header class="docs-header">
                    <h1>MarkDownload API Documentation</h1>
                    <p class="docs-subtitle">Complete reference for integrating with MarkDownload browser extension</p>
                    <div class="docs-meta">
                        <span class="version">Version 3.4.0</span>
                        <span class="last-updated">Last updated: January 15, 2024</span>
                    </div>
                </header>

                <section id="installation" class="docs-section">
                    <h2>Installation</h2>
                    <p>MarkDownload is available for multiple browsers. Follow the installation guide for your browser:</p>
                    
                    <div class="installation-grid">
                        <div class="install-option">
                            <h3>Chrome Web Store</h3>
                            <p>Install from the official Chrome Web Store for Chrome, Edge, and Chromium-based browsers.</p>
                            <a href="https://chrome.google.com/webstore" class="install-button">Install for Chrome</a>
                        </div>

                        <div class="install-option">
                            <h3>Firefox Add-ons</h3>
                            <p>Get the official Firefox version from Mozilla Add-ons.</p>
                            <a href="https://addons.mozilla.org" class="install-button">Install for Firefox</a>
                        </div>
                    </div>

                    <div class="note info">
                        <p><strong>Note:</strong> The extension requires permission to access page content for markdown conversion.</p>
                    </div>
                </section>

                <section id="api-overview" class="docs-section">
                    <h2>API Overview</h2>
                    <p>The MarkDownload extension provides several APIs for content extraction and markdown conversion:</p>

                    <h3>Core Functions</h3>
                    <div class="api-method">
                        <h4><code>convertPageToMarkdown(options)</code></h4>
                        <p>Converts the current page content to markdown format.</p>
                        
                        <h5>Parameters</h5>
                        <div class="parameter-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Required</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><code>options</code></td>
                                        <td>Object</td>
                                        <td>No</td>
                                        <td>Conversion options and settings</td>
                                    </tr>
                                    <tr>
                                        <td><code>options.includeImages</code></td>
                                        <td>Boolean</td>
                                        <td>No</td>
                                        <td>Whether to include images in output (default: true)</td>
                                    </tr>
                                    <tr>
                                        <td><code>options.baseUrl</code></td>
                                        <td>String</td>
                                        <td>No</td>
                                        <td>Base URL for relative links</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h5>Returns</h5>
                        <p>Promise that resolves to a markdown string.</p>

                        <h5>Example</h5>
                        <pre><code class="language-javascript">
// Basic usage
const markdown = await convertPageToMarkdown();

// With options
const markdown = await convertPageToMarkdown({
    includeImages: false,
    baseUrl: 'https://example.com'
});
                        </code></pre>
                    </div>

                    <div class="api-method">
                        <h4><code>extractContent(selector)</code></h4>
                        <p>Extracts and converts specific content using CSS selector.</p>
                        
                        <h5>Parameters</h5>
                        <div class="parameter-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Required</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><code>selector</code></td>
                                        <td>String</td>
                                        <td>Yes</td>
                                        <td>CSS selector for content to extract</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h5>Example</h5>
                        <pre><code class="language-javascript">
// Extract article content
const articleMarkdown = await extractContent('article.main-content');

// Extract specific section
const sectionMarkdown = await extractContent('#important-section');
                        </code></pre>
                    </div>
                </section>

                <section id="troubleshooting" class="docs-section">
                    <h2>Troubleshooting</h2>
                    
                    <div class="troubleshoot-item">
                        <h3>No readable content could be extracted</h3>
                        <p>This error occurs when the page content cannot be processed. Common causes:</p>
                        <ul>
                            <li>Page is dynamically loaded with JavaScript</li>
                            <li>Content is behind authentication</li>
                            <li>Page has unusual HTML structure</li>
                            <li>Anti-bot protection is active</li>
                        </ul>
                        
                        <h4>Solutions:</h4>
                        <ol>
                            <li>Wait for dynamic content to load before conversion</li>
                            <li>Try selecting specific content manually</li>
                            <li>Check browser console for JavaScript errors</li>
                            <li>Verify page permissions and accessibility</li>
                        </ol>
                    </div>

                    <div class="troubleshoot-item">
                        <h3>TypeError: node.className.toLowerCase is not a function</h3>
                        <p>This error indicates a DOM property is null or not a string.</p>
                        
                        <h4>Solutions:</h4>
                        <ol>
                            <li>Ensure DOM elements have valid className properties</li>
                            <li>Check for null/undefined values in DOM attributes</li>
                            <li>Update to latest version with improved error handling</li>
                        </ol>
                    </div>
                </section>
            </article>
        </main>
    </div>
</body>
</html>`;

// E-commerce product page
const ecommerceProductPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wireless Bluetooth Headphones - TechStore</title>
    <meta name="description" content="Premium wireless Bluetooth headphones with noise cancellation">
    <meta property="og:title" content="Wireless Bluetooth Headphones">
    <meta property="og:description" content="Premium wireless Bluetooth headphones with noise cancellation">
    <meta property="og:image" content="https://store.example.com/images/headphones-main.jpg">
    <meta property="product:price:amount" content="199.99">
    <meta property="product:price:currency" content="USD">
    <base href="https://store.example.com/">
</head>
<body>
    <div class="page-container">
        <header class="site-header">
            <nav class="main-nav">
                <div class="nav-brand">
                    <a href="/">TechStore</a>
                </div>
                <ul class="nav-menu">
                    <li><a href="/categories/audio">Audio</a></li>
                    <li><a href="/categories/accessories">Accessories</a></li>
                    <li><a href="/deals">Deals</a></li>
                </ul>
                <div class="nav-actions">
                    <button class="search-btn">Search</button>
                    <a href="/cart" class="cart-link">Cart (2)</a>
                </div>
            </nav>
        </header>

        <main class="product-page">
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <ol>
                    <li><a href="/">Home</a></li>
                    <li><a href="/categories">Categories</a></li>
                    <li><a href="/categories/audio">Audio</a></li>
                    <li aria-current="page">Wireless Bluetooth Headphones</li>
                </ol>
            </nav>

            <section class="product-details">
                <div class="product-gallery">
                    <div class="main-image">
                        <img src="images/headphones-main.jpg" alt="Wireless Bluetooth Headphones - Main View" id="mainProductImage">
                    </div>
                    <div class="thumbnail-gallery">
                        <button class="thumbnail active" data-image="images/headphones-main.jpg">
                            <img src="images/headphones-thumb1.jpg" alt="Main view thumbnail">
                        </button>
                        <button class="thumbnail" data-image="images/headphones-side.jpg">
                            <img src="images/headphones-thumb2.jpg" alt="Side view thumbnail">
                        </button>
                        <button class="thumbnail" data-image="images/headphones-detail.jpg">
                            <img src="images/headphones-thumb3.jpg" alt="Detail view thumbnail">
                        </button>
                    </div>
                </div>

                <div class="product-info">
                    <div class="product-header">
                        <h1 class="product-title">Premium Wireless Bluetooth Headphones</h1>
                        <div class="product-rating">
                            <div class="stars" aria-label="4.5 out of 5 stars">
                                <span class="star filled">★</span>
                                <span class="star filled">★</span>
                                <span class="star filled">★</span>
                                <span class="star filled">★</span>
                                <span class="star half">☆</span>
                            </div>
                            <span class="rating-text">(127 reviews)</span>
                        </div>
                    </div>

                    <div class="pricing">
                        <span class="current-price">$199.99</span>
                        <span class="original-price">$299.99</span>
                        <span class="discount-badge">33% OFF</span>
                    </div>

                    <div class="product-description">
                        <p>Experience premium audio quality with our advanced wireless Bluetooth headphones. Featuring active noise cancellation, 30-hour battery life, and superior comfort for all-day listening.</p>
                    </div>

                    <div class="product-features">
                        <h3>Key Features</h3>
                        <ul>
                            <li><strong>Active Noise Cancellation</strong> - Block out distractions</li>
                            <li><strong>30-hour battery life</strong> - Extended listening time</li>
                            <li><strong>Quick charge</strong> - 15 minutes for 3 hours playback</li>
                            <li><strong>Premium materials</strong> - Soft leather and memory foam</li>
                            <li><strong>Multi-device pairing</strong> - Connect up to 2 devices</li>
                        </ul>
                    </div>

                    <div class="product-options">
                        <div class="option-group">
                            <label for="color-select">Color:</label>
                            <select id="color-select" class="product-select">
                                <option value="black">Midnight Black</option>
                                <option value="silver">Silver</option>
                                <option value="blue">Ocean Blue</option>
                            </select>
                        </div>

                        <div class="option-group">
                            <label>Quantity:</label>
                            <div class="quantity-controls">
                                <button class="quantity-btn decrease">-</button>
                                <input type="number" value="1" min="1" max="5" class="quantity-input">
                                <button class="quantity-btn increase">+</button>
                            </div>
                        </div>
                    </div>

                    <div class="product-actions">
                        <button class="btn btn-primary add-to-cart">Add to Cart</button>
                        <button class="btn btn-secondary add-to-wishlist">♡ Add to Wishlist</button>
                    </div>

                    <div class="shipping-info">
                        <div class="shipping-option">
                            <strong>Free shipping</strong> on orders over $100
                        </div>
                        <div class="delivery-estimate">
                            <strong>Estimated delivery:</strong> 3-5 business days
                        </div>
                        <div class="return-policy">
                            <strong>30-day return policy</strong> - Free returns
                        </div>
                    </div>
                </div>
            </section>

            <section class="product-tabs">
                <div class="tab-navigation">
                    <button class="tab-btn active" data-tab="description">Description</button>
                    <button class="tab-btn" data-tab="specifications">Specifications</button>
                    <button class="tab-btn" data-tab="reviews">Reviews (127)</button>
                </div>

                <div class="tab-content">
                    <div id="description" class="tab-panel active">
                        <h3>Product Description</h3>
                        <p>Immerse yourself in exceptional audio quality with our Premium Wireless Bluetooth Headphones. Engineered for audiophiles and everyday listeners alike, these headphones deliver crystal-clear sound with deep, rich bass and crisp highs.</p>
                        
                        <h4>Advanced Technology</h4>
                        <p>Our proprietary active noise cancellation technology adapts to your environment, providing up to 95% noise reduction. Whether you're commuting, working, or relaxing at home, enjoy your music without distractions.</p>
                        
                        <h4>All-Day Comfort</h4>
                        <p>Designed with premium materials including soft leather ear cups and memory foam padding, these headphones provide exceptional comfort for extended listening sessions. The adjustable headband ensures a perfect fit for all head sizes.</p>
                    </div>

                    <div id="specifications" class="tab-panel">
                        <h3>Technical Specifications</h3>
                        <table class="specs-table">
                            <tbody>
                                <tr>
                                    <td>Driver Size</td>
                                    <td>40mm dynamic drivers</td>
                                </tr>
                                <tr>
                                    <td>Frequency Response</td>
                                    <td>20Hz - 20kHz</td>
                                </tr>
                                <tr>
                                    <td>Impedance</td>
                                    <td>32 ohms</td>
                                </tr>
                                <tr>
                                    <td>Battery Life</td>
                                    <td>30 hours (ANC on), 40 hours (ANC off)</td>
                                </tr>
                                <tr>
                                    <td>Charging Time</td>
                                    <td>2 hours (full charge)</td>
                                </tr>
                                <tr>
                                    <td>Bluetooth Version</td>
                                    <td>5.0</td>
                                </tr>
                                <tr>
                                    <td>Weight</td>
                                    <td>250g</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div id="reviews" class="tab-panel">
                        <h3>Customer Reviews</h3>
                        <div class="reviews-summary">
                            <div class="rating-breakdown">
                                <div class="rating-bar">
                                    <span class="rating-label">5 stars</span>
                                    <div class="bar"><div class="fill" style="width: 70%"></div></div>
                                    <span class="rating-count">89</span>
                                </div>
                                <div class="rating-bar">
                                    <span class="rating-label">4 stars</span>
                                    <div class="bar"><div class="fill" style="width: 20%"></div></div>
                                    <span class="rating-count">25</span>
                                </div>
                                <div class="rating-bar">
                                    <span class="rating-label">3 stars</span>
                                    <div class="bar"><div class="fill" style="width: 7%"></div></div>
                                    <span class="rating-count">9</span>
                                </div>
                                <div class="rating-bar">
                                    <span class="rating-label">2 stars</span>
                                    <div class="bar"><div class="fill" style="width: 2%"></div></div>
                                    <span class="rating-count">3</span>
                                </div>
                                <div class="rating-bar">
                                    <span class="rating-label">1 star</span>
                                    <div class="bar"><div class="fill" style="width: 1%"></div></div>
                                    <span class="rating-count">1</span>
                                </div>
                            </div>
                        </div>

                        <div class="reviews-list">
                            <article class="review">
                                <header class="review-header">
                                    <div class="reviewer-info">
                                        <span class="reviewer-name">Sarah M.</span>
                                        <div class="reviewer-rating">★★★★★</div>
                                    </div>
                                    <time class="review-date" datetime="2024-01-10">January 10, 2024</time>
                                </header>
                                <div class="review-content">
                                    <h4 class="review-title">Excellent sound quality and comfort</h4>
                                    <p>These headphones exceeded my expectations. The noise cancellation is fantastic, and I can wear them for hours without any discomfort. Highly recommended!</p>
                                </div>
                            </article>

                            <article class="review">
                                <header class="review-header">
                                    <div class="reviewer-info">
                                        <span class="reviewer-name">Mike R.</span>
                                        <div class="reviewer-rating">★★★★☆</div>
                                    </div>
                                    <time class="review-date" datetime="2024-01-08">January 8, 2024</time>
                                </header>
                                <div class="review-content">
                                    <h4 class="review-title">Great value for the price</h4>
                                    <p>Solid build quality and good sound. The battery life is impressive. Only minor complaint is the touch controls can be a bit sensitive.</p>
                                </div>
                            </article>
                        </div>
                    </div>
                </div>
            </section>
        </main>

        <footer class="site-footer">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>Customer Service</h4>
                    <ul>
                        <li><a href="/support">Contact Us</a></li>
                        <li><a href="/shipping">Shipping Info</a></li>
                        <li><a href="/returns">Returns</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Company</h4>
                    <ul>
                        <li><a href="/about">About Us</a></li>
                        <li><a href="/careers">Careers</a></li>
                        <li><a href="/privacy">Privacy Policy</a></li>
                    </ul>
                </div>
            </div>
        </footer>
    </div>

    <!-- Product page scripts -->
    <script>
        // Product gallery functionality
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.addEventListener('click', function() {
                const imageUrl = this.dataset.image;
                document.getElementById('mainProductImage').src = imageUrl;
                
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Tab functionality
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tabId = this.dataset.tab;
                
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                
                this.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Quantity controls
        document.querySelector('.decrease').addEventListener('click', function() {
            const input = document.querySelector('.quantity-input');
            if (input.value > 1) input.value = parseInt(input.value) - 1;
        });

        document.querySelector('.increase').addEventListener('click', function() {
            const input = document.querySelector('.quantity-input');
            if (input.value < 5) input.value = parseInt(input.value) + 1;
        });
    </script>
</body>
</html>`;

// News article with multimedia content
const newsArticleComplex = `
<!DOCTYPE html>
<html lang="en" prefix="og: http://ogp.me/ns# article: http://ogp.me/ns/article#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Breaking: Major Technology Breakthrough Announced - TechNews</title>
    <meta name="description" content="Scientists announce revolutionary quantum computing breakthrough that could transform the industry">
    <meta name="keywords" content="quantum computing,technology,breakthrough,science,research">
    <meta name="author" content="Dr. Emily Chen">
    
    <!-- Open Graph meta tags -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="Major Technology Breakthrough Announced">
    <meta property="og:description" content="Scientists announce revolutionary quantum computing breakthrough">
    <meta property="og:url" content="https://technews.example.com/quantum-breakthrough">
    <meta property="og:site_name" content="TechNews">
    <meta property="og:image" content="https://technews.example.com/images/quantum-lab.jpg">
    
    <!-- Article meta tags -->
    <meta property="article:published_time" content="2024-01-15T14:30:00Z">
    <meta property="article:modified_time" content="2024-01-15T16:45:00Z">
    <meta property="article:author" content="Dr. Emily Chen">
    <meta property="article:section" content="Technology">
    <meta property="article:tag" content="quantum computing">
    <meta property="article:tag" content="breakthrough">
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Major Technology Breakthrough Announced">
    <meta name="twitter:description" content="Scientists announce revolutionary quantum computing breakthrough">
    <meta name="twitter:image" content="https://technews.example.com/images/quantum-lab.jpg">
    
    <base href="https://technews.example.com/">
</head>
<body>
    <div class="page-wrapper">
        <header class="site-header breaking-news">
            <div class="breaking-banner">
                <span class="breaking-label">BREAKING NEWS</span>
                <span class="breaking-text">Quantum computing breakthrough announced by research team</span>
            </div>
            
            <nav class="main-navigation">
                <div class="nav-brand">
                    <a href="/" class="logo">TechNews</a>
                </div>
                <ul class="nav-menu">
                    <li><a href="/technology" class="active">Technology</a></li>
                    <li><a href="/science">Science</a></li>
                    <li><a href="/business">Business</a></li>
                    <li><a href="/analysis">Analysis</a></li>
                </ul>
                <div class="nav-controls">
                    <button class="search-toggle">Search</button>
                    <button class="menu-toggle">Menu</button>
                </div>
            </nav>
        </header>

        <main class="article-main">
            <article class="news-article" role="main">
                <header class="article-header">
                    <div class="article-meta-top">
                        <span class="category-badge technology">Technology</span>
                        <time class="publish-time" datetime="2024-01-15T14:30:00Z">
                            January 15, 2024, 2:30 PM EST
                        </time>
                    </div>
                    
                    <h1 class="article-title">Revolutionary Quantum Computing Breakthrough Could Transform Industry Within Decade</h1>
                    
                    <div class="article-subtitle">
                        <p>International research team demonstrates stable quantum processing at room temperature, solving major scalability challenge</p>
                    </div>
                    
                    <div class="article-byline">
                        <div class="author-info">
                            <img src="images/authors/emily-chen.jpg" alt="Dr. Emily Chen" class="author-photo">
                            <div class="author-details">
                                <span class="author-name">By <a href="/authors/emily-chen">Dr. Emily Chen</a></span>
                                <span class="author-title">Senior Technology Reporter</span>
                            </div>
                        </div>
                        
                        <div class="article-actions">
                            <button class="share-btn" data-platform="twitter">Share</button>
                            <button class="bookmark-btn">Bookmark</button>
                            <span class="reading-time">8 min read</span>
                        </div>
                    </div>
                </header>

                <div class="article-content">
                    <div class="hero-media">
                        <figure class="featured-image">
                            <img src="images/quantum-lab-main.jpg" alt="Quantum computing laboratory with advanced equipment" loading="eager">
                            <figcaption>
                                Researchers at the Advanced Quantum Institute demonstrate their breakthrough quantum processor operating at room temperature.
                                <span class="photo-credit">Photo: Advanced Quantum Institute</span>
                            </figcaption>
                        </figure>
                    </div>

                    <div class="article-body">
                        <p class="lead-paragraph">
                            A team of international researchers has announced a major breakthrough in quantum computing that could revolutionize the technology industry. The team has successfully demonstrated a quantum processor that operates stably at room temperature, potentially solving one of the biggest challenges facing quantum computing scalability.
                        </p>

                        <p>
                            The breakthrough, published today in the journal <em>Nature Quantum Information</em>, represents years of collaborative research between institutions in the United States, Europe, and Asia. The achievement addresses the fundamental problem that has limited quantum computers to specialized laboratory conditions requiring extreme cooling.
                        </p>

                        <blockquote class="article-quote">
                            <p>"This changes everything we thought we knew about quantum computing limitations. We're not just talking about incremental improvements – this is a paradigm shift that could bring quantum computing to mainstream applications within the next decade."</p>
                            <cite>— Dr. Sarah Rodriguez, Lead Quantum Physicist at MIT</cite>
                        </blockquote>

                        <h2>Breaking the Temperature Barrier</h2>
                        
                        <p>
                            Traditional quantum computers require temperatures close to absolute zero (−273.15°C or −459.67°F) to maintain quantum coherence – the delicate state that allows quantum bits (qubits) to exist in multiple states simultaneously. This requirement has necessitated expensive cooling systems and limited the practical deployment of quantum computers.
                        </p>

                        <div class="info-box technical">
                            <h3>Understanding Quantum Coherence</h3>
                            <p>Quantum coherence is the phenomenon that allows qubits to exist in a superposition of states, enabling quantum computers to process multiple possibilities simultaneously. Environmental interference, particularly thermal noise, typically destroys this coherence rapidly.</p>
                        </div>

                        <p>
                            The research team's innovation centers on a new type of qubit design using engineered materials that maintain quantum properties even when exposed to thermal fluctuations at room temperature. The key breakthrough involves:</p>

                        <ul class="technical-list">
                            <li><strong>Novel Qubit Architecture:</strong> A hybrid design combining topological protection with error correction</li>
                            <li><strong>Advanced Materials:</strong> Specially designed quantum dots embedded in protective matrices</li>
                            <li><strong>Error Mitigation:</strong> Real-time correction algorithms that adapt to environmental conditions</li>
                            <li><strong>Coherence Extension:</strong> Techniques to extend qubit lifetimes by orders of magnitude</li>
                        </ul>

                        <h2>Industry Implications</h2>

                        <p>
                            The implications of this breakthrough extend across multiple industries. Quantum computing promises exponential speedups for certain types of calculations, particularly in:
                        </p>

                        <div class="application-grid">
                            <div class="application-card">
                                <h4>Cryptography & Security</h4>
                                <p>Revolutionary encryption methods and the ability to break current cryptographic systems</p>
                            </div>
                            
                            <div class="application-card">
                                <h4>Drug Discovery</h4>
                                <p>Molecular simulation could accelerate pharmaceutical research by decades</p>
                            </div>
                            
                            <div class="application-card">
                                <h4>Financial Modeling</h4>
                                <p>Complex risk analysis and optimization problems solved in real-time</p>
                            </div>
                            
                            <div class="application-card">
                                <h4>Artificial Intelligence</h4>
                                <p>Machine learning algorithms with unprecedented processing capabilities</p>
                            </div>
                        </div>

                        <h2>Market Response and Investment</h2>

                        <p>
                            News of the breakthrough has already sparked significant market reactions. Quantum computing stocks surged in after-hours trading, while traditional semiconductor companies saw mixed reactions as investors weigh the long-term implications.
                        </p>

                        <figure class="embedded-chart">
                            <div class="chart-container">
                                <h4>Quantum Computing Market Projections</h4>
                                <div class="chart-placeholder">
                                    <canvas id="marketChart" width="600" height="300"></canvas>
                                    <p class="chart-description">Market size projections for quantum computing industry through 2030</p>
                                </div>
                            </div>
                            <figcaption>Industry analysts project explosive growth following room-temperature breakthrough</figcaption>
                        </figure>

                        <p>
                            Major technology companies including IBM, Google, and Microsoft have already announced increased investment in quantum research following the publication. Amazon's quantum cloud computing division AWS Braket reported a 300% increase in customer inquiries within hours of the announcement.
                        </p>

                        <div class="quote-section">
                            <blockquote class="industry-quote">
                                <p>"We've been preparing for this moment for years. Our quantum cloud infrastructure is ready to scale, and we expect to offer room-temperature quantum computing services to enterprise customers within 18 months."</p>
                                <cite>— Jennifer Walsh, VP of Quantum Services at Amazon Web Services</cite>
                            </blockquote>
                        </div>

                        <h2>Challenges and Timeline</h2>

                        <p>
                            Despite the breakthrough, significant challenges remain before room-temperature quantum computing becomes commercially viable. The current prototype demonstrates stability for only short periods, and scaling to the thousands of qubits needed for practical applications remains a complex engineering challenge.
                        </p>

                        <div class="timeline-container">
                            <h3>Projected Development Timeline</h3>
                            <div class="timeline">
                                <div class="timeline-item">
                                    <div class="timeline-date">2024-2025</div>
                                    <div class="timeline-content">Extended stability testing and qubit scaling research</div>
                                </div>
                                <div class="timeline-item">
                                    <div class="timeline-date">2026-2027</div>
                                    <div class="timeline-content">First commercial room-temperature quantum processors</div>
                                </div>
                                <div class="timeline-item">
                                    <div class="timeline-date">2028-2030</div>
                                    <div class="timeline-content">Mainstream quantum computing applications and services</div>
                                </div>
                            </div>
                        </div>

                        <h2>Global Competition and Collaboration</h2>

                        <p>
                            The international nature of this research highlights the collaborative approach needed for quantum computing advancement. However, it also intensifies global competition as nations recognize quantum computing as a strategic technology for national security and economic competitiveness.
                        </p>

                        <p>
                            The research team includes scientists from 15 institutions across 8 countries, demonstrating the truly global nature of cutting-edge quantum research. Key participating institutions include:
                        </p>

                        <div class="institution-list">
                            <div class="institution">
                                <strong>MIT (United States)</strong><br>
                                Quantum coherence and error correction
                            </div>
                            <div class="institution">
                                <strong>University of Oxford (United Kingdom)</strong><br>
                                Topological qubit design
                            </div>
                            <div class="institution">
                                <strong>RIKEN (Japan)</strong><br>
                                Materials science and fabrication
                            </div>
                            <div class="institution">
                                <strong>ETH Zurich (Switzerland)</strong><br>
                                Quantum algorithm optimization
                            </div>
                        </div>

                        <h2>Looking Ahead</h2>

                        <p>
                            As the quantum computing field enters this new phase, experts predict rapid acceleration in development. The removal of the temperature constraint eliminates one of the most significant barriers to quantum computing deployment, potentially bringing the technology from specialized research labs to everyday applications.
                        </p>

                        <p>
                            The next critical milestone will be demonstrating sustained operation over extended periods and scaling to larger qubit counts. If successful, room-temperature quantum computing could usher in a new era of computational capabilities that seemed impossible just years ago.
                        </p>

                        <div class="article-conclusion">
                            <p>
                                This breakthrough represents more than a technical achievement – it's a glimpse into a future where quantum computing becomes as accessible as traditional computing, potentially solving some of humanity's most complex challenges in science, medicine, and technology.
                            </p>
                        </div>
                    </div>

                    <footer class="article-footer">
                        <div class="article-tags">
                            <h4>Tags:</h4>
                            <span class="tag">Quantum Computing</span>
                            <span class="tag">Technology</span>
                            <span class="tag">Breakthrough</span>
                            <span class="tag">Research</span>
                            <span class="tag">Innovation</span>
                        </div>

                        <div class="article-sharing">
                            <h4>Share this article:</h4>
                            <div class="share-buttons">
                                <button class="share-btn twitter" data-url="https://technews.example.com/quantum-breakthrough">Twitter</button>
                                <button class="share-btn facebook" data-url="https://technews.example.com/quantum-breakthrough">Facebook</button>
                                <button class="share-btn linkedin" data-url="https://technews.example.com/quantum-breakthrough">LinkedIn</button>
                                <button class="share-btn email" data-url="https://technews.example.com/quantum-breakthrough">Email</button>
                            </div>
                        </div>

                        <div class="author-bio">
                            <div class="author-card">
                                <img src="images/authors/emily-chen-large.jpg" alt="Dr. Emily Chen" class="author-photo-large">
                                <div class="author-info">
                                    <h4><a href="/authors/emily-chen">Dr. Emily Chen</a></h4>
                                    <p class="author-title">Senior Technology Reporter</p>
                                    <p class="author-description">
                                        Dr. Chen specializes in emerging technologies and has covered quantum computing developments for over a decade. She holds a Ph.D. in Physics from Stanford University and has authored two books on quantum technologies.
                                    </p>
                                    <div class="author-social">
                                        <a href="https://twitter.com/dremilychen">Twitter</a>
                                        <a href="https://linkedin.com/in/emilychen">LinkedIn</a>
                                        <a href="mailto:emily.chen@technews.com">Email</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </footer>
                </div>
            </article>

            <aside class="article-sidebar">
                <div class="related-articles">
                    <h3>Related Stories</h3>
                    <div class="related-list">
                        <article class="related-item">
                            <img src="images/thumbs/quantum-basics.jpg" alt="Quantum Computing Basics">
                            <div class="related-content">
                                <h4><a href="/quantum-computing-explained">Quantum Computing Explained: A Beginner's Guide</a></h4>
                                <time datetime="2024-01-10">January 10, 2024</time>
                            </div>
                        </article>
                        
                        <article class="related-item">
                            <img src="images/thumbs/tech-investment.jpg" alt="Technology Investment">
                            <div class="related-content">
                                <h4><a href="/quantum-investment-trends">Record Investment in Quantum Technologies</a></h4>
                                <time datetime="2024-01-08">January 8, 2024</time>
                            </div>
                        </article>
                        
                        <article class="related-item">
                            <img src="images/thumbs/quantum-security.jpg" alt="Quantum Security">
                            <div class="related-content">
                                <h4><a href="/quantum-cryptography-security">How Quantum Computing Will Change Cybersecurity</a></h4>
                                <time datetime="2024-01-05">January 5, 2024</time>
                            </div>
                        </article>
                    </div>
                </div>

                <div class="newsletter-signup">
                    <h3>Stay Updated</h3>
                    <p>Get the latest technology news delivered to your inbox.</p>
                    <form class="newsletter-form">
                        <input type="email" placeholder="Enter your email" class="newsletter-input">
                        <button type="submit" class="newsletter-btn">Subscribe</button>
                    </form>
                </div>
            </aside>
        </main>

        <section class="comments-section">
            <h3>Comments (47)</h3>
            <div class="comments-list">
                <article class="comment">
                    <div class="comment-header">
                        <span class="commenter-name">QuantumEnthusiast</span>
                        <time class="comment-time" datetime="2024-01-15T15:45:00Z">2 hours ago</time>
                    </div>
                    <div class="comment-content">
                        <p>This is absolutely incredible! I've been following quantum computing for years and never thought we'd see room temperature operation so soon.</p>
                    </div>
                </article>

                <article class="comment">
                    <div class="comment-header">
                        <span class="commenter-name">TechSkeptic</span>
                        <time class="comment-time" datetime="2024-01-15T16:20:00Z">1 hour ago</time>
                    </div>
                    <div class="comment-content">
                        <p>Sounds promising but I'd like to see peer review and independent verification. Too many "breakthrough" announcements turn out to be overhyped.</p>
                    </div>
                </article>
            </div>
        </section>

        <footer class="site-footer">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>TechNews</h4>
                    <p>Your trusted source for technology news and analysis.</p>
                    <div class="social-links">
                        <a href="https://twitter.com/technews">Twitter</a>
                        <a href="https://facebook.com/technews">Facebook</a>
                        <a href="https://linkedin.com/company/technews">LinkedIn</a>
                    </div>
                </div>
                
                <div class="footer-section">
                    <h4>Sections</h4>
                    <ul>
                        <li><a href="/technology">Technology</a></li>
                        <li><a href="/science">Science</a></li>
                        <li><a href="/business">Business</a></li>
                        <li><a href="/analysis">Analysis</a></li>
                    </ul>
                </div>
                
                <div class="footer-section">
                    <h4>About</h4>
                    <ul>
                        <li><a href="/about">About Us</a></li>
                        <li><a href="/contact">Contact</a></li>
                        <li><a href="/privacy">Privacy Policy</a></li>
                        <li><a href="/terms">Terms of Service</a></li>
                    </ul>
                </div>
            </div>
            
            <div class="footer-bottom">
                <p>&copy; 2024 TechNews. All rights reserved.</p>
            </div>
        </footer>
    </div>

    <!-- Scripts -->
    <script>
        // Article functionality
        document.addEventListener('DOMContentLoaded', function() {
            // Share buttons
            document.querySelectorAll('.share-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const platform = this.dataset.platform;
                    const url = this.dataset.url || window.location.href;
                    // Share functionality would be implemented here
                    console.log('Sharing on ' + platform + ': ' + url);
                });
            });

            // Newsletter subscription
            document.querySelector('.newsletter-form').addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.querySelector('.newsletter-input').value;
                console.log('Newsletter subscription:', email);
                // Subscription logic would be implemented here
            });

            // Comments loading (simulated)
            setTimeout(() => {
                console.log('Comments loaded');
            }, 1000);
        });
    </script>
</body>
</html>`;

// Problematic HTML structures that commonly cause extraction failures
const problematicStructures = {
  // Content hidden by CSS that should be extracted
  hiddenContentSample: `
<!DOCTYPE html>
<html>
<head>
    <title>Article with Hidden Content</title>
    <style>
        .hidden-initially { display: none; }
        .print-only { display: none; }
        @media print { .print-only { display: block; } }
        .visually-hidden { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
    </style>
</head>
<body>
    <article>
        <h1>Visible Article Title</h1>
        <p>This paragraph is always visible.</p>
        
        <div class="hidden-initially" data-content="expandable">
            <h2>Initially Hidden Section</h2>
            <p>This content is hidden by CSS but should be extracted.</p>
        </div>
        
        <div class="print-only">
            <p>This content only appears when printing.</p>
        </div>
        
        <span class="visually-hidden">This is screen reader only content</span>
        
        <div style="display: none;">
            <h2>Important Hidden Info</h2>
            <p>Critical information hidden with inline styles.</p>
        </div>
    </article>
</body>
</html>`,

  // JavaScript-dependent content
  dynamicContentSample: `
<!DOCTYPE html>
<html>
<head>
    <title>Dynamic Content Loading</title>
</head>
<body>
    <article>
        <h1>Article Title</h1>
        <p>Static content that loads immediately.</p>
        
        <div id="dynamic-content">
            <p>Loading...</p>
        </div>
        
        <div class="lazy-load" data-src="/api/article-content">
            <p>Content will be loaded via AJAX</p>
        </div>
        
        <section class="comments" data-comments-count="0">
            <h3>Comments</h3>
            <div id="comments-container">
                <!-- Comments loaded by JavaScript -->
            </div>
        </section>
    </article>
    
    <script>
        // Simulate dynamic content loading
        setTimeout(() => {
            document.getElementById('dynamic-content').innerHTML = 
                '<h2>Dynamically Loaded Section</h2><p>This content was loaded after page load.</p>';
        }, 2000);
        
        // Simulate lazy loading
        document.querySelectorAll('.lazy-load').forEach(el => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.innerHTML = '<h2>Lazy Loaded Content</h2><p>This content loaded when scrolled into view.</p>';
                    }
                });
            });
            observer.observe(el);
        });
    </script>
</body>
</html>`,

  // Malformed HTML with boundary conditions
  malformedBoundaryHTML: `
<!DOCTYPE html>
<html>
<head>
    <title>Malformed HTML Test</title>
<body>
    <article>
        <h1>Article with Problems</h1>
        
        <!-- Elements with null/undefined-prone attributes -->
        <div class="" id="" data-value="">Empty attributes</div>
        <div class="test-class" id="test-id">Valid attributes</div>
        <div>No attributes</div>
        
        <!-- Images with various attribute states -->
        <img src="image1.jpg" alt="Valid image">
        <img src="image2.jpg" alt="">
        <img src="image3.jpg">
        <img alt="Image without src">
        <img>
        
        <!-- Links with various states -->
        <a href="https://example.com">Valid link</a>
        <a href="">Empty href</a>
        <a>Link without href</a>
        <a href="#" title="Link with empty href">Hash link</a>
        
        <!-- Unclosed tags -->
        <p>Paragraph with <strong>unclosed bold tag
        <p>Another paragraph without closing tag
        
        <!-- Nested structure issues -->
        <div>
            <span>Nested
                <div>Improperly nested div inside span</div>
            </span>
        </div>
        
        <!-- Content with special characters that could cause issues -->
        <p>Content with special chars: &amp; &lt; &gt; &quot; &#39; &#x27;</p>
        <p>Unicode content: 中文 العربية русский 日本語</p>
        <p>Emoji content: 🚀 💻 ⚡ 🌟</p>
        
        <!-- Empty elements -->
        <p></p>
        <div></div>
        <span></span>
        
        <!-- Elements with only whitespace -->
        <p>   </p>
        <div>
        
        </div>
        
        <!-- Script and style content that should be ignored -->
        <script>
            var data = { test: "value" };
            // This should not appear in extracted content
        </script>
        
        <style>
            .hidden { display: none; }
        </style>
    </article>
</body>
</html>`,

  // Complex nested structures
  deeplyNestedSample: `
<!DOCTYPE html>
<html>
<head>
    <title>Deeply Nested Content</title>
</head>
<body>
    <article>
        <h1>Complex Nested Structure</h1>
        
        <div class="level-1">
            <div class="level-2">
                <div class="level-3">
                    <div class="level-4">
                        <div class="level-5">
                            <div class="level-6">
                                <div class="level-7">
                                    <div class="level-8">
                                        <div class="level-9">
                                            <div class="level-10">
                                                <p>Content buried 10 levels deep</p>
                                                <div class="even-deeper">
                                                    <span>
                                                        <em>
                                                            <strong>
                                                                <code>Deeply nested formatted text</code>
                                                            </strong>
                                                        </em>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Table with complex nesting -->
        <table>
            <thead>
                <tr>
                    <th>
                        <div>
                            <span>
                                <strong>Nested Header</strong>
                            </span>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div class="cell-content">
                            <p>
                                Table cell with
                                <span class="highlight">
                                    nested <em>formatting</em>
                                </span>
                                content
                            </p>
                            <ul>
                                <li>
                                    <div>
                                        <span>Nested list item</span>
                                        <ul>
                                            <li>
                                                <div>
                                                    <span>Double nested</span>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </article>
</body>
</html>`
};

// Export all HTML samples for CommonJS
module.exports = {
  modernBlogPost,
  spaStructure,
  documentationPage,
  ecommerceProductPage,
  newsArticleComplex,
  problematicStructures
};
