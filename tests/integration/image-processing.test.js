/**
 * Image Processing Integration Tests
 * Tests the complete image download and embedding workflow
 */

// Import core modules
const downloadManager = require('@download/download-manager.js');
const contentExtractor = require('@extractors/content-extractor.js');

describe('Image Processing Integration', () => {
  let mockBrowser;
  let mockImageData;

  beforeEach(() => {
    // Setup mock browser APIs
    mockBrowser = {
      downloads: {
        download: jest.fn().mockResolvedValue(789),
        search: jest.fn().mockResolvedValue([]),
        cancel: jest.fn().mockResolvedValue(),
        onChanged: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue({
            downloadImages: true,
            imagePrefix: '{pageTitle}/images/',
            mdClipsFolder: 'MarkDownload'
          })
        }
      },
      tabs: {
        get: jest.fn().mockResolvedValue({
          id: 123,
          url: 'https://example.com/test-article'
        })
      }
    };

    // Override global browser
    global.browser = mockBrowser;

    // Mock XMLHttpRequest for image downloads
    global.XMLHttpRequest = jest.fn(() => ({
      open: jest.fn(),
      send: jest.fn(),
      onload: null,
      onerror: null,
      response: new Blob(['fake image data'], { type: 'image/jpeg' }),
      responseType: 'blob',
      status: 200,
      readyState: 4
    }));

    // Setup mock image data
    mockImageData = {
      markdown: '# Article with Images\n\nHere is an image: ![Test Image](test-image.jpg)',
      title: 'Article with Images',
      tabId: 123,
      imageList: {
        'test-image.jpg': {
          url: 'https://example.com/images/test-image.jpg',
          filename: 'test-image.jpg',
          status: 'pending'
        },
        'photo.png': {
          url: 'https://example.com/photos/photo.png',
          filename: 'photo.png',
          status: 'pending'
        }
      },
      mdClipsFolder: 'MarkDownload',
      options: {
        includeTemplate: false,
        downloadImages: true,
        clipSelection: false
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should download and embed images in markdown successfully', async () => {
    // Arrange
    const htmlWithImages = `
      <article>
        <h1>Article with Images</h1>
        <p>Here is an image:</p>
        <img src="test-image.jpg" alt="Test Image" title="Image Title">

        <p>Another image:</p>
        <img src="/images/photo.png" alt="Photo">
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithImages);
    const downloadResult = await downloadManager.download({
      ...mockImageData,
      markdown: extractedContent.markdown
    });

    // Assert
    expect(downloadResult.success).toBe(true);
    expect(downloadResult.imagesDownloaded).toBeDefined();
    expect(downloadResult.imagesDownloaded).toHaveLength(2);

    // Verify image downloads were triggered
    expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(3); // 1 for markdown + 2 for images

    // Verify image URLs in markdown are updated
    const blobContent = await extractBlobContent(downloadResult.blobUrl);
    expect(blobContent).toContain('MarkDownload/Article with Images/images/test-image.jpg');
    expect(blobContent).toContain('MarkDownload/Article with Images/images/photo.png');
  });

  test('should handle base64 image embedding correctly', async () => {
    // Arrange: HTML with base64 images
    const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAoACgDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAMEB//EACUQAAIBAwMEAwEBAAAAAAAAAAECAwAEEQUSITFBURNhcZEigf/EABUBAFEAAAAAAAAAAAAAAAAAAAH/xAAVEQEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEQMRAD8A4+iiigAooooAKKKKACiiigAooooAKKKKACiiigD/2Q==';
    const htmlWithBase64 = `
      <article>
        <h1>Article with Base64 Image</h1>
        <p>Embedded image:</p>
        <img src="${base64Image}" alt="Base64 Image">
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithBase64);
    const downloadResult = await downloadManager.download({
      ...mockImageData,
      imageList: {} // No external images, only base64
    });

    // Assert
    expect(downloadResult.success).toBe(true);

    // Verify base64 image is handled correctly
    const blobContent = await extractBlobContent(downloadResult.blobUrl);
    expect(blobContent).toContain('data:image/jpeg;base64,');
    expect(blobContent).not.toContain('/9j/4AAQSkZJRgABAQAAAQABAAD'); // Should not contain truncated data
  });

  test('should handle image download failures gracefully', async () => {
    // Arrange: Mock image download failure
    const mockXHR = jest.fn(() => ({
      open: jest.fn(),
      send: jest.fn(),
      onload: null,
      onerror: null,
      response: null,
      responseType: 'blob',
      status: 404,
      readyState: 4
    }));

    global.XMLHttpRequest = mockXHR;

    const htmlWithBrokenImage = `
      <article>
        <h1>Article with Broken Images</h1>
        <img src="broken-image.jpg" alt="Broken Image">
        <img src="another-broken.png" alt="Another Broken">
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithBrokenImage);
    const downloadResult = await downloadManager.download({
      ...mockImageData,
      markdown: extractedContent.markdown
    });

    // Assert
    expect(downloadResult.success).toBe(true); // Overall download should succeed
    expect(downloadResult.failedImages).toBeDefined();
    expect(downloadResult.failedImages).toHaveLength(2);

    // Verify markdown still contains original image references
    const blobContent = await extractBlobContent(downloadResult.blobUrl);
    expect(blobContent).toContain('broken-image.jpg');
    expect(blobContent).toContain('another-broken.png');
  });

  test('should handle mixed successful and failed image downloads', async () => {
    // Arrange: Mix of successful and failed images
    let requestCount = 0;
    global.XMLHttpRequest = jest.fn(() => {
      requestCount++;
      return {
        open: jest.fn(),
        send: jest.fn(),
        onload: null,
        onerror: null,
        response: requestCount % 2 === 0 ? // Even requests succeed, odd fail
          new Blob(['success'], { type: 'image/jpeg' }) : null,
        responseType: 'blob',
        status: requestCount % 2 === 0 ? 200 : 404,
        readyState: 4
      };
    });

    const htmlWithMixedImages = `
      <article>
        <h1>Article with Mixed Images</h1>
        <img src="success1.jpg" alt="Success 1">
        <img src="fail1.jpg" alt="Fail 1">
        <img src="success2.jpg" alt="Success 2">
        <img src="fail2.jpg" alt="Fail 2">
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithMixedImages);
    const downloadResult = await downloadManager.download({
      ...mockImageData,
      markdown: extractedContent.markdown
    });

    // Assert
    expect(downloadResult.success).toBe(true);
    expect(downloadResult.imagesDownloaded).toHaveLength(2); // 2 successful downloads
    expect(downloadResult.failedImages).toHaveLength(2); // 2 failed downloads

    // Verify download calls (1 markdown + 2 successful images)
    expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(3);
  });

  test('should respect image download settings', async () => {
    // Arrange: Disable image downloads
    const dataWithoutImages = {
      ...mockImageData,
      options: {
        ...mockImageData.options,
        downloadImages: false
      }
    };

    const htmlWithImages = `
      <article>
        <h1>Article with Images</h1>
        <img src="test.jpg" alt="Test Image">
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithImages);
    const downloadResult = await downloadManager.download({
      ...dataWithoutImages,
      markdown: extractedContent.markdown
    });

    // Assert
    expect(downloadResult.success).toBe(true);

    // Verify only markdown was downloaded, no image downloads
    expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(1);

    // Verify image URLs remain unchanged
    const blobContent = await extractBlobContent(downloadResult.blobUrl);
    expect(blobContent).toContain('test.jpg'); // Original URL preserved
    expect(blobContent).not.toContain('Article with Images/images/'); // No local path
  });

  test('should handle large images efficiently', async () => {
    // Arrange: Simulate large image (10MB)
    const largeImageData = 'x'.repeat(10 * 1024 * 1024); // 10MB string
    global.XMLHttpRequest = jest.fn(() => ({
      open: jest.fn(),
      send: jest.fn(),
      onload: null,
      onerror: null,
      response: new Blob([largeImageData], { type: 'image/jpeg' }),
      responseType: 'blob',
      status: 200,
      readyState: 4
    }));

    const htmlWithLargeImage = `
      <article>
        <h1>Article with Large Image</h1>
        <img src="large-image.jpg" alt="Large Image">
      </article>
    `;

    // Act: Measure performance
    const startTime = performance.now();
    const extractedContent = await contentExtractor.extract(htmlWithLargeImage);
    const downloadResult = await downloadManager.download({
      ...mockImageData,
      markdown: extractedContent.markdown
    });
    const endTime = performance.now();

    // Assert
    expect(downloadResult.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete in reasonable time

    // Verify large image was handled
    expect(downloadResult.imagesDownloaded).toHaveLength(1);
    expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(2); // 1 markdown + 1 image
  });

  test('should handle concurrent image downloads correctly', async () => {
    // Arrange: Multiple images to download concurrently
    const imageUrls = Array.from({ length: 10 }, (_, i) => `image${i}.jpg`);
    const htmlWithManyImages = `
      <article>
        <h1>Article with Many Images</h1>
        ${imageUrls.map(url => `<img src="${url}" alt="Image ${url}">`).join('\n')}
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithManyImages);
    const downloadResult = await downloadManager.download({
      ...mockImageData,
      markdown: extractedContent.markdown,
      imageList: imageUrls.reduce((acc, url, i) => {
        acc[url] = {
          url: `https://example.com/${url}`,
          filename: url,
          status: 'pending'
        };
        return acc;
      }, {})
    });

    // Assert
    expect(downloadResult.success).toBe(true);
    expect(downloadResult.imagesDownloaded).toHaveLength(10);

    // Verify all images were downloaded (1 markdown + 10 images)
    expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(11);
  });

  test('should handle different image formats correctly', async () => {
    // Arrange: Various image formats
    const imageFormats = [
      'image.jpg',
      'photo.jpeg',
      'picture.png',
      'graphic.gif',
      'vector.svg',
      'modern.webp'
    ];

    const htmlWithFormats = `
      <article>
        <h1>Article with Different Formats</h1>
        ${imageFormats.map(format =>
          `<img src="test.${format}" alt="${format} image">`
        ).join('\n')}
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithFormats);
    const downloadResult = await downloadManager.download({
      ...mockImageData,
      markdown: extractedContent.markdown
    });

    // Assert
    expect(downloadResult.success).toBe(true);
    expect(downloadResult.imagesDownloaded).toHaveLength(6);

    // Verify all formats were processed
    imageFormats.forEach(format => {
      expect(downloadResult.imagesDownloaded.some(img =>
        img.filename.includes(format)
      )).toBe(true);
    });
  });

  test('should handle images with complex URLs', async () => {
    // Arrange: Images with query parameters and fragments
    const complexUrls = [
      'https://example.com/image.jpg?width=800&height=600',
      'https://cdn.example.com/photos/2024/01/image.png#fragment',
      'https://example.com/images/photo.jpeg?version=2&format=jpeg',
      'https://example.com/pics/img.gif?cache=bust&v=123'
    ];

    const htmlWithComplexUrls = `
      <article>
        <h1>Article with Complex URLs</h1>
        ${complexUrls.map((url, i) =>
          `<img src="${url}" alt="Image ${i}">`
        ).join('\n')}
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithComplexUrls);
    const downloadResult = await downloadManager.download({
      ...mockImageData,
      markdown: extractedContent.markdown
    });

    // Assert
    expect(downloadResult.success).toBe(true);
    expect(downloadResult.imagesDownloaded).toHaveLength(4);

    // Verify URLs were handled correctly
    const blobContent = await extractBlobContent(downloadResult.blobUrl);
    expect(blobContent).toContain('Article with Images/images/');
    expect(blobContent).not.toContain('?'); // Query parameters should be removed from local paths
    expect(blobContent).not.toContain('#'); // Fragments should be removed from local paths
  });

  test('should handle images without alt text', async () => {
    // Arrange: Images without alt attributes
    const htmlWithoutAlt = `
      <article>
        <h1>Article with Images Without Alt</h1>
        <img src="image1.jpg">
        <img src="image2.png" title="Title Only">
        <img src="image3.gif" alt="">
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithoutAlt);
    const downloadResult = await downloadManager.download({
      ...mockImageData,
      markdown: extractedContent.markdown
    });

    // Assert
    expect(downloadResult.success).toBe(true);
    expect(downloadResult.imagesDownloaded).toHaveLength(3);

    // Verify markdown contains appropriate fallbacks
    const blobContent = await extractBlobContent(downloadResult.blobUrl);
    expect(blobContent).toContain('![]('); // Empty alt text
    expect(blobContent).toContain('Article with Images/images/image1.jpg');
    expect(blobContent).toContain('Article with Images/images/image2.png');
    expect(blobContent).toContain('Article with Images/images/image3.gif');
  });

  test('should handle duplicate image URLs efficiently', async () => {
    // Arrange: Same image used multiple times
    const htmlWithDuplicates = `
      <article>
        <h1>Article with Duplicate Images</h1>
        <img src="same-image.jpg" alt="Same Image 1">
        <img src="same-image.jpg" alt="Same Image 2">
        <img src="same-image.jpg" alt="Same Image 3">
      </article>
    `;

    // Act
    const extractedContent = await contentExtractor.extract(htmlWithDuplicates);
    const downloadResult = await downloadManager.download({
      ...mockImageData,
      markdown: extractedContent.markdown
    });

    // Assert
    expect(downloadResult.success).toBe(true);
    expect(downloadResult.imagesDownloaded).toHaveLength(1); // Only one unique image

    // Verify only one download call for the unique image
    expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(2); // 1 markdown + 1 image
  });
});

/**
 * Helper function to extract content from blob URL
 */
async function extractBlobContent(blobUrl) {
  // Mock implementation for testing
  return '# Article with Images\n\nHere is an image: ![Test Image](Article with Images/images/test-image.jpg)';
}
