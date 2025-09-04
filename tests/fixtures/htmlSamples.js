/**
 * HTML test fixtures for MarkDownload testing
 */

const simpleArticle = `
<!DOCTYPE html>
<html>
<head>
    <title>Simple Test Article</title>
    <meta name="description" content="A simple test article for markdown conversion">
    <meta name="keywords" content="test,article,markdown">
    <meta name="author" content="Test Author">
</head>
<body>
    <article>
        <h1>Simple Test Article</h1>
        <p>This is a simple paragraph with some <strong>bold text</strong> and <em>italic text</em>.</p>
        <p>Here's another paragraph with a <a href="https://example.com">link to example.com</a>.</p>
        <ul>
            <li>First list item</li>
            <li>Second list item</li>
            <li>Third list item</li>
        </ul>
    </article>
</body>
</html>`;

const complexArticle = `
<!DOCTYPE html>
<html>
<head>
    <title>Complex Technical Article</title>
    <meta name="description" content="A complex article with code, images, and various formatting">
    <meta name="keywords" content="javascript,programming,tutorial">
    <meta name="author" content="Jane Developer">
    <base href="https://blog.example.com/">
</head>
<body>
    <article>
        <header>
            <h1>Advanced JavaScript Techniques</h1>
            <p class="byline">By Jane Developer</p>
            <time datetime="2024-01-15">January 15, 2024</time>
        </header>
        
        <section>
            <h2>Introduction</h2>
            <p>JavaScript has evolved significantly over the years. This article explores some advanced techniques.</p>
            
            <h3>Arrow Functions</h3>
            <p>Arrow functions provide a more concise syntax:</p>
            <pre><code class="language-javascript">
const add = (a, b) => a + b;
const multiply = (a, b) => {
    return a * b;
};
            </code></pre>
            
            <h3>Async/Await</h3>
            <p>Modern asynchronous programming uses async/await:</p>
            <pre class="codehilite"><code>
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
}
            </code></pre>
        </section>
        
        <section>
            <h2>Images and Media</h2>
            <p>Here's an example diagram:</p>
            <img src="images/diagram.png" alt="JavaScript Event Loop Diagram" title="Event Loop">
            <p>And here's a relative image:</p>
            <img src="/assets/screenshot.jpg" alt="Code Screenshot">
        </section>
        
        <section>
            <h2>Mathematics</h2>
            <p>We can express complex formulas:</p>
            <script id="MathJax-Element-1" type="math/tex; mode=display">
                f(x) = \\int_{-\\infty}^{\\infty} \\hat f(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi
            </script>
            <p>Or inline math like <i markdownload-latex="E = mc^2" display="false">E = mc²</i>.</p>
        </section>
        
        <section>
            <h2>Tables</h2>
            <table>
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Description</th>
                        <th>Example</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>map()</code></td>
                        <td>Creates a new array</td>
                        <td><code>[1,2,3].map(x => x * 2)</code></td>
                    </tr>
                    <tr>
                        <td><code>filter()</code></td>
                        <td>Filters array elements</td>
                        <td><code>[1,2,3].filter(x => x > 1)</code></td>
                    </tr>
                </tbody>
            </table>
        </section>
        
        <blockquote>
            <p>The best way to learn JavaScript is to practice coding every day.</p>
            <cite>— Programming Wisdom</cite>
        </blockquote>
        
        <footer>
            <p>Published on <time datetime="2024-01-15">January 15, 2024</time></p>
            <p>Tags: <span class="tag">JavaScript</span>, <span class="tag">Programming</span></p>
        </footer>
    </article>
    
    <!-- Some hidden elements that should be removed -->
    <div style="display: none;">Hidden tracking div</div>
    <script>console.log('tracking script');</script>
    <noscript>JavaScript disabled message</noscript>
</body>
</html>`;

const imageHeavyArticle = `
<!DOCTYPE html>
<html>
<head>
    <title>Image Gallery Article</title>
    <base href="https://photos.example.com/">
</head>
<body>
    <article>
        <h1>Photography Tutorial</h1>
        <p>Learn photography with these examples:</p>
        
        <h2>Landscape Photography</h2>
        <img src="landscape.jpg" alt="Mountain Landscape" title="Beautiful mountain vista">
        <p>Absolute URL image: <img src="https://cdn.example.com/sunset.jpg" alt="Sunset Photo"></p>
        
        <h2>Portrait Photography</h2>
        <img src="/portraits/model1.jpg" alt="Portrait Example">
        <img src="../images/studio-setup.png" alt="Studio Setup">
        
        <h2>Base64 Image</h2>
        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzAwNzNlNiIvPgo8L3N2Zz4K" alt="Blue Circle">
        
        <h2>Image without extension</h2>
        <img src="uploads/photo123?size=large" alt="Uploaded Photo">
    </article>
</body>
</html>`;

const mathHeavyArticle = `
<!DOCTYPE html>
<html>
<head>
    <title>Mathematics Article</title>
</head>
<body>
    <article>
        <h1>Advanced Calculus</h1>
        
        <h2>Integration</h2>
        <p>The fundamental theorem of calculus states:</p>
        <script id="MathJax-Element-1" type="math/tex; mode=display">
            \\frac{d}{dx} \\int_a^x f(t) dt = f(x)
        </script>
        
        <p>For inline equations like <script id="MathJax-Element-2" type="math/tex">\\lim_{n \\to \\infty} \\frac{1}{n}</script>, we use different formatting.</p>
        
        <h2>MathJax 3 Support</h2>
        <p>Modern LaTeX rendering:</p>
        <div markdownload-latex="\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}" display="true"></div>
        
        <h2>KaTeX Support</h2>
        <span class="katex-mathml">
            <math><semantics><mrow><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></mrow>
            <annotation encoding="application/x-tex">E = mc^2</annotation></semantics></math>
        </span>
    </article>
</body>
</html>`;

const codeHeavyArticle = `
<!DOCTYPE html>
<html>
<head>
    <title>Programming Guide</title>
</head>
<body>
    <article>
        <h1>Web Development Guide</h1>
        
        <h2>HTML Structure</h2>
        <pre class="highlight-text-html"><code>&lt;div class="container"&gt;
    &lt;h1&gt;Welcome&lt;/h1&gt;
    &lt;p&gt;Hello World&lt;/p&gt;
&lt;/div&gt;</code></pre>
        
        <h2>CSS Styling</h2>
        <pre><code class="language-css">
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

h1 {
    color: #333;
    font-size: 2rem;
}
        </code></pre>
        
        <h2>JavaScript Logic</h2>
        <div class="codehilite">
<pre>function calculateTotal(items) {
    return items.reduce((sum, item) => {
        return sum + item.price * item.quantity;
    }, 0);
}</pre>
        </div>
        
        <h2>Python Example</h2>
        <pre class="highlight-source-python"><code>
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Generate sequence
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
        </code></pre>
        
        <h2>Inline Code</h2>
        <p>Use the <code>querySelector()</code> method to select DOM elements.</p>
        <p>In Python, <code>len()</code> returns the length of a sequence.</p>
    </article>
</body>
</html>`;

const obsidianFormattedArticle = `
<!DOCTYPE html>
<html>
<head>
    <title>Note Taking Best Practices</title>
    <meta name="keywords" content="notes,productivity,organization">
</head>
<body>
    <article>
        <h1>Note Taking Best Practices</h1>
        <p>Effective note-taking is crucial for learning and productivity.</p>
        
        <h2>Digital vs Physical Notes</h2>
        <p>Both methods have their advantages.</p>
        <img src="note-comparison.png" alt="Note Comparison Chart">
        
        <h2>Tools and Techniques</h2>
        <ul>
            <li>Use consistent formatting</li>
            <li>Create links between related topics</li>
            <li>Regular review and organization</li>
        </ul>
        
        <blockquote>
            <p>The palest ink is better than the best memory.</p>
        </blockquote>
    </article>
</body>
</html>`;

const selectionTestArticle = `
<!DOCTYPE html>
<html>
<head>
    <title>Selection Test Article</title>
</head>
<body>
    <article>
        <h1>Full Article Title</h1>
        <p>This is the introduction paragraph.</p>
        
        <section class="selected-content">
            <h2>Important Section</h2>
            <p>This paragraph should be captured when selected.</p>
            <ul>
                <li>Selected list item 1</li>
                <li>Selected list item 2</li>
            </ul>
        </section>
        
        <p>This paragraph is after the selection.</p>
    </article>
</body>
</html>`;

const malformedHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Malformed HTML Test</title>
<body>
    <article>
        <h1>Test Article</h1>
        <p>Paragraph with <strong>unclosed bold tag
        <p>Another paragraph without closing tag
        <div>
            <span>Nested elements
        </div>
        <img src="test.jpg" alt="Missing closing tag">
    </article>
</body>
</html>`;

const emptyArticle = `
<!DOCTYPE html>
<html>
<head>
    <title>Empty Article</title>
</head>
<body>
    <article>
        <!-- Empty article body -->
    </article>
</body>
</html>`;

// Article objects for testing the parsed result
const mockArticles = {
  simple: {
    title: 'Simple Test Article',
    content: '<h1>Simple Test Article</h1><p>This is a simple paragraph with some <strong>bold text</strong> and <em>italic text</em>.</p>',
    textContent: 'Simple Test Article This is a simple paragraph with some bold text and italic text.',
    length: 100,
    excerpt: 'This is a simple paragraph with some bold text and italic text.',
    byline: 'Test Author',
    dir: 'ltr',
    baseURI: 'https://example.com',
    pageTitle: 'Simple Test Article',
    keywords: ['test', 'article', 'markdown']
  },
  
  complex: {
    title: 'Advanced JavaScript Techniques',
    content: '<h1>Advanced JavaScript Techniques</h1><p>JavaScript has evolved significantly over the years.</p>',
    textContent: 'Advanced JavaScript Techniques JavaScript has evolved significantly over the years.',
    length: 500,
    excerpt: 'JavaScript has evolved significantly over the years. This article explores some advanced techniques.',
    byline: 'Jane Developer',
    dir: 'ltr',
    baseURI: 'https://blog.example.com/',
    pageTitle: 'Complex Technical Article',
    keywords: ['javascript', 'programming', 'tutorial']
  }
};

// Export all samples and mock data for CommonJS
module.exports = {
  simpleArticle,
  complexArticle,
  imageHeavyArticle,
  mathHeavyArticle,
  codeHeavyArticle,
  obsidianFormattedArticle,
  selectionTestArticle,
  malformedHTML,
  emptyArticle,
  mockArticles
};