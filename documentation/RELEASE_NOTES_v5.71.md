# PGP Suite - v5.71 Release Notes

## Changes

### Toolbar Icon Now Opens a New Tab

Clicking the extension icon in the Firefox toolbar now opens the PGP Suite interface in a new tab instead of a popup. This provides a larger, more comfortable working area without the size constraints of a browser popup.

### Sidebar No Longer Opens Automatically

The `sidebar_action` manifest entry has been removed. Previously, clicking the toolbar icon would open both a new tab and the sidebar simultaneously. The sidebar toggle button has been removed to avoid this conflict. The extension now opens exclusively in a new tab when the toolbar icon is clicked.
