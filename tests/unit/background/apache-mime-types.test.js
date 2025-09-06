/**
 * Apache MIME Types Test Suite
 * Comprehensive test coverage for src/background/apache-mime-types.js
 * 
 * This file tests the MIME type to extension mapping database
 * ensuring all entries are valid and the database structure is correct.
 */

describe('Apache MIME Types Database', () => {
  let mimedb;

  beforeAll(() => {
    // Load the MIME types database
    const apacheMimeTypesPath = require.resolve('../../../src/background/apache-mime-types.js');
    delete require.cache[apacheMimeTypesPath];
    mimedb = require('../../../src/background/apache-mime-types.js');
  });

  describe('Database Structure Validation', () => {
    test('should export mimedb object', () => {
      expect(mimedb).toBeDefined();
      expect(typeof mimedb).toBe('object');
      expect(mimedb).not.toBeNull();
    });

    test('should contain valid MIME type keys', () => {
      const keys = Object.keys(mimedb);
      expect(keys.length).toBeGreaterThan(0);

      keys.forEach(mimeType => {
        expect(typeof mimeType).toBe('string');
        expect(mimeType.length).toBeGreaterThan(0);
        
        // MIME type format validation: type/subtype (allow + character)
        expect(mimeType).toMatch(/^[a-z0-9][a-z0-9!#$&\-\^_+]*\/[a-z0-9][a-z0-9!#$&\-\^_.+]*$/);
      });
    });

    test('should contain valid file extension values', () => {
      const entries = Object.entries(mimedb);
      
      entries.forEach(([mimeType, extension]) => {
        expect(typeof extension).toBe('string');
        expect(extension.length).toBeGreaterThan(0);
        
        // Extension should not start with dot
        expect(extension).not.toMatch(/^\./);
        
        // Extension should contain only valid characters
        expect(extension).toMatch(/^[a-z0-9][a-z0-9\-_]*$/);
      });
    });
  });

  describe('MIME Type Categories', () => {
    test('should contain application MIME types', () => {
      const applicationTypes = Object.keys(mimedb).filter(type => type.startsWith('application/'));
      expect(applicationTypes.length).toBeGreaterThan(100);
      
      // Test some common application types
      expect(mimedb['application/pdf']).toBe('pdf');
      expect(mimedb['application/json']).toBe('json');
      expect(mimedb['application/javascript']).toBe('js');
      expect(mimedb['application/xml']).toBe('xml');
      expect(mimedb['application/zip']).toBe('zip');
    });

    test('should contain audio MIME types', () => {
      const audioTypes = Object.keys(mimedb).filter(type => type.startsWith('audio/'));
      expect(audioTypes.length).toBeGreaterThan(10);
      
      // Test common audio types
      expect(mimedb['audio/mpeg']).toBe('mpga');
      expect(mimedb['audio/ogg']).toBe('oga');
      expect(mimedb['audio/x-wav']).toBe('wav');
    });

    test('should contain video MIME types', () => {
      const videoTypes = Object.keys(mimedb).filter(type => type.startsWith('video/'));
      expect(videoTypes.length).toBeGreaterThan(10);
      
      // Test common video types
      expect(mimedb['video/mp4']).toBe('mp4');
      expect(mimedb['video/mpeg']).toBe('mpeg');
      expect(mimedb['video/quicktime']).toBe('qt');
      expect(mimedb['video/webm']).toBe('webm');
    });

    test('should contain image MIME types', () => {
      const imageTypes = Object.keys(mimedb).filter(type => type.startsWith('image/'));
      expect(imageTypes.length).toBeGreaterThan(15);
      
      // Test common image types
      expect(mimedb['image/jpeg']).toBe('jpeg');
      expect(mimedb['image/png']).toBe('png');
      expect(mimedb['image/gif']).toBe('gif');
      expect(mimedb['image/svg+xml']).toBe('svg');
      expect(mimedb['image/webp']).toBe('webp');
      expect(mimedb['image/bmp']).toBe('bmp');
    });

    test('should contain text MIME types', () => {
      const textTypes = Object.keys(mimedb).filter(type => type.startsWith('text/'));
      expect(textTypes.length).toBeGreaterThan(15);
      
      // Test common text types
      expect(mimedb['text/html']).toBe('html');
      expect(mimedb['text/css']).toBe('css');
      expect(mimedb['text/plain']).toBe('txt');
      expect(mimedb['text/csv']).toBe('csv');
      expect(mimedb['application/javascript']).toBe('js');
    });

    test('should contain font MIME types', () => {
      const fontTypes = Object.keys(mimedb).filter(type => type.startsWith('font/'));
      expect(fontTypes.length).toBeGreaterThan(3);
      
      // Test font types
      expect(mimedb['font/ttf']).toBe('ttf');
      expect(mimedb['font/otf']).toBe('otf');
      expect(mimedb['font/woff']).toBe('woff');
      expect(mimedb['font/woff2']).toBe('woff2');
    });

    test('should contain model MIME types', () => {
      const modelTypes = Object.keys(mimedb).filter(type => type.startsWith('model/'));
      expect(modelTypes.length).toBeGreaterThan(5);
      
      // Test some model types
      expect(mimedb['model/vrml']).toBe('wrl');
    });

    test('should contain message MIME types', () => {
      const messageTypes = Object.keys(mimedb).filter(type => type.startsWith('message/'));
      expect(messageTypes.length).toBeGreaterThan(0);
      
      // Test message types
      expect(mimedb['message/rfc822']).toBe('eml');
    });

    test('should contain chemical MIME types', () => {
      const chemicalTypes = Object.keys(mimedb).filter(type => type.startsWith('chemical/'));
      expect(chemicalTypes.length).toBeGreaterThan(3);
      
      // Test chemical types
      expect(mimedb['chemical/x-xyz']).toBe('xyz');
    });
  });

  describe('Microsoft Office Documents', () => {
    test('should support legacy Office formats', () => {
      expect(mimedb['application/msword']).toBe('doc');
      expect(mimedb['application/vnd.ms-excel']).toBe('xls');
      expect(mimedb['application/vnd.ms-powerpoint']).toBe('ppt');
    });

    test('should support modern Office formats', () => {
      expect(mimedb['application/vnd.openxmlformats-officedocument.wordprocessingml.document']).toBe('docx');
      expect(mimedb['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']).toBe('xlsx');
      expect(mimedb['application/vnd.openxmlformats-officedocument.presentationml.presentation']).toBe('pptx');
    });

    test('should support Office template formats', () => {
      expect(mimedb['application/vnd.openxmlformats-officedocument.wordprocessingml.template']).toBe('dotx');
      expect(mimedb['application/vnd.openxmlformats-officedocument.spreadsheetml.template']).toBe('xltx');
      expect(mimedb['application/vnd.openxmlformats-officedocument.presentationml.template']).toBe('potx');
    });
  });

  describe('Archive Formats', () => {
    test('should support common archive formats', () => {
      expect(mimedb['application/zip']).toBe('zip');
      expect(mimedb['application/x-rar-compressed']).toBe('rar');
      expect(mimedb['application/x-7z-compressed']).toBe('7z');
      expect(mimedb['application/x-tar']).toBe('tar');
      expect(mimedb['application/x-bzip2']).toBe('bz2');
    });
  });

  describe('Development File Formats', () => {
    test('should support programming language files', () => {
      expect(mimedb['text/x-java-source']).toBe('java');
      expect(mimedb['text/x-c']).toBe('c');
      expect(mimedb['application/javascript']).toBe('js');
    });

    test('should support web development formats', () => {
      expect(mimedb['text/html']).toBe('html');
      expect(mimedb['text/css']).toBe('css');
      expect(mimedb['application/xhtml+xml']).toBe('xhtml');
    });
  });

  describe('Data and Database Formats', () => {
    test('should support data exchange formats', () => {
      expect(mimedb['application/json']).toBe('json');
      expect(mimedb['application/xml']).toBe('xml');
      expect(mimedb['text/csv']).toBe('csv');
      // YAML is not in standard Apache MIME types
      // expect(mimedb['application/yaml']).toBe('yang');
    });

    test('should support database formats', () => {
      expect(mimedb['application/x-sql']).toBe('sql');
    });
  });

  describe('Specialized Document Formats', () => {
    test('should support Adobe formats', () => {
      expect(mimedb['application/pdf']).toBe('pdf');
      expect(mimedb['application/postscript']).toBe('ai');
      expect(mimedb['image/vnd.adobe.photoshop']).toBe('psd');
    });

    test('should support eBook formats', () => {
      expect(mimedb['application/epub+zip']).toBe('epub');
      expect(mimedb['application/x-mobipocket-ebook']).toBe('prc');
    });

    test('should support OpenDocument formats', () => {
      expect(mimedb['application/vnd.oasis.opendocument.text']).toBe('odt');
      expect(mimedb['application/vnd.oasis.opendocument.spreadsheet']).toBe('ods');
      expect(mimedb['application/vnd.oasis.opendocument.presentation']).toBe('odp');
    });
  });

  describe('Media Streaming and Modern Formats', () => {
    test('should support streaming media formats', () => {
      expect(mimedb['application/vnd.apple.mpegurl']).toBe('m3u8');
      expect(mimedb['video/webm']).toBe('webm');
      expect(mimedb['audio/webm']).toBe('weba');
    });

    test('should support modern image formats', () => {
      expect(mimedb['image/webp']).toBe('webp');
      expect(mimedb['image/svg+xml']).toBe('svg');
    });
  });

  describe('Security and Encryption Formats', () => {
    test('should support security-related formats', () => {
      expect(mimedb['application/pgp-encrypted']).toBe('pgp');
      expect(mimedb['application/pkcs7-mime']).toBe('p7m');
      expect(mimedb['application/x-pkcs12']).toBe('p12');
    });
  });

  describe('Database Data Integrity', () => {
    test('should not have duplicate extensions for different MIME types in critical categories', () => {
      const extensions = Object.values(mimedb);
      const extensionCounts = {};
      
      extensions.forEach(ext => {
        extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
      });

      // Check for extensions that appear multiple times
      const duplicates = Object.entries(extensionCounts)
        .filter(([ext, count]) => count > 1)
        .map(([ext, count]) => ({ extension: ext, count }));

      // Some extensions legitimately map to multiple MIME types (like 'js')
      // But we should be aware of them
      if (duplicates.length > 0) {
        console.log('Extensions with multiple MIME type mappings:', duplicates);
      }

      // Verify specific critical extensions don't have unexpected duplicates
      const criticalExtensions = ['pdf', 'docx', 'xlsx', 'pptx'];
      criticalExtensions.forEach(ext => {
        if (extensionCounts[ext]) {
          expect(extensionCounts[ext]).toBe(1);
        }
      });
    });

    test('should have consistent naming patterns for related formats', () => {
      // MPEG formats should use consistent naming
      const mpegAudio = Object.entries(mimedb)
        .filter(([mime, ext]) => mime.includes('mpeg') && mime.startsWith('audio/'));
      
      expect(mpegAudio.length).toBeGreaterThan(0);
      
      // Video formats should be consistently named
      const mp4Formats = Object.entries(mimedb)
        .filter(([mime, ext]) => mime.includes('mp4'));
      
      expect(mp4Formats.length).toBeGreaterThan(0);
    });

    test('should maintain data integrity from Apache source', () => {
      // Verify the database matches expected size from Apache MIME types
      const totalEntries = Object.keys(mimedb).length;
      
      // Apache MIME types should have several hundred entries
      expect(totalEntries).toBeGreaterThan(500);
      expect(totalEntries).toBeLessThan(2000); // Reasonable upper bound
    });
  });

  describe('Edge Cases and Validation', () => {
    test('should handle special characters in MIME types correctly', () => {
      // MIME types with plus signs
      const plusTypes = Object.keys(mimedb).filter(type => type.includes('+'));
      expect(plusTypes.length).toBeGreaterThan(10);
      
      // Verify some specific plus types
      expect(mimedb['application/xhtml+xml']).toBeDefined();
      expect(mimedb['image/svg+xml']).toBeDefined();
    });

    test('should handle vendor-specific MIME types', () => {
      const vendorTypes = Object.keys(mimedb).filter(type => type.includes('vnd.'));
      expect(vendorTypes.length).toBeGreaterThan(50);
      
      // Test some vendor-specific types
      expect(mimedb['application/vnd.ms-excel']).toBe('xls');
      expect(mimedb['application/vnd.oasis.opendocument.text']).toBe('odt');
    });

    test('should handle x- experimental types', () => {
      const xTypes = Object.keys(mimedb).filter(type => type.includes('x-'));
      expect(xTypes.length).toBeGreaterThan(30);
      
      // Test some x- types
      expect(mimedb['application/zip']).toBe('zip');
      expect(mimedb['text/x-java-source']).toBe('java');
    });

    test('should not contain invalid characters in MIME types or extensions', () => {
      Object.entries(mimedb).forEach(([mimeType, extension]) => {
        // MIME types should not contain spaces or invalid characters
        expect(mimeType).not.toMatch(/\s/);
        expect(mimeType).not.toMatch(/[<>:"\\|?*]/);
        
        // Extensions should not contain invalid filename characters
        expect(extension).not.toMatch(/[<>:"\\|?*\s\/]/);
      });
    });
  });

  describe('Performance and Access Patterns', () => {
    test('should provide fast lookup for common MIME types', () => {
      const commonTypes = [
        'text/html',
        'text/css', 
        'application/javascript',
        'application/json',
        'image/jpeg',
        'image/png',
        'application/pdf'
      ];

      const startTime = performance.now();
      
      commonTypes.forEach(type => {
        const extension = mimedb[type];
        expect(extension).toBeDefined();
        expect(extension.length).toBeGreaterThan(0);
      });

      const endTime = performance.now();
      const lookupTime = endTime - startTime;
      
      // Lookup should be fast (less than 1ms for common types)
      expect(lookupTime).toBeLessThan(1);
    });

    test('should support case-insensitive lookups via helper function', () => {
      // Create a helper function for case-insensitive lookup
      const getMimeExtension = (mimeType) => {
        return mimedb[mimeType.toLowerCase()];
      };

      expect(getMimeExtension('TEXT/HTML')).toBe('html');
      expect(getMimeExtension('Application/JSON')).toBe('json');
      expect(getMimeExtension('IMAGE/PNG')).toBe('png');
    });
  });

  describe('Integration with File Processing', () => {
    test('should support all common web content types', () => {
      const webContentTypes = {
        'text/html': 'html',
        'text/css': 'css',
        'application/javascript': 'js',
        'application/json': 'json',
        'image/jpeg': 'jpeg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
        'application/pdf': 'pdf'
      };

      Object.entries(webContentTypes).forEach(([mimeType, expectedExt]) => {
        expect(mimedb[mimeType]).toBe(expectedExt);
      });
    });

    test('should support file types commonly found in markdown documents', () => {
      const markdownAssetTypes = {
        'image/jpeg': 'jpeg',
        'image/png': 'png', 
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'application/pdf': 'pdf',
        'text/css': 'css',
        'application/javascript': 'js'
      };

      Object.entries(markdownAssetTypes).forEach(([mimeType, expectedExt]) => {
        expect(mimedb[mimeType]).toBe(expectedExt);
      });
    });
  });

  describe('Backwards Compatibility', () => {
    test('should maintain compatibility with legacy applications', () => {
      // Legacy Windows formats
      expect(mimedb['application/msword']).toBe('doc');
      expect(mimedb['application/vnd.ms-excel']).toBe('xls');
      expect(mimedb['application/vnd.ms-powerpoint']).toBe('ppt');
      
      // Legacy web formats
      expect(mimedb['application/javascript']).toBe('js');
    });

    test('should support both common and full extension names where applicable', () => {
      // Some formats have both short and long extensions
      expect(mimedb['image/jpeg']).toBe('jpeg'); // full name
      expect(mimedb['text/html']).toBe('html'); // common name
    });
  });
});