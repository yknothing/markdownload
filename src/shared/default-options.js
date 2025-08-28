// these are the default options
const defaultOptions = {
  headingStyle: "atx",
  hr: "___",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  fence: "```",
  emDelimiter: "_",
  strongDelimiter: "**",
  linkStyle: "inlined",
  linkReferenceStyle: "full",
  imageStyle: "markdown",
  imageRefStyle: "inlined",
  frontmatter: "---\ncreated: {date:YYYY-MM-DDTHH:mm:ss} (UTC {date:Z})\ntags: [{keywords}]\nsource: {baseURI}\nauthor: {byline}\n---\n\n# {pageTitle}\n\n> ## Excerpt\n> {excerpt}\n\n---",
  backmatter: "",
  title: "{pageTitle}",
  includeTemplate: false,
  saveAs: false,
  downloadImages: false,
  imagePrefix: '{pageTitle}/',
  mdClipsFolder: null,
  disallowedChars: '[]#^',
  downloadMode: 'downloadsApi',
  turndownEscape: true,
  contextMenus: true,
  obsidianIntegration: false,
  obsidianVault: "",
  obsidianFolder: "",
}

// function to get the options from storage and substitute default options if it fails
async function getOptions() {
  let options = {...defaultOptions}; // Create a copy to avoid mutation
  try {
    const storedOptions = await browser.storage.sync.get(defaultOptions);
    // CRITICAL FIX: Enhanced null safety for options merging
    if (storedOptions && typeof storedOptions === 'object') {
      options = {...defaultOptions, ...storedOptions};
      
      // Ensure critical string properties are never null/undefined
      if (!options.title || typeof options.title !== 'string') {
        console.warn('getOptions: Invalid title option, using default');
        options.title = defaultOptions.title;
      }
      
      if (!options.disallowedChars || typeof options.disallowedChars !== 'string') {
        console.warn('getOptions: Invalid disallowedChars option, using default');
        options.disallowedChars = defaultOptions.disallowedChars;
      }
      
    } else {
      console.warn('getOptions: Invalid stored options, using defaults');
    }
  } catch (err) {
    console.error('getOptions: Failed to load from storage:', err);
    self.serviceWorkerStatus?.errors?.push({
      type: 'options-load-error',
      message: err.message,
      timestamp: Date.now()
    });
  }
  
  // Fallback check for browser compatibility
  if (!browser?.downloads) {
    options.downloadMode = 'contentLink';
  }
  
  return options;
}