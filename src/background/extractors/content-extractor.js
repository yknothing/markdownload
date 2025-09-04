// Content Extractor Module
// Handles webpage content extraction and processing

(function() {
  'use strict';

  console.log('🔧 Loading Content Extractor module...');

  // Content extraction strategies and utilities
  const extractionStrategies = {
    readability: 'readability',
    custom: 'custom',
    fallback: 'fallback'
  };

  // Content quality scoring weights
  const QUALITY_WEIGHTS = {
    textLength: 0.4,
    linkDensity: 0.3,
    elementCount: 0.2,
    headingCount: 0.1
  };

  /**
   * Main content extraction function - Used as fallback when page-context Readability fails
   */
  async function extractContent(htmlString, baseURI, pageTitle, options = {}) {
    try {
      console.log('🔄 [ContentExtractor] Fallback extraction starting...');

      // Early validation
      if (!htmlString || htmlString.trim().length === 0) {
        console.error('❌ [ContentExtractor] Empty HTML string provided');
        return createFallbackArticle('', baseURI, pageTitle);
      }

      // Try Readability.js in service worker context (last resort)
      let article = null;
      if (typeof Readability !== 'undefined') {
        console.log('🎯 [ContentExtractor] Attempting Readability fallback...');
        article = await extractWithReadability(htmlString, baseURI, pageTitle);
      } else {
        console.warn('⚠️ [ContentExtractor] Readability not available in service worker');
      }

      // Fallback to custom extraction if Readability fails
      if (!article || !article.content || article.content.trim().length < 100) {
        console.log('🔧 [ContentExtractor] Using custom extraction strategy...');
        article = await extractWithCustomStrategy(htmlString || '', baseURI, pageTitle);
      }

      // Final cleanup and processing
      if (article) {
        article = await postProcessArticle(article, options);
      }

      return article;

    } catch (error) {
      console.error('❌ [ContentExtractor] Fallback extraction failed:', error.message);

      if (self.ErrorHandler) {
        self.ErrorHandler.handleTurndownError(error, htmlString, 'content-extraction');
      }

      // Return minimal fallback
      return createFallbackArticle(htmlString, baseURI, pageTitle);
    }
  }

  /**
   * Extract content using Readability.js
   */
  async function extractWithReadability(htmlString, baseURI, pageTitle) {
    try {
      console.log('📖 [Readability] Starting Readability.js extraction...');
      console.log('📊 [Readability] Input validation:', {
        htmlStringLength: htmlString?.length || 0,
        baseURI,
        pageTitle,
        hasReadability: typeof Readability !== 'undefined',
        readabilityType: typeof Readability
      });

      // Create a DOM document from HTML string
      console.log('🔧 [Readability] Creating DOM document from HTML string...');
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');

      console.log('📋 [Readability] DOM parsing result:', {
        documentCreated: !!doc,
        documentType: doc?.constructor?.name,
        hasBody: !!doc?.body,
        bodyChildren: doc?.body?.children?.length || 0,
        title: doc?.title,
        parsingError: doc?.documentElement?.nodeName === "parsererror"
      });

      if (doc.documentElement.nodeName === "parsererror") {
        console.error('❌ [Readability] DOM parsing failed - invalid HTML');
        return null;
      }

      // Prepare document for Readability
      console.log('🧹 [Readability] Preparing document for Readability processing...');
      prepareDocumentForReadability(doc);

      // Extract content using Readability
      console.log('🎯 [Readability] Initializing Readability instance...');
      const readability = new Readability(doc, {
        debug: true,
        maxElemsToParse: 0,
        nbTopCandidates: 5,
        charThreshold: 500,
        classesToPreserve: ['markdown-body', 'markdown-content', 'post-content', 'entry-content']
      });

      console.log('⚙️ [Readability] Readability instance created, calling parse()...');
      const article = readability.parse();

      console.log('📊 [Readability] Parse result analysis:', {
        articleReturned: !!article,
        articleType: typeof article,
        title: article?.title,
        contentLength: article?.content?.length || 0,
        byline: article?.byline,
        excerptLength: article?.excerpt?.length || 0,
        textContent: article?.textContent?.length || 0
      });

      if (article && article.content && article.content.trim().length > 0) {
        // Enhance article with additional metadata
        article.baseURI = baseURI;
        article.extractionMethod = extractionStrategies.readability;

        console.log('✅ [Readability] Extraction successful with valid content');
        console.log('📝 [Readability] Content preview:', article.content.substring(0, 200) + '...');
        return article;
      } else {
        console.warn('⚠️ [Readability] Article parsed but content is empty or invalid');
        console.log('🔍 [Readability] Article details:', article);
      }

      // If Readability returns null or empty content, attempt a broad container extraction as soft-fallback
      console.log('🔄 [Readability] Attempting fallback container extraction...');
      try {
        const container = findBestContentContainer(doc);
        if (container) {
          console.log('✅ [Readability] Fallback container found, extracting content...');
          const fallbackArticle = {
            title: extractTitle(doc, pageTitle),
            content: extractContentFromContainer(container),
            byline: extractByline(container),
            excerpt: extractExcerpt(container.innerHTML || container.textContent || ''),
            baseURI,
            extractionMethod: extractionStrategies.custom
          };

          console.log('📊 [Readability] Fallback extraction result:', {
            title: fallbackArticle.title,
            contentLength: fallbackArticle.content?.length || 0,
            hasContent: !!(fallbackArticle.content && fallbackArticle.content.trim().length > 0)
          });

          return fallbackArticle;
        } else {
          console.warn('❌ [Readability] No suitable content container found for fallback');
        }
      } catch (fallbackError) {
        console.error('❌ [Readability] Fallback extraction failed:', fallbackError);
      }

      console.error('❌ [Readability] All extraction methods failed');
      return null;

    } catch (error) {
      console.error('❌ [Readability] Readability extraction failed:', error);
      console.error('📋 [Readability] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      });
      return null;
    }
  }

  /**
   * Prepare document for Readability processing
   */
  function prepareDocumentForReadability(doc) {
    // Remove script and style elements
    const scripts = doc.querySelectorAll('script, style, noscript');
    scripts.forEach(element => element.remove());

    // Remove common navigation and footer elements
    const selectorsToRemove = [
      'nav', 'header', 'footer', '.nav', '.navigation', '.menu',
      '.footer', '.sidebar', '.advertisement', '.ads', '.social-share'
    ];

    selectorsToRemove.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(element => element.remove());
    });

    // Ensure document has proper structure
    if (!doc.body) {
      const body = doc.createElement('body');
      const html = doc.documentElement;
      while (html.firstChild) {
        body.appendChild(html.firstChild);
      }
      html.appendChild(body);
    }
  }

  /**
   * Extract content using custom strategy
   */
  async function extractWithCustomStrategy(htmlString, baseURI, pageTitle) {
    try {
      console.log('🔧 Using custom content extraction strategy...');

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');

      // Find best content container
      const contentContainer = findBestContentContainer(doc);

      if (!contentContainer) {
        return createFallbackArticle(htmlString, baseURI, pageTitle);
      }

      // Extract content from container
      const content = extractContentFromContainer(contentContainer);
      const title = extractTitle(doc, pageTitle);
      const byline = extractByline(contentContainer);
      const excerpt = extractExcerpt(content);

      const article = {
        title: title,
        content: content,
        byline: byline,
        excerpt: excerpt,
        baseURI: baseURI,
        extractionMethod: extractionStrategies.custom
      };

      console.log('✅ Custom extraction successful');
      return article;

    } catch (error) {
      console.error('❌ Custom extraction failed:', error);
      return createFallbackArticle(htmlString, baseURI, pageTitle);
    }
  }

  /**
   * Find the best content container using scoring algorithm
   */
  function findBestContentContainer(doc) {
    const candidates = [];

    // Common content selectors
    const contentSelectors = [
      'article', '.post', '.content', '.entry', '.article-body',
      '.post-content', '.entry-content', '.article-content',
      'main', '#main', '.main-content', '#content'
    ];

    // Find candidate elements
    contentSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(element => {
        if (element.textContent && element.textContent.trim().length > 200) {
          candidates.push(element);
        }
      });
    });

    // If no candidates found, try body
    if (candidates.length === 0 && doc.body) {
      candidates.push(doc.body);
    }

    // Score and rank candidates
    const scoredCandidates = candidates.map(element => ({
      element: element,
      score: scoreContentElement(element)
    }));

    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates.length > 0 ? scoredCandidates[0].element : null;
  }

  /**
   * Score content element based on various quality metrics
   */
  function scoreContentElement(element) {
    let score = 0;

    // Text length score
    const textLength = element.textContent.trim().length;
    score += Math.min(textLength / 1000, 1) * QUALITY_WEIGHTS.textLength;

    // Link density score (lower is better)
    const linkElements = element.querySelectorAll('a');
    const linkDensity = linkElements.length / Math.max(textLength / 100, 1);
    score += Math.max(0, 1 - linkDensity) * QUALITY_WEIGHTS.linkDensity;

    // Element count score (reasonable number of elements)
    const allElements = element.querySelectorAll('*');
    const elementRatio = Math.min(allElements.length / 50, 1);
    score += elementRatio * QUALITY_WEIGHTS.elementCount;

    // Heading count score
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingScore = Math.min(headings.length / 5, 1);
    score += headingScore * QUALITY_WEIGHTS.headingCount;

    return score;
  }

  /**
   * Extract content from container element
   */
  function extractContentFromContainer(container) {
    // Clone container to avoid modifying original
    const clonedContainer = container.cloneNode(true);

    // Remove unwanted elements
    const elementsToRemove = clonedContainer.querySelectorAll(
      'script, style, nav, header, footer, .nav, .navigation, .menu, .footer, .sidebar, .ads, .advertisement'
    );
    elementsToRemove.forEach(element => element.remove());

    return clonedContainer.innerHTML || clonedContainer.textContent || '';
  }

  /**
   * Extract title from document
   */
  function extractTitle(doc, fallbackTitle) {
    // Try various title selectors
    const titleSelectors = [
      'h1', '.post-title', '.entry-title', '.article-title',
      '.content-title', '.page-title'
    ];

    for (const selector of titleSelectors) {
      const titleElement = doc.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim();
      }
    }

    // Try document title
    if (doc.title && doc.title.trim()) {
      return doc.title.trim();
    }

    // Use fallback
    return fallbackTitle || 'Untitled Document';
  }

  /**
   * Extract byline/author information
   */
  function extractByline(container) {
    const bylineSelectors = [
      '.byline', '.author', '.post-author', '.entry-author',
      '.article-author', '.meta-author', '.writer'
    ];

    for (const selector of bylineSelectors) {
      const bylineElement = container.querySelector(selector);
      if (bylineElement && bylineElement.textContent.trim()) {
        return bylineElement.textContent.trim();
      }
    }

    return null;
  }

  /**
   * Extract excerpt from content
   */
  function extractExcerpt(content) {
    if (!content) return null;

    // Get first paragraph or first 200 characters
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    const firstParagraph = doc.querySelector('p');
    if (firstParagraph) {
      const text = firstParagraph.textContent.trim();
      return text.length > 200 ? text.substring(0, 200) + '...' : text;
    }

    // Fallback to first 200 characters
    const textContent = doc.body ? doc.body.textContent.trim() : '';
    return textContent.length > 200 ? textContent.substring(0, 200) + '...' : textContent;
  }

  /**
   * Create fallback article when extraction fails
   */
  function createFallbackArticle(htmlString, baseURI, pageTitle) {
    console.log('📄 Creating fallback article...');

    return {
      title: pageTitle || 'Untitled Document',
      content: htmlString,
      byline: null,
      excerpt: null,
      baseURI: baseURI,
      extractionMethod: extractionStrategies.fallback
    };
  }

  /**
   * Post-process extracted article
   */
  async function postProcessArticle(article, options = {}) {
    try {
      // Clean up content
      article.content = cleanContent(article.content, options);

      // Validate article
      article = validateArticle(article);

      // Add metadata
      article.extractedAt = Date.now();
      article.length = article.content ? article.content.length : 0;

      return article;

    } catch (error) {
      console.error('❌ Article post-processing failed:', error);
      return article;
    }
  }

  /**
   * Clean and normalize content
   */
  function cleanContent(content, options) {
    if (!content) return '';

    // Remove excessive whitespace
    content = content.replace(/\s+/g, ' ');

    // Remove empty paragraphs
    content = content.replace(/<p[^>]*>\s*<\/p>/gi, '');

    // Clean up attributes if requested
    if (options.cleanAttributes) {
      content = content.replace(/\s+(class|id|style)="[^"]*"/gi, '');
    }

    return content.trim();
  }

  /**
   * Validate article structure
   */
  function validateArticle(article) {
    if (!article.title || article.title.trim().length === 0) {
      article.title = 'Untitled Document';
    }

    if (!article.content || article.content.trim().length === 0) {
      throw new Error('Article content is empty');
    }

    return article;
  }

  // Export module interface
  self.ContentExtractor = {
    extract: extractContent,
    extractContent: extractContent, // Alias for backward compatibility
    strategies: extractionStrategies,

    // Utility functions for external use
    findBestContainer: findBestContentContainer,
    scoreElement: scoreContentElement,
    cleanContent: cleanContent,

    // Constants
    QUALITY_WEIGHTS: QUALITY_WEIGHTS,

    // Health check for dependency injection
    healthCheck: async function() {
      try {
        // Basic functionality test
        const isExtractFunctionAvailable = typeof extractContent === 'function';
        const isReadabilityAvailable = typeof Readability !== 'undefined';

        return {
          healthy: isExtractFunctionAvailable,
          details: {
            extractFunctionAvailable: isExtractFunctionAvailable,
            readabilityAvailable: isReadabilityAvailable,
            strategiesAvailable: !!extractionStrategies
          }
        };
      } catch (error) {
        return {
          healthy: false,
          error: error.message
        };
      }
    }
  };

  console.log('✅ Content Extractor module loaded');
  console.log('🔍 ContentExtractor interface:', {
    extract: typeof self.ContentExtractor?.extract,
    extractContent: typeof self.ContentExtractor?.extractContent,
    strategies: !!self.ContentExtractor?.strategies,
    healthCheck: typeof self.ContentExtractor?.healthCheck
  });

  // Export for Jest testing compatibility
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = self.ContentExtractor;
  }

})();
