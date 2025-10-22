/*
 * Auto verification harness:
 * - Fetches a live page
 * - Loads src/background/production-service-worker.js in a VM sandbox
 * - Stubs browser APIs and importScripts
 * - Runs getArticleFromDom + convertArticleToMarkdown
 * - Writes output to tests/tmp/auto_out.md and prints a short summary
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return await res.text();
}

async function main() {
  const url = process.argv[2] || 'https://lilianweng.github.io/posts/2025-05-01-thinking/';
  const outFile = process.argv[3] || path.join(__dirname, '..', 'tests', 'tmp', 'auto_out.md');

  const swPath = path.join(__dirname, '..', 'src', 'background', 'production-service-worker.js');
  const code = fs.readFileSync(swPath, 'utf8');

  // Prepare sandbox with minimal stubs
  const sandbox = {
    console,
    URL,
    setTimeout,
    clearTimeout,
    fetch: global.fetch || (url => import('node-fetch').then(({default: f}) => f(url))),
    // simple fetch shim if global.fetch is not available
    self: {},
    browser: {
      runtime: {
        onMessage: { addListener: () => {} },
        getPlatformInfo: async () => ({ os: 'node', arch: process.arch, nacl_arch: process.arch }),
        getBrowserInfo: async () => ({ name: 'node', version: process.version })
      },
      downloads: {
        onChanged: { addListener: () => {} },
        onDeterminingFilename: { addListener: () => {} },
        download: async () => 1
      }
    },
    clients: { claim: async () => {} },
    addEventListener: () => {},
    importScripts: () => {},
    module: {},
  };
  sandbox.self = sandbox;

  // Evaluate SW code in VM
  vm.createContext(sandbox);
  // Expose class to sandbox.self after evaluation
  vm.runInContext(code + "\ntry{ self.ServiceWorkerState = ServiceWorkerState; }catch(_){}\n", sandbox, { filename: 'production-service-worker.js' });

  // Access class from context
  const SWClass = sandbox.ServiceWorkerState || sandbox.self.ServiceWorkerState;
  if (!SWClass) throw new Error('ServiceWorkerState not found after evaluation');
  const sw = new SWClass();

  const html = await fetchText(url);
  const article = await sw.getArticleFromDom(html, url);
  const { markdown } = await sw.convertArticleToMarkdown(article, {});

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, markdown, 'utf8');

  // Print quick summary
  const preview = markdown.slice(0, 400).replace(/\n/g, '\\n');
  console.log('=== Auto Verify Summary ===');
  console.log('URL:', url);
  console.log('Title:', article?.title);
  console.log('Length (chars):', markdown.length);
  console.log('Contains sections:', ['Motivation', 'Analogy to Psychology', 'Computation as a Resource']
    .map(s => `${s}:${markdown.includes(s)}`).join(', '));
  console.log('Output:', outFile);
  console.log('Preview:', preview);
}

main().catch(err => {
  console.error('Auto verify failed:', err);
  process.exit(1);
});
