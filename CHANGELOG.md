# Changelog

## Unreleased
### 封装与可维护性优化（服务工作线程与核心工具）
- 优化 background.js 中的关键工具函数并补充中文注释：
  - validateUri：支持相对/协议相对解析，保持绝对 URL 原样（不强制编码空格）；相对路径通过 URL 归一化后仅对空格做解码，避免破坏其他字符的安全性。
  - getImageFilename：统一图片命名策略，data: URL 按 MIME 推断扩展名（image_<时间戳>.ext），普通 URL 去除查询参数后取末段文件名，统一经 generateValidFileName 清洗。
  - textReplace：增强模板替换能力，支持 {date:FORMAT}、{keywords[:分隔符]}、{domain}、大小写/命名风格转换与转义花括号（\{...\}）。
  - generateValidFileName：非法字符与自定义禁用字符统一替换为下划线，处理前后导点、Windows 保留名、空值回退与保留扩展名的长度截断逻辑。
- 增强 createMenus() 调用安全性：测试与受限环境下未注入实现时自动跳过，避免 require 过程报错。

### 已知问题（本次未完全修复）
- generateValidFileName 在单测 case “preserve file extension when truncating” 中的期望与通用策略存在冲突（测试期望长度固定为 255，但输入长度为 253）；已记录待沟通策略（是否需要强行填充至 255）。
- 部分 default-options 与集成测试失败与本次封装优化无直接关联，后续在不改变既有行为的前提下再做对齐与完善。

## 4.0.0 (2024-12-28)
### 🎉 Major Version Release
- **Complete Architecture Refactoring**: Migrated from monolithic to modular architecture following SOLID principles
- **Enhanced Service Worker**: Implemented clean separation of concerns with specialized modules
- **Improved Error Handling**: Added comprehensive error boundaries and recovery mechanisms
- **Security Enhancements**: Implemented HTML sanitization, URL validation, and secure content processing
- **Testing Infrastructure**: Added comprehensive unit, integration, and E2E test suites
- **Dependency Injection**: Implemented clean module management and lifecycle handling
- **Code Quality**: Applied clean code principles, eliminated code smells, and improved maintainability
- **Performance Optimizations**: Enhanced module loading and resource management
- **Developer Experience**: Improved debugging, logging, and development workflow

### 🔧 Technical Improvements
- **Modular Architecture**: Split service worker into specialized modules (LifecycleManager, MessageQueueManager, DownloadProcessor, etc.)
- **Configuration Management**: Centralized all constants and settings in dedicated config module
- **Browser API Abstractions**: Enhanced browser API compatibility and error handling
- **Content Processing**: Improved HTML parsing, content extraction, and markdown conversion
- **Image Handling**: Enhanced image download and processing capabilities
- **Template System**: Improved front/back matter template processing
- **File Management**: Enhanced filename sanitization and conflict resolution

### 🛡️ Security & Reliability
- **HTML Sanitization**: Added comprehensive input cleaning to prevent XSS attacks
- **URL Validation**: Implemented secure URL validation with dangerous protocol blocking
- **Code Injection Prevention**: Replaced dynamic code execution with safe API calls
- **Error Recovery**: Added graceful degradation and fallback mechanisms
- **Input Validation**: Enhanced validation for all user inputs and configuration

### 🧪 Quality Assurance
- **Unit Tests**: Added comprehensive unit test coverage for all modules
- **Integration Tests**: Implemented end-to-end workflow testing
- **E2E Tests**: Added browser automation tests for critical user flows
- **Test Infrastructure**: Built robust testing framework with mocks and fixtures
- **CI/CD Integration**: Enhanced build and deployment pipeline

### 📚 Documentation
- **Architecture Documentation**: Added detailed architecture overview and design principles
- **Code Comments**: Comprehensive JSDoc documentation for all public APIs
- **Developer Guide**: Enhanced development setup and contribution guidelines
- **API Reference**: Complete API documentation for extension development

## 3.4.0
- Fixed extra spaces in titles which could cause issues (thanks @rickdoesdev !)
- Fixed an issue with image paths in some circumstances (thanks @rickdoesdev !)
- Added parametersizations for "mixed-kebab" and "mixed_snake" which retain original casing but replace spaces (thanks @NSHenry !)
  - Also added a special "obsidian-cal" parameterization which is the same as "mixed-kebab" with duplicate `-` removed for additional compatibility with the Obsidian Consistent Attachment Location plugin (thanks @NSHenry !)
- Added lowecase and uppercase options to parameterizations (thanks @redxtech !)
- Updated Turndown to v7.1.3 (thanks @WeHat !)
- Updated Readability to v0.5.0 (thanks @WeHat !)
- Fixed some issues with code block parsing and formatting (thanks @WeHat !)
- Fixed an issue with some sites missing a proper title (thanks @WeHat !)
- Fixed an issue with bad base urls causing issues with links in certain circumstances (thanks @WeHat !)
- Fixed an issue with readability removing everything in certain circumstances (thanks @WeHat !)
- Send properly configured title to the Obsidian integration (thanks @nekton39 !)
- Updates to the README (thanks @2gn and @eugenesvk !)
## 3.3.0
- Remove hidden content before exporting (thanks @nhaouari !). This allows you to use a different extension (e.g. Adblock) to hide elements that would otherwise clutter up your export
- Fixes for Obsidian integration in Safari (thanks @aancw !)
- Keep a few more HTML tags that have no markdown equivalent (`u`, `ins`, `del`, `small`, `big`) (thanks @mnaoumov !)
- Add support for KaTeX formulas parsing (thanks @mnaoumov !)
- Fixed saving for options when imported from file (and show a little 'saved' indicator)
- Added a toggle for downloading images in the context menu and popup
- Added a link to the options in the popup
- Added some basic error handling to the popup
- Changes to how html inside code blocks is handled (thanks @mnaumov !)
- Treat codehilite without specified language as plaintext (thanks @mnaoumov !)
- Ensure sequential line breaks in <pre> are preserved in code blocks (thanks @mnaumov !)
- Update user guide link in README to point to GitHub
- Added keyboard shortcuts to copy selection / current tab to obsidian (user-definable in browsers that support that) (thanks @legolasdimir and @likeablob !)
- Select multiple tabs (hold crtl/cmd) then copy all tab urls as a markdown link list via keyboard shortcut or context menu (thanks @romanPrignon !)
- Allow users to include custom text such like `{date:YYYY-MM-DD}/`` in their Obsidian Folder Name setting (thanks @likeablob !)
- Fixed a small typo in the user guide (thanks @devon-research !)
- Fix for missing headings on sites like Substack (thanks @eactisgrosso !)
- Add support for websites using MathJax 3 (thanks @LeLocTai !)
## 3.2.1
- Bugfixes for the Obsidian integration (thanks @aancw !)
## 3.2.0
- Added a basic Obsidian integration using the [Obsidian Advanced URI](https://vinzent03.github.io/obsidian-advanced-uri/) plugin and clipboard (thanks @aancw !)
- Keep sub/sup tags so that superscript and subscript text is retained (thanks @mnaoumov !)
- Added a keyboard shortcut for copy selection as markdown (nothing by default, needs to be user-configured)
- Added a new context menu item to copy all tabs as a list of markdown links
- Updated dependencies

## 3.1.0
- Firefox for Android (nightly) support
- Updated Readability and Turndown
- Added GitHub-flavoured Markdown (GFM) plugin to Turndown (adds some mardown table support)
- Added support for MathJax -> LaTeX (thanks @LeLocTai)
- Disallow slashes in title text replacements
- Suport for Open Graph meta tags as variables (which use `property` instead of `key`)
- Fixed an issue with regex characters like `|` in date formats
- Resolved an extra slash in file name causing images to fail to download in chromium browsers
- Added some support to parse pre elements as code blocks (supports syntax highlighting on GitHub, but not much else yet)
- Added option to enable or disable the context menus
- Added some extra keyboard shortcuts. These can be customised, depending on your browser
    - <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> opens the popup (as it has in previous versions)
    - <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> downloads the current tab as markdown, bypassing the popup
    - <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> copies the current tab as markdown to the clipboard, bypassing the popup
    - <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> copies the current tabs URL as a markdown link to the clipboard
- Added support for template variables having different casing using `:` followed by the casing type. For example, for an article titled "Different Types of Casing":
    - `{pageTitle:pascal}` — "DifferentTypesOfCasing"
    - `{pageTitle:camel}` — "differentTypesOfCasing"
    - `{pageTitle:kebab}` — "different-types-of-casing"
    - `{pageTitle:snake` — "different_types_of_casing"
- Added support for rending italics in double underscores (`__`). This isn't valid MarkDown (will output as __bold__), but it's useful for people copying to Roam
- Support image download as base64 embedded urls, directly in the markdown file
- Added some extra variables related to the url beyond the existing `{baseURI}`:
    - `{origin}` - The origin of the URL, that is its scheme, its domain and its port
    - `{host}` - The domain (that is the _hostname_) followed by (if a port was specified) a `:` and the _port_ of the URL.
    - `{hostname}` - The domain of the URL.
    - `{port}` - The port number of the URL.
    - `{protocol}` - The protocol scheme of the URL, including the final `':'`.
    - `{pathname}` - An initial `'/'` followed by the path of the URL, not including the query string or fragment.
    - `{search}` - The URL's parameter string; if any parameters are provided, this string includes all of them, beginning with the leading `?` character.

## 3.0.0
- Theme revamp
- Utilizing CodeMirror for the Markdown Editor
- Strip Disallowed characters on title and image filenames during text replacement
- Add "Download Type" option, to attempt to resolve conflicts with other Download extensions (and to help support Safari!)
- Add options for stripping images and links
- Fixes around downloading images and getting correct urls in the markdown
- Added meta keywords support for the text replace
- Added text replace support for meta tags in general
- Add option to disable turndown escaping
- Strip out 'red dot' special characters
- Added an option to specify a download path (within the downloads folder). Thanks to Nikita Lukianets!

## 2.4.1
- Add option for Obsidian-style image links (when downloading images with the markdown file)
- Downloaded images should download relative to the markdown file in the case where you specify a subfolder in your title template
- Front- and back-matter template will no longer put in extra lines on Opera
- Adjusted the way text is copied to the clipboard

## 2.4.0
- Fixed typo on options page (thanks Dean Cook)
- Added option to download images alongside the markdown file
    - Also added the ability to add a prefix to the images you download, so you can, for example, save them in a subfolder
    - If your browser has the option to always show a save as dialog enabled, you might get a dialog for every image. Sorry about that 😬
- Updated turndown to 7.0.1 and allowed iframes to be kept in the markdown
- Added a new `{pageTitle}` option for template replacement (there are many websites where the `{title}` and `{pageTitle}` actually differ)
- Added a context menu option to copy a tab URL as a markdown link, using the title configured in settings as the link title (i.e. `[<custom title>](<URL>)`)
- Added custom disallowed characters to strip from titles (set to `[]#^` by default for maximum compatibility with Obsidian)
- Added some focus styling so you can tell what is focused
- Auto-focus the download button (you can now `ctrl`+`shift`+`M`, Enter to quickly download a file)
- Template title (and image prefixes) now allow forward slashes (`/`) so that files get saved to a subfolder

## 2.3.1
- Added template toggle to Firefox's tab context menu

## 2.3.0
- Added contexy menus for copying markdown
- Added options to clip selected text
- Include front-matter/back-matter templates in popup
- Add title templating
- Added keyboard shortcut to show the popup
- Added option to always show Save As
- Added context menus to download all tabs as markdown

## 2.2.0
- Added extension options 
    - Turndown (markdown generation) options
    - Front-matter/back-matter templates with replacement variables from page metadata (and date)

## 2.1.6
- Replace non-breaking spaces in filenames

## 2.1.5
- Fixed an issue with sites with invalid `<base>` tags

## 2.1.4
- Fixed issue with relative links [#1](https://github.com/deathau/markdownload/issues/1)

## 2.1.3
- Fist change, forked from [enrico-kaack/markdown-clipper](https://github.com/enrico-kaack/markdown-clipper)
- Added URL to markdown output ([#5](https://github.com/deathau/markdownload/issues/5))
