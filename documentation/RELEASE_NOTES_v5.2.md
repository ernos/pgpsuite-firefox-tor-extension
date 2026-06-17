# PGP Suite - v5.2 Release Notes

Added a shared singleton logger module implemented as an IIFE. It provides four methods:

- **logger.log(tag, ...args)**: debug-gated general info
- **logger.warn(tag, ...args)**: debug-gated warnings
- **logger.error(tag, ...args)**: always active (errors are never silenced)
- **logger.verbose(tag, ...args)**: gated behind a separate verbose flag
All output is prefixed with the tag and an ISO timestamp. The logger reads debugMode and verboseMode from browser.storage.local on init and listens for live changes via browser.storage.onChanged, so toggles take effect without a page reload.

## Supporting changes across the codebase:

- `manifest.json` — logger.js was prepended to the background script list so it loads before background.js.
- `index.html` — <script src="js/logger.js"> was added before the other UI scripts; two checkboxes (debugMode, verboseMode) were added to the settings UI.
- `background.js` — all raw console.log/warn/error calls were replaced with logger.log/warn/error calls with a "OpenPGP Background" tag. debugMode: true is set in storage on first install.
- `ui.js` — same replacement of console calls with tagged logger.* calls throughout; added logic to read/persist the two debug checkboxes to browser.storage.local.
