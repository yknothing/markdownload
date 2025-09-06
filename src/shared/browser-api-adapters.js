// Lightweight Browser API Adapters
// Purpose: Provide thin, testable wrappers around WebExtension APIs
//
// Roadmap (Small Steps, Do-Not-Overreach):
// - Phase 1 (now): Minimal class wrappers to satisfy constructor & basic method expectations in tests.
//   Keep responsibilities thin; no global behavioral changes. Ensure easy mocking/injection.
// - Phase 2 (short-term): Gradually adopt these adapters in production call sites (background, content scripts)
//   behind a factory, file-by-file, starting from Storage/Downloads. Avoid big-bang refactors.
// - Phase 3 (mid-term): Add targeted error normalization, retries or telemetry (where justified by tests/bugs).
//   Maintain SRP; avoid mixing business logic into adapters.
// - Phase 4 (long-term): Consolidate adapter usage across the codebase; deprecate direct `browser.*` calls
//   to improve testability and cross-browser consistency.
//
// Note: Keep adapters intentionally thin. Any policy/logic belongs to higher-level services.

class BaseAdapter {
  constructor(browserInstance) {
    // Prefer explicit instance, fallback to global
    this.browser = browserInstance || global.browser || global.chrome;
    if (!this.browser) throw new Error('Browser API not available');
  }
}

class BrowserStorageAdapter extends BaseAdapter {
  async get(keys) {
    return this.browser.storage?.sync?.get(keys);
  }
  async set(items) {
    return this.browser.storage?.sync?.set(items);
  }
  async remove(keys) {
    return this.browser.storage?.sync?.remove(keys);
  }
  async clear() {
    return this.browser.storage?.sync?.clear();
  }
}

class BrowserMessagingAdapter extends BaseAdapter {
  async sendMessage(message) {
    return this.browser.runtime?.sendMessage(message);
  }
  onMessage(listener) {
    this.browser.runtime?.onMessage?.addListener(listener);
    return () => this.browser.runtime?.onMessage?.removeListener?.(listener);
  }
}

class BrowserTabsAdapter extends BaseAdapter {
  async query(queryInfo) { return this.browser.tabs?.query(queryInfo); }
  async getCurrent() { return this.browser.tabs?.getCurrent(); }
  async get(id) { return this.browser.tabs?.get(id); }
  async sendMessage(tabId, message) { return this.browser.tabs?.sendMessage(tabId, message); }
  async executeScript(tabId, details) { return this.browser.tabs?.executeScript(tabId, details); }
  async update(updateProperties) { return this.browser.tabs?.update(updateProperties); }
}

class BrowserScriptingAdapter extends BaseAdapter {
  async executeScript(details) { return this.browser.scripting?.executeScript(details); }
  async insertCSS(details) { return this.browser.scripting?.insertCSS(details); }
  async removeCSS(details) { return this.browser.scripting?.removeCSS(details); }
}

class BrowserDownloadsAdapter extends BaseAdapter {
  async download(options) { return this.browser.downloads?.download(options); }
  async search(query) { return this.browser.downloads?.search(query); }
  async cancel(id) { return this.browser.downloads?.cancel(id); }
  onChanged(listener) {
    this.browser.downloads?.onChanged?.addListener(listener);
    return () => this.browser.downloads?.onChanged?.removeListener?.(listener);
  }
  onCreated(listener) {
    this.browser.downloads?.onCreated?.addListener(listener);
    return () => this.browser.downloads?.onCreated?.removeListener?.(listener);
  }
}

class BrowserContextMenusAdapter extends BaseAdapter {
  create(createProperties) { return this.browser.contextMenus?.create(createProperties); }
  update(id, updateProperties) { return this.browser.contextMenus?.update(id, updateProperties); }
  remove(id) { return this.browser.contextMenus?.remove(id); }
  removeAll() { return this.browser.contextMenus?.removeAll(); }
  onClicked(listener) {
    this.browser.contextMenus?.onClicked?.addListener(listener);
    return () => this.browser.contextMenus?.onClicked?.removeListener?.(listener);
  }
}

class BrowserCommandsAdapter extends BaseAdapter {
  onCommand(listener) {
    this.browser.commands?.onCommand?.addListener(listener);
    return () => this.browser.commands?.onCommand?.removeListener?.(listener);
  }
}

class BrowserRuntimeAdapter extends BaseAdapter {
  async getPlatformInfo() { return this.browser.runtime?.getPlatformInfo?.(); }
  async getBrowserInfo() { return this.browser.runtime?.getBrowserInfo?.(); }
  async sendMessage(message) { return this.browser.runtime?.sendMessage?.(message); }
  onMessage(listener) {
    this.browser.runtime?.onMessage?.addListener(listener);
    return () => this.browser.runtime?.onMessage?.removeListener?.(listener);
  }
}

module.exports = {
  BrowserStorageAdapter,
  BrowserMessagingAdapter,
  BrowserTabsAdapter,
  BrowserScriptingAdapter,
  BrowserDownloadsAdapter,
  BrowserContextMenusAdapter,
  BrowserCommandsAdapter,
  BrowserRuntimeAdapter
};
