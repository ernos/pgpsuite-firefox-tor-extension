# PGP Suite - v5.3 Release Notes

Added full Android (Firefox for Android / Fenix) support. The extension now runs on both desktop and mobile Firefox without any feature regressions on desktop.

## Changes

### `manifest.json`
- Added a `gecko_android` block under `browser_specific_settings`, setting `strict_min_version` to `113.0` (the minimum Fenix version that supports MV2 extensions with popup UI).
- The existing `browser_action.default_popup` entry (`index.html`) serves as the UI entry point on Android, where sidebars are not supported.

### `js/background.js`
- All calls to `browser.sidebarAction` are now guarded with `if (browser.sidebarAction)` checks so they silently no-op on Android instead of throwing.
- The `openSidebar` message handler returns a no-op success response on Android (`sendResponse({ success: true })`) rather than attempting to open a non-existent sidebar.
- Context menu creation (`browser.contextMenus`) is wrapped in `if (browser.contextMenus)` so the entire block is skipped on Android, which does not support context menus.
- Updated comments throughout to document the desktop-vs-Android behaviour differences clearly.

### `css/styles.css`
- Added `min-width: 340px` and `min-height: 480px` to `body` to ensure the popup has a usable, readable size in both Android popup mode and desktop popup mode.