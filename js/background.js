/**
 * Background Script for OpenPGP Extension
 *
 * Handles:
 * - Extension lifecycle events
 * - Message passing between content scripts and sidebar
 * - Context menu integration
 * - Toolbar icon state management
 */

logger.log("OpenPGP Background", "Background script initializing");

/**
 * Browser action (toolbar icon) click handler
 * Opens the sidebar when the toolbar icon is clicked
 */
browser.browserAction.onClicked.addListener(() => {
  logger.log("OpenPGP Background", "Toolbar icon clicked, opening sidebar");
  browser.sidebarAction.open().catch((err) => {
    logger.error("OpenPGP Background", "Failed to open sidebar:", err);
  });
});

/**
 * Extension installation/update handler
 */
browser.runtime.onInstalled.addListener((details) => {
  logger.log("OpenPGP Background", "Extension installed/updated", details);

  if (details.reason === "install") {
    logger.log("OpenPGP Background", "First time installation");

    // Set default settings
    browser.storage.local.set({
      debugMode: true,
      version: "2.2.5",
      firegpg_install_date: Date.now(),
    });

    // Open sidebar on installation
    browser.sidebarAction.open().catch((err) => {
      logger.error("OpenPGP Background", "Failed to open sidebar:", err);
    });
  } else if (details.reason === "update") {
    logger.log(
      "OpenPGP Background",
      "Extension updated from",
      details.previousVersion,
    );
  }
});

/**
 * Browser startup handler — lock master password in all sidebar instances
 */
browser.runtime.onStartup.addListener(() => {
  logger.log("OpenPGP Background", "Browser started, extension active");
  // In-memory master password cannot survive a browser restart; notify sidebar just in case
  browser.runtime.sendMessage({ type: "lockMasterPassword" }).catch(() => {});

  // Ensure install date is recorded for users upgrading from older versions
  browser.storage.local.get("firegpg_install_date").then((result) => {
    if (!result.firegpg_install_date) {
      browser.storage.local.set({ firegpg_install_date: Date.now() });
      logger.log(
        "OpenPGP Background",
        "Install date set for existing user (upgrade fallback)",
      );
    }
  });
});

/**
 * Message listener for communication between components
 * Allows content scripts and sidebar to communicate
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.log(
    "OpenPGP Background",
    "Message received:",
    message.type || message,
  );

  // Handle different message types
  switch (message.type) {
    case "ping":
      // Simple ping/pong for connection testing
      logger.log("OpenPGP Background", "Ping received, sending pong");
      sendResponse({ success: true, message: "pong" });
      break;

    case "getKeys":
      // Request to get all keys (could be from content script)
      logger.log("OpenPGP Background", "Keys requested");
      browser.storage.local
        .get("MiniPGP_keys")
        .then((result) => {
          const keys = result.MiniPGP_keys || [];
          logger.log("OpenPGP Background", "Sending", keys.length, "keys");
          sendResponse({ success: true, keys });
        })
        .catch((error) => {
          logger.error("OpenPGP Background", "Error getting keys:", error);
          sendResponse({ success: false, error: error.message });
        });
      // Return true to indicate async response
      return true;

    case "openSidebar":
      // Request to open the sidebar
      logger.log("OpenPGP Background", "Opening sidebar");
      browser.sidebarAction
        .open()
        .then(() => {
          logger.log("OpenPGP Background", "Sidebar opened");
          sendResponse({ success: true });
        })
        .catch((error) => {
          logger.error("OpenPGP Background", "Error opening sidebar:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case "lockMasterPassword":
      // Another component requesting a lock (e.g. suspend)
      logger.log(
        "OpenPGP Background",
        "Forwarding lockMasterPassword to sidebar",
      );
      // Just acknowledge — pgpHandler in the sidebar page handles the actual lock
      sendResponse({ success: true });
      break;

    case "log":
      // Remote logging from content scripts
      logger.log("OpenPGP Background", "Content script log:", message.message);
      sendResponse({ success: true });
      break;

    default:
      logger.warn("OpenPGP Background", "Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
  }
});

/**
 * Create context menu items for PGP operations
 */
browser.contextMenus.create(
  {
    id: "OpenPGP-encrypt-selection",
    title: "Encrypt selected text with PGP",
    contexts: ["selection"],
  },
  () => {
    if (browser.runtime.lastError) {
      logger.error(
        "OpenPGP Background",
        "Context menu creation failed:",
        browser.runtime.lastError,
      );
    } else {
      logger.log(
        "OpenPGP Background",
        "Context menu created: encrypt-selection",
      );
    }
  },
);

browser.contextMenus.create(
  {
    id: "OpenPGP-decrypt-selection",
    title: "Decrypt selected text with PGP",
    contexts: ["selection"],
  },
  () => {
    if (browser.runtime.lastError) {
      logger.error(
        "OpenPGP Background",
        "Context menu creation failed:",
        browser.runtime.lastError,
      );
    } else {
      logger.log(
        "OpenPGP Background",
        "Context menu created: decrypt-selection",
      );
    }
  },
);

browser.contextMenus.create(
  {
    id: "OpenPGP-verify-selection",
    title: "Verify PGP signature",
    contexts: ["selection"],
  },
  () => {
    if (browser.runtime.lastError) {
      logger.error(
        "OpenPGP Background",
        "Context menu creation failed:",
        browser.runtime.lastError,
      );
    } else {
      logger.log(
        "OpenPGP Background",
        "Context menu created: verify-selection",
      );
    }
  },
);

/**
 * Context menu click handler
 */
browser.contextMenus.onClicked.addListener((info, tab) => {
  logger.log("OpenPGP Background", "Context menu clicked:", info.menuItemId);

  switch (info.menuItemId) {
    case "OpenPGP-encrypt-selection":
      logger.log("OpenPGP Background", "Encrypt selection requested");
      // Open sidebar and send selected text
      browser.sidebarAction.open().then(() => {
        // Send message to sidebar to prefill encryption form
        // Note: sidebar needs to be listening for this message
        browser.runtime
          .sendMessage({
            type: "prefill-encrypt",
            text: info.selectionText,
          })
          .catch((err) => {
            logger.log("OpenPGP Background", "Sidebar not ready yet:", err);
          });
      });
      break;

    case "OpenPGP-decrypt-selection":
      logger.log("OpenPGP Background", "Decrypt selection requested");
      browser.sidebarAction.open().then(() => {
        browser.runtime
          .sendMessage({
            type: "prefill-decrypt",
            text: info.selectionText,
          })
          .catch((err) => {
            logger.log("OpenPGP Background", "Sidebar not ready yet:", err);
          });
      });
      break;

    case "OpenPGP-verify-selection":
      logger.log("OpenPGP Background", "Verify selection requested");
      browser.sidebarAction.open().then(() => {
        browser.runtime
          .sendMessage({
            type: "prefill-verify",
            text: info.selectionText,
          })
          .catch((err) => {
            logger.log("OpenPGP Background", "Sidebar not ready yet:", err);
          });
      });
      break;
  }
});

/**
 * Browser action (toolbar icon) click handler
 */
browser.browserAction.onClicked.addListener((tab) => {
  logger.log("OpenPGP Background", "Toolbar icon clicked");

  // Toggle sidebar
  browser.sidebarAction
    .toggle()
    .then(() => {
      logger.log("OpenPGP Background", "Sidebar toggled");
    })
    .catch((err) => {
      logger.error("OpenPGP Background", "Failed to toggle sidebar:", err);
    });
});

/**
 * Monitor storage changes for debugging
 */
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    logger.log("OpenPGP Background", "Storage changed:", Object.keys(changes));

    // Log when keys are modified
    if (changes.MiniPGP_keys) {
      const oldCount = changes.MiniPGP_keys.oldValue?.length || 0;
      const newCount = changes.MiniPGP_keys.newValue?.length || 0;
      logger.log(
        "OpenPGP Background",
        `Keys count changed from ${oldCount} to ${newCount}`,
      );
    }
  }
});

/**
 * Handle extension errors
 */
browser.runtime.onSuspend.addListener(() => {
  logger.log(
    "OpenPGP Background",
    "Extension suspending — locking master password",
  );
  browser.runtime.sendMessage({ type: "lockMasterPassword" }).catch(() => {});
});

/**
 * Periodic health check
 */
setInterval(() => {
  browser.storage.local.get("MiniPGP_keys").then((result) => {
    const keyCount = result.MiniPGP_keys?.length || 0;
    logger.log("OpenPGP Background", `Health check — Keys: ${keyCount}`);
  });
}, 300000); // Every 5 minutes

logger.log("OpenPGP Background", "Background script initialized successfully");
