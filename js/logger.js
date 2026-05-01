/**
 * Shared Logger for OpenPGP Extension
 *
 * Reads debugMode and verboseMode from browser.storage.local and reacts to
 * changes immediately, so checkbox toggles take effect without a reload.
 *
 * API — all methods accept a tag string followed by variadic args:
 *   logger.log(tag, ...args)     — debug-gated:   general info
 *   logger.warn(tag, ...args)    — debug-gated:   warnings
 *   logger.error(tag, ...args)   — always on:     errors are never silenced
 *   logger.verbose(tag, ...args) — verbose-gated: high-frequency / noisy detail
 */
const logger = (() => {
  let debugEnabled = false;
  let verboseEnabled = false;

  // Initialise from storage (async — fires before most user interaction)
  browser.storage.local.get(["debugMode", "verboseMode"]).then((r) => {
    debugEnabled = r.debugMode ?? false;
    verboseEnabled = r.verboseMode ?? false;
  });

  // React to live checkbox changes across all extension contexts
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if ("debugMode" in changes) debugEnabled = changes.debugMode.newValue;
    if ("verboseMode" in changes) verboseEnabled = changes.verboseMode.newValue;
  });

  const ts = () => new Date().toISOString();

  return {
    log(tag, ...args) {
      if (debugEnabled) console.log(`[${tag} ${ts()}]`, ...args);
    },
    warn(tag, ...args) {
      if (debugEnabled) console.warn(`[${tag} ${ts()}]`, ...args);
    },
    /** Errors always log regardless of debug mode. */
    error(tag, ...args) {
      console.error(`[${tag} ${ts()}]`, ...args);
    },
    verbose(tag, ...args) {
      if (verboseEnabled) console.debug(`[${tag} ${ts()}]`, ...args);
    },
  };
})();
