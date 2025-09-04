/**
 * Dependency Injector
 * Provides a simple dependency injection container for the service worker
 * Follows SRP: Single responsibility - manage dependencies and module lifecycle
 */

// Dependency Injector Module
(function() {
  'use strict';

  console.log('🔧 Loading Dependency Injector module...');

  // Dependency registry
  const registry = new Map();

  // Module initialization order
  const initializationOrder = [
    'ErrorHandler',
    'LifecycleManager',
    'BrowserAPI',
    'ServiceWorkerInit',
    'ContentExtractor',
    'TurndownManager',
    'DownloadManager',
    'MessageQueueManager',
    'DownloadProcessor'
  ];

  // Dependency graph
  const dependencyGraph = {
    ErrorHandler: [],
    LifecycleManager: ['ErrorHandler'],
    BrowserAPI: ['ErrorHandler'],
    ServiceWorkerInit: ['ErrorHandler', 'BrowserAPI'],
    ContentExtractor: ['ErrorHandler'],
    TurndownManager: ['ErrorHandler', 'ContentExtractor'],
    DownloadManager: ['ErrorHandler', 'BrowserAPI'],
    MessageQueueManager: ['ErrorHandler', 'ServiceWorkerInit'],
    DownloadProcessor: ['ErrorHandler', 'DownloadManager']
  };

  /**
   * Register a module in the dependency container
   */
  function register(name, module, dependencies = []) {
    if (registry.has(name)) {
      console.warn(`⚠️ Module ${name} is already registered, overwriting`);
    }

    registry.set(name, {
      module,
      dependencies,
      initialized: false,
      instance: null
    });

    console.log(`📝 Registered module: ${name}`);
  }

  /**
   * Get a module instance, resolving dependencies automatically
   */
  function get(name) {
    const entry = registry.get(name);

    if (!entry) {
      throw new Error(`Module ${name} not found in registry`);
    }

    if (entry.initialized) {
      return entry.instance;
    }

    // Resolve dependencies first
    const resolvedDeps = {};
    for (const dep of entry.dependencies) {
      resolvedDeps[dep] = get(dep);
    }

    // Initialize the module with its dependencies
    try {
      if (typeof entry.module === 'function') {
        entry.instance = entry.module(resolvedDeps);
      } else {
        entry.instance = entry.module;
      }

      entry.initialized = true;
      console.log(`✅ Initialized module: ${name}`);

      return entry.instance;

    } catch (error) {
      console.error(`❌ Failed to initialize module ${name}:`, error);
      throw error;
    }
  }

  /**
   * Check if a module is registered
   */
  function has(name) {
    return registry.has(name);
  }

  /**
   * Get all registered module names
   */
  function getRegisteredModules() {
    return Array.from(registry.keys());
  }

  /**
   * Get initialization status of all modules
   */
  function getStatus() {
    const status = {};

    for (const [name, entry] of registry) {
      status[name] = {
        initialized: entry.initialized,
        hasInstance: !!entry.instance,
        dependencies: entry.dependencies
      };
    }

    return status;
  }

  /**
   * Initialize all modules in the correct order
   */
  async function initializeAll() {
    console.log('🚀 Starting dependency injection initialization...');

    try {
      for (const moduleName of initializationOrder) {
        if (registry.has(moduleName)) {
          get(moduleName);
        }
      }

      console.log('✅ All modules initialized successfully');

      // Perform post-initialization setup
      await performPostInitializationSetup();

    } catch (error) {
      console.error('❌ Dependency injection initialization failed:', error);
      throw error;
    }
  }

  /**
   * Perform post-initialization setup
   */
  async function performPostInitializationSetup() {
    try {
      // Set up module communication
      setupModuleCommunication();

      // Validate module health
      await validateModuleHealth();

      // Set up error boundaries
      setupErrorBoundaries();

      console.log('✅ Post-initialization setup completed');

    } catch (error) {
      console.error('❌ Post-initialization setup failed:', error);
      throw error;
    }
  }

  /**
   * Set up communication between modules
   */
  function setupModuleCommunication() {
    // Set up event listeners for inter-module communication
    const modules = getRegisteredModules();

    modules.forEach(moduleName => {
      const instance = get(moduleName);

      if (instance && typeof instance.setupCommunication === 'function') {
        try {
          instance.setupCommunication();
        } catch (error) {
          console.warn(`⚠️ Failed to setup communication for ${moduleName}:`, error);
        }
      }
    });
  }

  /**
   * Validate health of all initialized modules
   */
  async function validateModuleHealth() {
    const modules = getRegisteredModules();
    const healthChecks = [];

    for (const moduleName of modules) {
      const instance = get(moduleName);

      if (instance && typeof instance.healthCheck === 'function') {
        healthChecks.push(
          instance.healthCheck().then(result => ({
            module: moduleName,
            healthy: result.healthy,
            details: result
          })).catch(error => ({
            module: moduleName,
            healthy: false,
            error: error.message
          }))
        );
      }
    }

    const results = await Promise.allSettled(healthChecks);
    const summary = {
      total: results.length,
      healthy: 0,
      unhealthy: 0,
      details: []
    };

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        summary.details.push(result.value);
        if (result.value.healthy) {
          summary.healthy++;
        } else {
          summary.unhealthy++;
        }
      } else {
        summary.details.push({
          module: 'unknown',
          healthy: false,
          error: result.reason.message
        });
        summary.unhealthy++;
      }
    });

    if (summary.unhealthy > 0) {
      console.warn(`⚠️ ${summary.unhealthy}/${summary.total} modules reported unhealthy status`);
    } else {
      console.log(`✅ All ${summary.total} modules are healthy`);
    }

    return summary;
  }

  /**
   * Set up error boundaries for modules
   */
  function setupErrorBoundaries() {
    const modules = getRegisteredModules();

    modules.forEach(moduleName => {
      const instance = get(moduleName);

      if (instance) {
        // Wrap critical methods with error boundaries
        wrapCriticalMethods(instance, moduleName);
      }
    });
  }

  /**
   * Wrap critical methods with error boundaries
   */
  function wrapCriticalMethods(instance, moduleName) {
    const criticalMethods = ['processMessage', 'handleRequest', 'download', 'extract'];

    criticalMethods.forEach(methodName => {
      if (typeof instance[methodName] === 'function') {
        const originalMethod = instance[methodName];

        instance[methodName] = async function(...args) {
          try {
            return await originalMethod.apply(this, args);
          } catch (error) {
            console.error(`🚨 Error in ${moduleName}.${methodName}:`, error);

            // Log to error handler if available
            if (self.ErrorHandler && typeof self.ErrorHandler.logError === 'function') {
              self.ErrorHandler.logError(error, {
                module: moduleName,
                method: methodName,
                args: args.length
              }, 'dependency-injection-error-boundary');
            }

            // Re-throw the error
            throw error;
          }
        };
      }
    });
  }

  /**
   * Create a module factory function
   */
  function createFactory(constructor, dependencies = []) {
    return function(deps) {
      // Validate that all required dependencies are available
      for (const dep of dependencies) {
        if (!deps[dep]) {
          throw new Error(`Missing required dependency: ${dep}`);
        }
      }

      return new constructor(deps);
    };
  }

  /**
   * Reset the dependency container (for testing)
   */
  function reset() {
    registry.clear();
    console.log('🔄 Dependency injector reset');
  }

  /**
   * Get dependency graph
   */
  function getDependencyGraph() {
    return { ...dependencyGraph };
  }

  /**
   * Validate dependency graph
   */
  function validateDependencyGraph() {
    const errors = [];
    const visited = new Set();
    const visiting = new Set();

    function checkCircularDependencies(moduleName) {
      if (visiting.has(moduleName)) {
        errors.push(`Circular dependency detected: ${moduleName}`);
        return;
      }

      if (visited.has(moduleName)) {
        return;
      }

      visiting.add(moduleName);

      const deps = dependencyGraph[moduleName] || [];
      for (const dep of deps) {
        checkCircularDependencies(dep);
      }

      visiting.delete(moduleName);
      visited.add(moduleName);
    }

    // Check all modules for circular dependencies
    for (const moduleName of Object.keys(dependencyGraph)) {
      if (!visited.has(moduleName)) {
        checkCircularDependencies(moduleName);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Export public API
  self.DependencyInjector = {
    register,
    get,
    has,
    getRegisteredModules,
    getStatus,
    initializeAll,
    reset,
    getDependencyGraph,
    validateDependencyGraph,
    createFactory
  };

  console.log('✅ Dependency Injector module loaded');

})();
