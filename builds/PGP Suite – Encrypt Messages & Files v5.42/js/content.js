/**
 * Content Script for OpenPGP Extension
 *
 * Injected into web pages to provide PGP functionality
 *
 * Features:
 * - Detect PGP blocks on pages (encrypted messages, public keys, signatures)
 * - Add decrypt/verify buttons to detected content
 * - Allow encrypting text from page inputs
 * - Integrate with page text areas for quick PGP operations
 */

console.log(
  "[OpenPGP Content] Content script loaded on:",
  window.location.href,
);

// Storage-based debug/verbose state — content scripts read storage directly
let _debugEnabled = false;
let _verboseEnabled = false;

browser.storage.local.get(["debugMode", "verboseMode"]).then((r) => {
  _debugEnabled = r.debugMode ?? false;
  _verboseEnabled = r.verboseMode ?? false;
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if ("debugMode" in changes) _debugEnabled = changes.debugMode.newValue;
  if ("verboseMode" in changes) _verboseEnabled = changes.verboseMode.newValue;
});

/**
 * Configuration
 */
const CONFIG = {
  // PGP block detection patterns
  PGP_MESSAGE_START: "-----BEGIN PGP MESSAGE-----",
  PGP_MESSAGE_END: "-----END PGP MESSAGE-----",
  PGP_SIGNED_START: "-----BEGIN PGP SIGNED MESSAGE-----",
  PGP_SIGNATURE_START: "-----BEGIN PGP SIGNATURE-----",
  PGP_SIGNATURE_END: "-----END PGP SIGNATURE-----",
  PGP_PUBLIC_KEY_START: "-----BEGIN PGP PUBLIC KEY BLOCK-----",
  PGP_PUBLIC_KEY_END: "-----END PGP PUBLIC KEY BLOCK-----",

  // CSS class for marked elements
  MARKED_CLASS: "OpenPGP-detected",

  // Whether to auto-detect PGP content
  AUTO_DETECT: true,
};

/**
 * Debug logger that sends logs to background script (gated by debugMode).
 *
 * @param {string} message - Message to log
 * @param {*} data - Optional data
 */
function debugLog(message, data = null) {
  if (!_debugEnabled) return;

  console.log(`[OpenPGP Content] ${message}`, data || "");

  // Also send to background script for centralized logging
  browser.runtime
    .sendMessage({
      type: "log",
      message: `Content: ${message}`,
      data: data,
    })
    .catch(() => {
      // Ignore errors if background script isn't ready
    });
}

/**
 * Detect if text contains PGP content
 *
 * @param {string} text - Text to check
 * @returns {Object} Detection result
 */
function detectPGPContent(text) {
  if (!text) return null;

  const result = {
    hasPGP: false,
    type: null,
    content: null,
  };

  // Check for encrypted message
  if (
    text.includes(CONFIG.PGP_MESSAGE_START) &&
    text.includes(CONFIG.PGP_MESSAGE_END)
  ) {
    debugLog("Detected PGP encrypted message");
    result.hasPGP = true;
    result.type = "encrypted";
    result.content = extractPGPBlock(
      text,
      CONFIG.PGP_MESSAGE_START,
      CONFIG.PGP_MESSAGE_END,
    );
  }
  // Check for signed message
  else if (text.includes(CONFIG.PGP_SIGNED_START)) {
    debugLog("Detected PGP signed message");
    result.hasPGP = true;
    result.type = "signed";
    // Signed messages need to include the signature block too
    const start = text.indexOf(CONFIG.PGP_SIGNED_START);
    const end = text.indexOf(CONFIG.PGP_SIGNATURE_END);
    if (end > start) {
      result.content = text.substring(
        start,
        end + CONFIG.PGP_SIGNATURE_END.length,
      );
    }
  }
  // Check for public key
  else if (
    text.includes(CONFIG.PGP_PUBLIC_KEY_START) &&
    text.includes(CONFIG.PGP_PUBLIC_KEY_END)
  ) {
    debugLog("Detected PGP public key");
    result.hasPGP = true;
    result.type = "publickey";
    result.content = extractPGPBlock(
      text,
      CONFIG.PGP_PUBLIC_KEY_START,
      CONFIG.PGP_PUBLIC_KEY_END,
    );
  }

  return result.hasPGP ? result : null;
}

/**
 * Extract PGP block from text
 *
 * @param {string} text - Text containing PGP block
 * @param {string} startMarker - Start marker
 * @param {string} endMarker - End marker
 * @returns {string} Extracted block
 */
function extractPGPBlock(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);

  if (start === -1 || end === -1) return null;

  return text.substring(start, end + endMarker.length);
}

/**
 * Create action button for PGP content
 *
 * @param {string} type - Type of PGP content
 * @param {string} content - The PGP content
 * @returns {HTMLElement} Button element
 */
function createActionButton(type, content) {
  const button = document.createElement("button");
  button.className = "OpenPGP-action-button";

  // Set button text and action based on type
  switch (type) {
    case "encrypted":
      button.textContent = "🔓 Decrypt with OpenPGP";
      button.title = "Open OpenPGP sidebar to decrypt this message";
      button.onclick = () => openSidebarWithAction("decrypt", content);
      break;
    case "signed":
      button.textContent = "✓ Verify with OpenPGP";
      button.title = "Open OpenPGP sidebar to verify this signature";
      button.onclick = () => openSidebarWithAction("verify", content);
      break;
    case "publickey":
      button.textContent = "📥 Import with OpenPGP";
      button.title = "Open OpenPGP sidebar to import this public key";
      button.onclick = () => copyToClipboard(content);
      break;
  }

  // Style the button
  Object.assign(button.style, {
    marginTop: "5px",
    marginBottom: "5px",
    padding: "5px 10px",
    backgroundColor: "#0066cc",
    color: "white",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  });

  // Hover effect
  button.onmouseenter = () => {
    button.style.backgroundColor = "#0052a3";
  };
  button.onmouseleave = () => {
    button.style.backgroundColor = "#0066cc";
  };

  return button;
}

/**
 * Open sidebar and send action to perform
 *
 * @param {string} action - Action to perform (decrypt, verify, etc.)
 * @param {string} content - Content to process
 */
function openSidebarWithAction(action, content) {
  debugLog(`Opening sidebar with action: ${action}`);

  // Store the content temporarily
  browser.storage.local
    .set({
      pendingAction: {
        action,
        content,
        timestamp: Date.now(),
      },
    })
    .then(() => {
      // Request to open sidebar
      browser.runtime
        .sendMessage({
          type: "openSidebar",
        })
        .then(() => {
          debugLog("Sidebar opened successfully");
        })
        .catch((error) => {
          debugLog("Error opening sidebar:", error);
          alert(
            "Please open the OpenPGP sidebar manually (View > Sidebar > OpenPGP)",
          );
        });
    });
}

/**
 * Copy text to clipboard
 *
 * @param {string} text - Text to copy
 */
function copyToClipboard(text) {
  debugLog("Copying to clipboard");

  navigator.clipboard
    .writeText(text)
    .then(() => {
      debugLog("Copied to clipboard successfully");
      alert(
        "PGP content copied to clipboard! You can now paste it in the OpenPGP sidebar.",
      );

      // Also try to open sidebar
      browser.runtime.sendMessage({ type: "openSidebar" }).catch(() => {});
    })
    .catch((error) => {
      debugLog("Clipboard copy failed:", error);

      // Fallback: create temporary textarea
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand("copy");
        alert("PGP content copied to clipboard!");
      } catch (err) {
        debugLog("Fallback copy also failed:", err);
        alert("Could not copy to clipboard. Please select and copy manually.");
      }

      document.body.removeChild(textarea);
    });
}

/**
 * Scan page for PGP content
 */
function scanPageForPGP() {
  if (!CONFIG.AUTO_DETECT) {
    debugLog("Auto-detect is disabled");
    return;
  }

  debugLog("Scanning page for PGP content");

  let foundCount = 0;

  // Get all text nodes and elements that might contain PGP content
  const elements = document.querySelectorAll("pre, code, p, div, textarea");

  elements.forEach((element) => {
    // Skip if already marked
    if (element.classList.contains(CONFIG.MARKED_CLASS)) {
      return;
    }

    const text = element.textContent || element.value;
    const detection = detectPGPContent(text);

    if (detection) {
      foundCount++;
      debugLog(`Found PGP content (${detection.type}) in:`, element.tagName);

      // Mark element
      element.classList.add(CONFIG.MARKED_CLASS);

      // Add action button
      const button = createActionButton(detection.type, detection.content);

      // Insert button after element
      if (element.parentNode) {
        element.parentNode.insertBefore(button, element.nextSibling);
      }
    }
  });

  if (foundCount > 0) {
    debugLog(`Scan complete. Found ${foundCount} PGP blocks`);
  }
}

/**
 * Add context menu support for textareas and input fields
 */
function setupContextMenuSupport() {
  debugLog("Setting up context menu support");

  // Listen for right-clicks on editable elements
  document.addEventListener(
    "contextmenu",
    (event) => {
      const target = event.target;

      // Check if clicked on textarea or input
      if (
        target.tagName === "TEXTAREA" ||
        (target.tagName === "INPUT" && target.type === "text") ||
        target.isContentEditable
      ) {
        // Store reference to the active element
        browser.storage.local
          .set({
            activeElement: {
              type: target.tagName,
              value: target.value || target.textContent,
              timestamp: Date.now(),
            },
          })
          .catch((error) => {
            debugLog("Error storing active element:", error);
          });
      }
    },
    true,
  );
}

/**
 * Monitor for dynamically added content
 */
function setupMutationObserver() {
  debugLog("Setting up mutation observer");

  const observer = new MutationObserver((mutations) => {
    // Debounce scanning - only scan if there were significant changes
    let shouldScan = false;

    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
      }
    });

    if (shouldScan) {
      // Debounced scan
      clearTimeout(window.MiniPGPScanTimeout);
      window.MiniPGPScanTimeout = setTimeout(() => {
        debugLog("Re-scanning page after DOM changes");
        scanPageForPGP();
      }, 1000);
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  debugLog("Mutation observer active");
}

/**
 * Listen for messages from background script
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog("Received message:", message.type || message);

  switch (message.type) {
    case "scan":
      // Manual scan request
      scanPageForPGP();
      sendResponse({ success: true });
      break;

    case "getSelectedText":
      // Return currently selected text
      const selectedText = window.getSelection().toString();
      sendResponse({ success: true, text: selectedText });
      break;

    default:
      sendResponse({ success: false, error: "Unknown message type" });
  }
});

/**
 * Initialize content script
 */
function initialize() {
  debugLog("Initializing content script");

  // Wait for page to be fully loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      debugLog("DOM loaded, starting initialization");
      runInitialization();
    });
  } else {
    runInitialization();
  }
}

/**
 * Run initialization tasks
 */
function runInitialization() {
  debugLog("Running initialization tasks");

  // Initial scan
  scanPageForPGP();

  // Set up context menu support
  setupContextMenuSupport();

  // Set up mutation observer for dynamic content
  if (document.body) {
    setupMutationObserver();
  } else {
    // If body not ready, wait a bit
    setTimeout(() => {
      if (document.body) {
        setupMutationObserver();
      }
    }, 100);
  }

  debugLog("Content script fully initialized");
}

// Start initialization
initialize();
