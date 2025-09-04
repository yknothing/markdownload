// Unified Logger Module
// - Wraps console methods with consistent, structured logs across the project
// - Adds timestamps, levels, component tag, caller file:line:function, and context
// - Safe in MV3 Service Worker, content scripts, and popup

(function() {
  'use strict';

  if (typeof self === 'undefined') return; // Safety

  // Avoid double install
  if (self.Logger && self.Logger.__installed) {
    return;
  }

  var originalConsole = typeof console !== 'undefined' ? console : null;
  if (!originalConsole) return;

  var config = {
    component: 'APP',
    includeStack: false,
    maxContextLength: 5000,
    timeFn: function() { return new Date().toISOString(); },
    levels: ['debug', 'info', 'warn', 'error']
  };

  var globalFields = {};

  function setGlobalFields(fields) {
    try {
      globalFields = Object.assign({}, globalFields, fields || {});
    } catch (e) {
      // ignore
    }
  }

  function configure(opts) {
    if (!opts || typeof opts !== 'object') return;
    Object.assign(config, opts);
  }

  function getCallerInfo() {
    try {
      var err = new Error();
      if (!err.stack) return {};
      var lines = err.stack.split('\n');
      // Skip first lines that refer to this logger wrapper
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line) continue;
        var isLogger = /logger\.js|Logger\./i.test(line);
        if (isLogger) continue;
        // Chrome style: at func (url:line:col) or at url:line:col
        var m = line.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/) || line.match(/at\s+(.*?):(\d+):(\d+)/);
        if (m) {
          var func = m[1] && m[1].indexOf('/') === -1 ? m[1] : '<anonymous>';
          var file = m[2] || m[1] || '';
          var lineNo = m[3] || '';
          return { func: func, file: file.split('/').slice(-2).join('/'), line: lineNo };
        }
      }
    } catch (e) {}
    return {};
  }

  function safeSerialize(obj) {
    if (obj == null) return obj;
    try {
      var str = typeof obj === 'string' ? obj : JSON.stringify(obj);
      if (str && str.length > config.maxContextLength) {
        return str.slice(0, config.maxContextLength) + '...(+truncated)';
      }
      return str;
    } catch (e) {
      return String(obj);
    }
  }

  function formatPrefix(level) {
    var ts = config.timeFn();
    var comp = config.component || 'APP';
    var caller = getCallerInfo();
    var where = caller.file ? (caller.file + ':' + (caller.line || '')) : '';
    var fn = caller.func || '';
    var wherePart = where ? (' ' + where) : '';
    var fnPart = fn ? (' ' + fn + '()') : '';
    return '[' + ts + '][' + String(level).toUpperCase() + '][' + comp + ']' + wherePart + fnPart + ' -';
  }

  function logWithLevel(level, args) {
    try {
      var prefix = formatPrefix(level);
      var parts = Array.prototype.slice.call(args);
      // If last arg is a plain object, treat as context
      var last = parts[parts.length - 1];
      var hasContext = last && typeof last === 'object' && !(last instanceof Error);
      var context = hasContext ? parts.pop() : null;
      var mergedContext = context ? Object.assign({}, globalFields, context) : (Object.keys(globalFields).length ? globalFields : null);
      if (mergedContext) {
        originalConsole[level](prefix, ...parts, '| ctx =', mergedContext);
      } else {
        originalConsole[level](prefix, ...parts);
      }
    } catch (e) {
      // Fallback to original console
      try { originalConsole[level].apply(originalConsole, args); } catch (_) {}
    }
  }

  var Logger = {
    __installed: true,
    configure: configure,
    setGlobalFields: setGlobalFields,
    debug: function() { logWithLevel('debug', arguments); },
    info: function() { logWithLevel('info', arguments); },
    warn: function() { logWithLevel('warn', arguments); },
    error: function() { logWithLevel('error', arguments); },
  };

  // Install console wrapper for uniform formatting
  try {
    var wrapped = {};
    config.levels.forEach(function(level) {
      var orig = originalConsole[level] ? originalConsole[level].bind(originalConsole) : originalConsole.log.bind(originalConsole);
      wrapped[level] = function() { logWithLevel(level, arguments); };
      // keep original on Logger in case needed
      Logger['__orig_' + level] = orig;
      // override console
      originalConsole[level] = wrapped[level];
    });
  } catch (e) {
    // ignore
  }

  // Expose globally
  self.Logger = Logger;

  // Auto-configure component if in SW vs window contexts
  try {
    var isSW = typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
    Logger.configure({ component: isSW ? 'SW' : (typeof window !== 'undefined' ? 'POPUP' : 'APP') });
  } catch (e) {}

})();

