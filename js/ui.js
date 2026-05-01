/**
 * UI Controller for OpenPGP Extension
 *
 * Handles all user interface interactions and connects
 * the HTML elements to the PGP handler functionality
 */

logger.log("OpenPGP UI", "Initializing UI controller");

// Module-level reference set during DOMContentLoaded so TabManager can reach it
let fileController;

/**
 * Display a password prompt modal dialog
 *
 * @param {string} title - The title of the modal
 * @param {string} message - The message/prompt text
 * @returns {Promise<string|null>} The password entered, or null if cancelled
 */
function passwordPrompt(title, message = "") {
  return new Promise((resolve) => {
    const modal = document.getElementById("passwordModal");
    const input = document.getElementById("passwordModalInput");
    const titleEl = document.getElementById("passwordModalTitle");
    const messageEl = document.getElementById("passwordModalMessage");
    const statusEl = document.getElementById("passwordModalStatus");
    const okBtn = document.getElementById("passwordModalOk");
    const cancelBtn = document.getElementById("passwordModalCancel");

    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;
    input.value = "";
    statusEl.textContent = "";
    statusEl.style.display = "none";

    // Show modal
    modal.classList.remove("hidden");
    input.focus();

    const cleanup = () => {
      modal.classList.add("hidden");
      okBtn.removeEventListener("click", handleOk);
      cancelBtn.removeEventListener("click", handleCancel);
      input.removeEventListener("keypress", handleKeypress);
    };

    const handleOk = () => {
      const value = input.value;
      cleanup();
      resolve(value);
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    const handleKeypress = (e) => {
      if (e.key === "Enter") {
        handleOk();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    };

    okBtn.addEventListener("click", handleOk);
    cancelBtn.addEventListener("click", handleCancel);
    input.addEventListener("keypress", handleKeypress);
  });
}

/**
 * Display a status message to the user
 *
 * @param {HTMLElement} element - The element to display status in
 * @param {string} message - The message to display
 * @param {string} type - Message type: 'success', 'error', 'info', 'warning'
 */
function showStatus(element, message, type = "info") {
  logger.log("OpenPGP UI", `Status (${type}):`, message);

  element.textContent = message;
  element.className = `status status-${type}`;
  element.style.display = "block";
}

/**
 * Clear a status message
 *
 * @param {HTMLElement} element - The status element to clear
 */
function clearStatus(element) {
  element.textContent = "";
  element.style.display = "none";
}

/**
 * Show/hide an element
 *
 * @param {HTMLElement} element - The element to show/hide
 * @param {boolean} visible - Whether to show or hide
 */
function setVisible(element, visible) {
  if (visible) {
    element.classList.remove("hidden");
  } else {
    element.classList.add("hidden");
  }
}

/**
 * Tab Management
 */
class TabManager {
  constructor() {
    logger.log("OpenPGP UI", "Initializing tab manager");

    this.tabButtons = document.querySelectorAll(".tab-button");
    this.tabContents = document.querySelectorAll(".tab-content");

    // Set up tab click handlers
    this.tabButtons.forEach((button) => {
      button.addEventListener("click", () =>
        this.switchTab(button.dataset.tab),
      );
    });
  }

  /**
   * Switch to a specific tab
   *
   * @param {string} tabName - Name of tab to switch to
   */
  switchTab(tabName) {
    logger.log("OpenPGP UI", "Switching to tab:", tabName);

    // Deactivate all tabs
    this.tabButtons.forEach((btn) => btn.classList.remove("active"));
    this.tabContents.forEach((content) => content.classList.remove("active"));

    // Activate selected tab
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`${tabName}-tab`);

    if (activeButton && activeContent) {
      activeButton.classList.add("active");
      activeContent.classList.add("active");

      // Refresh key dropdowns when switching to tabs that need them
      if (["encrypt", "decrypt", "sign"].includes(tabName)) {
        this.refreshKeyDropdowns();
      }
      if (tabName === "files") {
        // fileController is set after TabManager init; access via global scope
        if (typeof fileController !== "undefined") {
          fileController.refreshKeyDropdowns();
        }
      }
    }
  }

  /**
   * Refresh all key selection dropdowns
   */
  async refreshKeyDropdowns() {
    logger.log("OpenPGP UI", "Refreshing key dropdowns");

    const keys = await pgpHandler.getAllKeys();

    // Update all key selection dropdowns
    const dropdowns = [
      document.getElementById("encryptSignerKey"),
      document.getElementById("decryptKey"),
      document.getElementById("signKey"),
    ];

    dropdowns.forEach((dropdown) => {
      if (!dropdown) return;

      dropdown.innerHTML = "";

      if (keys.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No keys available";
        dropdown.appendChild(option);
      } else {
        keys.forEach((key) => {
          const option = document.createElement("option");
          option.value = key.fingerprint;
          option.textContent = `${key.name} <${key.email}> (${key.fingerprint.substring(0, 16)}...)`;
          dropdown.appendChild(option);
        });
      }
    });
  }
}

/**
 * Key Management Controller
 */
class KeyManagement {
  constructor() {
    logger.log("OpenPGP UI", "Initializing key management");

    // Get DOM elements
    this.generateBtn = document.getElementById("generateKeyBtn");
    this.refreshBtn = document.getElementById("refreshKeysBtn");
    this.importBtn = document.getElementById("importKeyBtn");
    this.keysList = document.getElementById("keysList");
    this.publickeysList = document.getElementById("publickeysList");

    // Set up event listeners
    this.generateBtn.addEventListener("click", () => this.generateKey());
    this.refreshBtn.addEventListener("click", () => this.refreshKeys());
    this.importBtn.addEventListener("click", () => this.importKey());

    // Trigger generate when Enter is pressed in passphrase field
    document
      .getElementById("keyPassphrase")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.generateBtn.click();
        }
      });

    // Trigger import when Enter is pressed in passphrase field
    document
      .getElementById("importPassphrase")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.importBtn.click();
        }
      });

    // Set up copy buttons
    this.setupCopyButtons();

    // Check and show first-time setup banner
    this.checkFirstTimeSetup();

    // Initialize master password UI
    this.initMasterPassword();

    // Load keys on startup
    this.refreshKeys();
    this.refreshPublicKeys();
  }

  async checkFirstTimeSetup() {
    const result = await browser.storage.local.get(
      "hasSeenMasterPasswordSetup",
    );
    const hasSeenSetup = result.hasSeenMasterPasswordSetup || false;
    const hasMasterPassword = await pgpHandler.isMasterPasswordRequired();

    // Only show first-time banner if user hasn't seen it AND hasn't set a master password
    if (!hasSeenSetup && !hasMasterPassword) {
      const banner = document.getElementById("firstTimeSetupBanner");
      setVisible(banner, true);

      // Set up event handlers
      document
        .getElementById("firstTimeSetupYesBtn")
        .addEventListener("click", () => {
          this.handleFirstTimePasswordSetup();
        });

      document
        .getElementById("firstTimeSetupNoBtn")
        .addEventListener("click", () => {
          this.dismissFirstTimeSetup();
        });
    }
  }

  async handleFirstTimePasswordSetup() {
    // Get password from user
    const password = await passwordPrompt(
      "Set Master Password",
      "Enter your master password (minimum 8 characters)",
    );

    if (!password) {
      return; // User cancelled
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    // Confirm password
    const confirmPassword = await passwordPrompt(
      "Confirm Master Password",
      "Re-enter your master password to confirm",
    );

    if (!confirmPassword) {
      return; // User cancelled
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }

    // Set the master password
    try {
      await pgpHandler.enableMasterPassword(password);
      alert(
        "Master password has been set successfully! Your private keys will now be encrypted.",
      );

      // Mark as seen and hide banner
      await browser.storage.local.set({ hasSeenMasterPasswordSetup: true });
      const banner = document.getElementById("firstTimeSetupBanner");
      setVisible(banner, false);

      // Refresh the master password section
      this.renderMasterPasswordSection(true, true);
    } catch (err) {
      alert(`Error setting master password: ${err.message}`);
    }
  }

  async dismissFirstTimeSetup() {
    if (
      confirm(
        "Are you sure? Your private keys will be stored unencrypted. You can still set a master password later in the Keys tab.",
      )
    ) {
      await browser.storage.local.set({ hasSeenMasterPasswordSetup: true });
      const banner = document.getElementById("firstTimeSetupBanner");
      setVisible(banner, false);
    }
  }

  async initMasterPassword() {
    const required = await pgpHandler.isMasterPasswordRequired();
    const unlocked = pgpHandler.isMasterPasswordUnlocked();
    const banner = document.getElementById("masterPasswordBanner");

    if (required && !unlocked) {
      setVisible(banner, true);
    }

    this.renderMasterPasswordSection(required, unlocked);

    document
      .getElementById("masterUnlockBtn")
      .addEventListener("click", () => this.unlockMasterPassword());
    document
      .getElementById("masterUnlockInput")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.unlockMasterPassword();
      });
  }

  renderMasterPasswordSection(isSet, isUnlocked) {
    const section = document.getElementById("masterPasswordSection");
    if (isSet) {
      /*
      TODO:
  UNSAFE_VAR_ASSIGNMENT   Unsafe assignment to innerHTML    Due to both security and performance concerns, this may not be   js/ui.js        203    7     
      set using dynamic values which have not been adequately                                       
      sanitized. This can lead to security issues or fairly serious                                 
      performance degradation.
      */
      section.innerHTML = `
        <p style="color:var(--success-color);font-size:12px;margin-bottom:8px">✓ Private keys are encrypted in storage.</p>
        ${
          isUnlocked
            ? `
          <div class="form-group">
            <input type="password" id="newMasterPwdInput" placeholder="New master password" style="margin-bottom:6px">
            <button id="changeMasterPwdBtn" class="btn btn-secondary btn-small">Change Password</button>
            <button id="disableMasterPwdBtn" class="btn btn-danger btn-small" style="margin-left:6px">Disable Master Password</button>
            <button id="disableMasterPwdAndDeleteKeysBtn" class="btn btn-danger btn-small" style="margin-left:6px;margin-top:6px">Delete All Private Keys AND Disable Master Password</button>
            <div id="masterPwdSetStatus" class="status"></div>
          </div>
        `
            : `
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Unlock above to change or disable.</p>
          <button id="disableMasterPwdAndDeleteKeysBtn" class="btn btn-danger btn-small">Forgot Password? Delete All Keys</button>
          <div id="masterPwdSetStatus" class="status"></div>
        `
        }
      `;
      if (isUnlocked) {
        document
          .getElementById("changeMasterPwdBtn")
          .addEventListener("click", () => this.changeMasterPassword());
        document
          .getElementById("disableMasterPwdBtn")
          .addEventListener("click", () => this.disableMasterPassword());
        document
          .getElementById("disableMasterPwdAndDeleteKeysBtn")
          .addEventListener("click", () =>
            this.disableMasterPwdAndDeleteKeysBtn(),
          );
      } else {
        // Even when locked, allow deleting keys if password is forgotten
        document
          .getElementById("disableMasterPwdAndDeleteKeysBtn")
          .addEventListener("click", () =>
            this.disableMasterPwdAndDeleteKeysBtn(),
          );
      }
    } else {
      section.innerHTML = `
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Optionally encrypt stored private keys with a master password.</p>
        <input type="password" id="newMasterPwdInput" placeholder="Master password" style="display:block;width:100%;margin-bottom:6px">
        <button id="enableMasterPwdBtn" class="btn btn-secondary btn-small">Enable Protection</button>
        <div id="masterPwdSetStatus" class="status"></div>
      `;
      document
        .getElementById("enableMasterPwdBtn")
        .addEventListener("click", () => this.enableMasterPassword());
    }
  }

  async unlockMasterPassword() {
    const input = document.getElementById("masterUnlockInput");
    const statusEl = document.getElementById("masterUnlockStatus");
    const password = input.value;
    if (!password) {
      showStatus(statusEl, "Enter master password", "error");
      return;
    }
    input.disabled = true;
    const success = await pgpHandler.unlockWithMasterPassword(password);
    input.disabled = false;
    if (success) {
      input.value = "";
      setVisible(document.getElementById("masterPasswordBanner"), false);
      this.renderMasterPasswordSection(true, true);
      await this.refreshKeys();
    } else {
      input.value = "";
      showStatus(statusEl, "Incorrect master password", "error");
    }
  }

  async enableMasterPassword() {
    const input = document.getElementById("newMasterPwdInput");
    const statusEl = document.getElementById("masterPwdSetStatus");
    const password = input.value;
    if (!password || password.length < 8) {
      showStatus(statusEl, "Password must be at least 8 characters", "error");
      return;
    }
    showStatus(statusEl, "Encrypting keys...", "info");
    try {
      await pgpHandler.enableMasterPassword(password);
      input.value = "";
      showStatus(statusEl, "Master password enabled!", "success");
      this.renderMasterPasswordSection(true, true);
    } catch (err) {
      showStatus(statusEl, `Error: ${err.message}`, "error");
    }
  }

  async changeMasterPassword() {
    const input = document.getElementById("newMasterPwdInput");
    const statusEl = document.getElementById("masterPwdSetStatus");
    const password = input.value;
    if (!password || password.length < 8) {
      showStatus(
        statusEl,
        "New password must be at least 8 characters",
        "error",
      );
      return;
    }
    showStatus(statusEl, "Re-encrypting keys...", "info");
    try {
      await pgpHandler.enableMasterPassword(password);
      input.value = "";
      showStatus(statusEl, "Master password changed!", "success");
    } catch (err) {
      showStatus(statusEl, `Error: ${err.message}`, "error");
    }
  }

  async disableMasterPassword() {
    const statusEl = document.getElementById("masterPwdSetStatus");

    if (
      !confirm(
        "This will remove master password protection and store private keys unencrypted. Continue?",
      )
    ) {
      return;
    }

    showStatus(statusEl, "Removing master password protection...", "info");

    try {
      await pgpHandler.disableMasterPassword();
      showStatus(statusEl, "Master password protection disabled", "success");
      setTimeout(() => {
        this.renderMasterPasswordSection(false, false);
      }, 1500);
    } catch (err) {
      showStatus(statusEl, `Error: ${err.message}`, "error");
    }
  }

  async disableMasterPwdAndDeleteKeysBtn() {
    const statusEl = document.getElementById("masterPwdSetStatus");

    if (
      !confirm(
        "This will delete all of your private keys AND remove master password protection. Use this only if you forgot your master password! Private keys will be lost forever! Continue?",
      )
    ) {
      return;
    }

    showStatus(statusEl, "Deleting keys and removing protection...", "info");

    try {
      // Delete the storage variables
      await browser.storage.local.remove([
        "MiniPGP_keys",
        "MiniPGP_master_verify",
      ]);

      showStatus(
        statusEl,
        "All keys deleted and master password removed",
        "success",
      );

      // Refresh the UI
      setTimeout(() => {
        this.renderMasterPasswordSection(false, false);
        this.refreshKeys();
      }, 1500);
    } catch (err) {
      showStatus(statusEl, `Error: ${err.message}`, "error");
    }
  }
  /**
   * Set up click handlers for all copy buttons
   */
  setupCopyButtons() {
    document.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const targetId = btn.dataset.target;
        const textarea = document.getElementById(targetId);
        const text = textarea.value.trim();

        if (!text) {
          return;
        }

        try {
          await navigator.clipboard.writeText(text);
          logger.log("OpenPGP UI", `${targetId} copied to clipboard`);

          // Visual feedback
          btn.classList.add("copied");
          btn.textContent = "✓";

          // Show status message if there's a status div
          const statusDiv = document.getElementById(
            targetId.replace("Key", "Status"),
          );
          if (statusDiv) {
            const originalText = statusDiv.textContent;
            const originalClass = statusDiv.className;
            showStatus(statusDiv, "Copied to clipboard!", "success");
            setTimeout(() => {
              if (originalText) {
                statusDiv.textContent = originalText;
                statusDiv.className = originalClass;
              } else {
                clearStatus(statusDiv);
              }
            }, 2000);
          }

          // Reset button after delay
          setTimeout(() => {
            btn.classList.remove("copied");
            btn.textContent = "📋";
          }, 2000);
        } catch (err) {
          logger.error("OpenPGP UI", "Copy failed:", err);
          textarea.select();
        }
      });
    });
  }

  /**
   * Generate a new key pair
   */
  async generateKey() {
    logger.log("OpenPGP UI", "Generate key button clicked");

    const statusEl = document.getElementById("keyGenerationStatus");
    const name = document.getElementById("keyName").value.trim();
    const email = document.getElementById("keyEmail").value.trim();
    const passphrase = document.getElementById("keyPassphrase").value;

    // Validate inputs
    if (!name || !email || !passphrase) {
      showStatus(statusEl, "Please fill in all fields", "error");
      return;
    }

    if (passphrase.length < 8) {
      showStatus(statusEl, "Passphrase must be at least 8 characters", "error");
      return;
    }

    // Show progress
    showStatus(
      statusEl,
      "Generating key pair... This may take a minute.",
      "info",
    );
    this.generateBtn.disabled = true;

    try {
      logger.log("OpenPGP UI", "Calling PGP handler to generate key");

      // Generate the key
      const result = await pgpHandler.generateKey({
        name,
        email,
        passphrase,
        keySize: 16392,
      });

      if (result.success) {
        logger.log("OpenPGP UI", "Key generated successfully");
        showStatus(
          statusEl,
          `Key pair generated successfully! Fingerprint: ${result.fingerprint}`,
          "success",
        );

        // Clear form
        document.getElementById("keyName").value = "";
        document.getElementById("keyEmail").value = "";
        document.getElementById("keyPassphrase").value = "";

        // Refresh keys list
        await this.refreshKeys();
        incrementUsageCount();
      } else {
        logger.error("OpenPGP UI", "Key generation failed:", result.error);
        showStatus(statusEl, `Error: ${result.error}`, "error");
      }
    } catch (error) {
      logger.error(
        "OpenPGP UI",
        "Unexpected error during key generation:",
        error,
      );
      showStatus(statusEl, `Unexpected error: ${error.message}`, "error");
    } finally {
      this.generateBtn.disabled = false;
    }
  }

  /**
   * Refresh the keys list display
   */
  async refreshKeys() {
    logger.log("OpenPGP UI", "Refreshing keys list");

    try {
      const keys = await pgpHandler.getAllKeys();

      logger.log("OpenPGP UI", "Found", keys.length, "keys");

      // Check if master password protection is enabled
      const masterPasswordRequired =
        await pgpHandler.isMasterPasswordRequired();
      const masterPasswordUnlocked = pgpHandler.isMasterPasswordUnlocked();

      logger.log(
        "OpenPGP UI",
        "Master password required:",
        masterPasswordRequired,
      );
      logger.log(
        "OpenPGP UI",
        "Master password unlocked:",
        masterPasswordUnlocked,
      );

      // If master password is required but not unlocked, show unlock prompt
      if (masterPasswordRequired && !masterPasswordUnlocked) {
        logger.log(
          "OpenPGP UI",
          "Keys are encrypted - master password required",
        );
        setVisible(document.getElementById("masterPasswordBanner"), true);
        this.keysList.innerHTML =
          '<div class="alert" style="background: var(--warning-bg); color: var(--warning-color); padding: 12px; border-radius: 4px;">' +
          "<strong>🔒 Keys are encrypted</strong><br>" +
          "Please unlock with your master password above to view and manage your keys." +
          "</div>";
        return;
      }

      // Keys are either not encrypted, or master password is unlocked
      if (!masterPasswordRequired) {
        logger.log(
          "OpenPGP UI",
          "Keys are NOT encrypted - displaying directly",
        );
      } else {
        logger.log(
          "OpenPGP UI",
          "Master password unlocked - displaying decrypted keys",
        );
      }

      if (keys.length === 0) {
        this.keysList.innerHTML =
          '<p class="text-muted">No keys found. Generate a key pair to get started.</p>';
      } else {
        // Build keys display
        let html = "";

        keys.forEach((key) => {
          html += `
      <div class="key-item" data-fingerprint="${key.fingerprint}">
          <div class="key-info">
              <strong>${this.escapeHtml(key.name)}</strong> &lt;${this.escapeHtml(key.email)}&gt;
              <br>
              <small>Fingerprint: <code>${key.fingerprint}</code></small>
              <br>
              <small>Created: ${new Date(key.created).toLocaleString()}</small>
          </div>
          <div class="key-actions">
              <button class="btn btn-small btn-secondary export-public" data-fingerprint="${key.fingerprint}">
                  Export Public
              </button>
              <button class="btn btn-small btn-secondary export-private" data-fingerprint="${key.fingerprint}">
                  Export Private
              </button>
              <button class="btn btn-small btn-danger delete-key" data-fingerprint="${key.fingerprint}">
                  Delete
              </button>
          </div>
      </div>
    `;
        });
        /*
          TODO - UNSAFE_VAR_ASSIGNMENT (x3)   Unsafe assignment to innerHTML                    js/ui.js        933,935,938    13
              Due to both security and performance concerns, this may not be set using dynamic values which have not been adequately                                       
              sanitized. This can lead to security issues or fairly serious performance degradation.                      
          */
        this.keysList.innerHTML = html;

        // Registering click listeners for the indivudual keys "Export Public"/"Export Private"/"Delete"
        this.keysList.querySelectorAll(".export-public").forEach((btn) => {
          btn.addEventListener("click", (e) =>
            this.exportPublicKey(e.target.dataset.fingerprint),
          );
        });
        this.keysList.querySelectorAll(".export-private").forEach((btn) => {
          btn.addEventListener("click", (e) =>
            this.exportPrivateKey(e.target.dataset.fingerprint),
          );
        });
        this.keysList.querySelectorAll(".delete-key").forEach((btn) => {
          btn.addEventListener("click", (e) =>
            this.deleteKey(e.target.dataset.fingerprint),
          );
        });
      }
    } catch (error) {
      logger.error("OpenPGP UI", "Error refreshing keys:", error);
      this.keysList.innerHTML =
        '<p class="text-muted text-error">Error loading keys</p>';
    }
  }

  /**
   * Refresh and display imported public keys
   */
  async refreshPublicKeys() {
    logger.log("OpenPGP UI", "Refreshing public keys list");

    try {
      const publicKeys = await pgpHandler.getAllPublicKeys();

      logger.log("OpenPGP UI", "Found", publicKeys.length, "public keys");

      if (publicKeys.length === 0) {
        this.publickeysList.innerHTML =
          '<p class="text-muted">No imported public keys found. Import a few first.</p>';
      } else {
        // Build public keys display
        let html = "";

        publicKeys.forEach((key) => {
          html += `
      <div class="key-item" data-fingerprint="${key.fingerprint}">
          <div class="key-info">
              <strong>${this.escapeHtml(key.name)}</strong> &lt;${this.escapeHtml(key.email)}&gt;
              <br>
              <small>Fingerprint: <code>${key.fingerprint}</code></small>
              <br>
              <small>Imported: ${new Date(key.created).toLocaleString()}</small>
          </div>
          <div class="key-actions">
              <button class="btn btn-small btn-secondary export-public-key" data-fingerprint="${key.fingerprint}">
                  Export
              </button>
              <button class="btn btn-small btn-danger delete-public-key" data-fingerprint="${key.fingerprint}">
                  Delete
              </button>
          </div>
      </div>
    `;
        });

        this.publickeysList.innerHTML = html;

        // Register click listeners for the individual public keys
        this.publickeysList
          .querySelectorAll(".export-public-key")
          .forEach((btn) => {
            btn.addEventListener("click", (e) =>
              this.exportStoredPublicKey(e.target.dataset.fingerprint),
            );
          });
        this.publickeysList
          .querySelectorAll(".delete-public-key")
          .forEach((btn) => {
            btn.addEventListener("click", (e) =>
              this.deletePublicKey(e.target.dataset.fingerprint),
            );
          });
      }

      // Also refresh the encrypt and decrypt tab dropdowns
      this.updateEncryptPublicKeysDropdown();
      this.updateDecryptPublicKeysDropdown();
      this.verifyRecipientsPublicKeyDropDown();
      this.updateEncryptPublicKeysDropdown();
      this.updateDecryptPublicKeysDropdown();
    } catch (error) {
      logger.error("OpenPGP UI", "Error refreshing public keys:", error);
      this.publickeysList.innerHTML =
        '<p class="text-muted text-error">Error loading public keys</p>';
    }
  }

  async verifyRecipientsPublicKeyDropDown() {
    logger.log(
      "OpenPGP UI",
      "Updating verify tab recipients public keys dropdown",
    );

    try {
      const publicKeys = await pgpHandler.getAllPublicKeys();
      const dropdown = document.getElementById("verifyRecipientsPublicKey");

      // Clear existing options except the first one
      dropdown.innerHTML =
        '<option value="">-- Select an imported public key --</option>';

      // Add options for each public key
      publicKeys.forEach((key) => {
        const option = document.createElement("option");
        option.value = key.fingerprint;
        option.textContent = `${key.name} <${key.email}> (${key.fingerprint.substring(0, 16)}...)`;
        dropdown.appendChild(option);
      });

      logger.log(
        "OpenPGP UI",
        "Verify Tab's Dropdown updated with",
        publicKeys.length,
        "public keys",
      );
    } catch (error) {
      logger.error("OpenPGP UI", "Error updating verify tabs dropdown:", error);
    }
  }
  /**
   * Update the encrypt tab public keys dropdown
   */
  async updateEncryptPublicKeysDropdown() {
    logger.log("OpenPGP UI", "Updating encrypt tab public keys dropdown");

    try {
      const publicKeys = await pgpHandler.getAllPublicKeys();
      const dropdown = document.getElementById("fileEncryptRecipientSelect");

      // Clear existing options except the first one
      dropdown.innerHTML =
        '<option value="">-- Select an imported public key --</option>';

      // Add options for each public key
      publicKeys.forEach((key) => {
        const option = document.createElement("option");
        option.value = key.fingerprint;
        option.textContent = `${key.name} <${key.email}> (${key.fingerprint.substring(0, 16)}...)`;
        dropdown.appendChild(option);
      });

      logger.log(
        "OpenPGP UI",
        "Dropdown updated with",
        publicKeys.length,
        "public keys",
      );
    } catch (error) {
      logger.error("OpenPGP UI", "Error updating encrypt dropdown:", error);
    }
  }

  /**
   * Update the decrypt tab public keys dropdown
   */
  async updateDecryptPublicKeysDropdown() {
    logger.log("OpenPGP UI", "Updating decrypt tab public keys dropdown");

    try {
      const publicKeys = await pgpHandler.getAllPublicKeys();
      const dropdown = document.getElementById("fileDecryptKeySelect");

      // Clear existing options except the first one
      dropdown.innerHTML =
        '<option value="">-- Select an imported public key (optional) --</option>';

      // Add options for each public key
      publicKeys.forEach((key) => {
        const option = document.createElement("option");
        option.value = key.fingerprint;
        option.textContent = `${key.name} <${key.email}> (${key.fingerprint.substring(0, 16)}...)`;
        dropdown.appendChild(option);
      });

      logger.log(
        "OpenPGP UI",
        "Decrypt dropdown updated with",
        publicKeys.length,
        "public keys",
      );
    } catch (error) {
      logger.error("OpenPGP UI", "Error updating decrypt dropdown:", error);
    }
  }

  async encryptedText(fingerprint) {
    const textarea = document.getElementById("encryptedText");
    logger.log(
      "OpenPGP UI",
      "Copied encryptedText to clipboard! Contents: '" +
        textarea.innerHTML +
        "'",
    );
    return this.copyToClipboard(textarea.innerHTML);
  }
  /**
   * Export a public key
   *
   * @param {string} fingerprint - Key fingerprint
   */
  async exportPublicKey(fingerprint) {
    const publicKey = await pgpHandler.exportPublicKey(fingerprint);
    if (publicKey) {
      logger.log("OpenPGP UI", "Exporting public key to textarea", fingerprint);

      // Display key in textarea
      const textarea = document.getElementById("exportedPublicKey");
      const outputDiv = document.getElementById("exportedPublicOutput");
      const statusDiv = document.getElementById("exportPublicStatus");

      textarea.value = publicKey;
      setVisible(outputDiv, true);

      // Scroll to the output
      outputDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /**
   * Export a public key
   *
   * @param {string} fingerprint - Key fingerprint
   */
  async exportPrivateKey(fingerprint) {
    logger.log("OpenPGP UI", "Exporting private key:", fingerprint);

    if (
      !confirm(
        "Warning: Exporting your private key can be dangerous. Only do this if you know what you're doing. Continue?",
      )
    ) {
      return;
    }

    const privateKey = await pgpHandler.exportPrivateKey(fingerprint);
    if (privateKey) {
      // Display key in textarea
      const textarea = document.getElementById("exportedPrivateKey");
      const outputDiv = document.getElementById("exportedPrivateOutput");
      const statusDiv = document.getElementById("exportPrivateStatus");

      textarea.value = privateKey;
      setVisible(outputDiv, true);

      // Scroll to the output
      outputDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /**
   * Delete a key
   *
   * @param {string} fingerprint - Key fingerprint
   */
  async deleteKey(fingerprint) {
    logger.log("OpenPGP UI", "Delete key requested:", fingerprint);

    if (
      !confirm(
        "Are you sure you want to delete this key? This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await pgpHandler.deleteKey(fingerprint);
      logger.log("OpenPGP UI", "Key deleted successfully");
      await this.refreshKeys();
    } catch (error) {
      logger.error("OpenPGP UI", "Error deleting key:", error);
      alert("Error deleting key: " + error.message);
    }
  }

  /**
   * Export a stored public key
   *
   * @param {string} fingerprint - Key fingerprint
   */
  async exportStoredPublicKey(fingerprint) {
    logger.log("OpenPGP UI", "Exporting stored public key:", fingerprint);

    try {
      const key = await pgpHandler.getPublicKeyByFingerprint(fingerprint);
      if (key && key.publicKey) {
        // Display key in textarea
        const textarea = document.getElementById("exportedPublicKey");
        const outputDiv = document.getElementById("exportedPublicOutput");

        textarea.value = key.publicKey;
        setVisible(outputDiv, true);

        // Scroll to the output
        outputDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } catch (error) {
      logger.error("OpenPGP UI", "Error exporting public key:", error);
      alert("Error exporting public key: " + error.message);
    }
  }

  /**
   * Delete a stored public key
   *
   * @param {string} fingerprint - Key fingerprint
   */
  async deletePublicKey(fingerprint) {
    logger.log("OpenPGP UI", "Delete public key requested:", fingerprint);

    if (
      !confirm(
        "Are you sure you want to delete this public key? This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await pgpHandler.deletePublicKey(fingerprint);
      logger.log("OpenPGP UI", "Public key deleted successfully");
      await this.refreshPublicKeys();
    } catch (error) {
      logger.error("OpenPGP UI", "Error deleting public key:", error);
      alert("Error deleting public key: " + error.message);
    }
  }

  /**
   * Import a private key
   */
  async importKey() {
    logger.log("OpenPGP UI", "Import key button clicked");

    const statusEl = document.getElementById("importStatus");
    const keyText = document.getElementById("importKey").value.trim();
    const passphrase = document.getElementById("importPassphrase").value;

    if (!keyText) {
      showStatus(statusEl, "Please provide a key to import", "error");
      return;
    }

    showStatus(statusEl, "Importing key...", "info");
    this.importBtn.disabled = true;

    try {
      // Detect if it's a private or public key
      let result;
      let isPrivateKey = false;

      try {
        // Try to read as private key first
        await openpgp.readPrivateKey({ armoredKey: keyText });
        isPrivateKey = true;
        logger.log("OpenPGP UI", "Detected private key");
      } catch (e) {
        // If it fails, it might be a public key
        try {
          await openpgp.readKey({ armoredKey: keyText });
          isPrivateKey = false;
          logger.log("OpenPGP UI", "Detected public key");
        } catch (e2) {
          throw new Error("Invalid key format");
        }
      }

      if (isPrivateKey) {
        // Import as private key (requires passphrase)
        if (!passphrase) {
          showStatus(
            statusEl,
            "Please provide the passphrase for the private key",
            "error",
          );
          this.importBtn.disabled = false;
          return;
        }

        result = await pgpHandler.importPrivateKey(keyText, passphrase);

        if (result.success) {
          logger.log("OpenPGP UI", "Private key imported successfully");
          showStatus(
            statusEl,
            `Private key imported successfully! Fingerprint: ${result.fingerprint}`,
            "success",
          );

          document.getElementById("importKey").value = "";
          document.getElementById("importPassphrase").value = "";

          await this.refreshKeys();
        } else {
          logger.error(
            "OpenPGP UI",
            "Private key import failed:",
            result.error,
          );
          showStatus(statusEl, `Error: ${result.error}`, "error");
        }
      } else {
        // Import as public key (no passphrase needed)
        result = await pgpHandler.importPublicKey(keyText);

        if (result.success) {
          logger.log("OpenPGP UI", "Public key imported successfully");
          showStatus(
            statusEl,
            `Public key imported successfully! Fingerprint: ${result.fingerprint}`,
            "success",
          );

          document.getElementById("importKey").value = "";
          document.getElementById("importPassphrase").value = "";

          await this.refreshPublicKeys();
        } else {
          logger.error("OpenPGP UI", "Public key import failed:", result.error);
          showStatus(statusEl, `Error: ${result.error}`, "error");
        }
      }
    } catch (error) {
      logger.error("OpenPGP UI", "Unexpected error during import:", error);
      showStatus(statusEl, `Unexpected error: ${error.message}`, "error");
    } finally {
      this.importBtn.disabled = false;
    }
  }

  /**
   * Download text as a file
   *
   * @param {string} filename - Name of file to download
   * @param {string} content - Content of file
   */
  downloadTextFile(filename, content) {
    logger.log("OpenPGP UI", "Downloading file:", filename);

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    // Use downloads API for Firefox extension
    browser.downloads
      .download({
        url: url,
        filename: filename,
        saveAs: true,
      })
      .then(() => {
        logger.log("OpenPGP UI", "Download started");
        URL.revokeObjectURL(url);
      })
      .catch((error) => {
        logger.error("OpenPGP UI", "Download failed:", error);
      });
  }

  /**
   * Escape HTML to prevent XSS
   *
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Encryption Controller
 */
class EncryptionController {
  constructor() {
    logger.log("OpenPGP UI", "Initializing encryption controller");

    this.encryptBtn = document.getElementById("encryptBtn");
    this.signCheckbox = document.getElementById("encryptSign");
    this.signOptions = document.getElementById("encryptSignOptions");
    this.manualKeyToggle = document.getElementById("encryptManualKeyToggle");
    this.manualKeySection = document.getElementById("encryptRecipientManual");

    //"verifyRecipientsHide" is the div containing textarea verifyRecipients
    //verifyManualKeyToggle is the checkbox which hides or shows verifyRecipientsHide div
    this.verifyManualKeyToggle = document.getElementById(
      "verifyManualKeyToggle",
    );
    this.verifyRecipientHide = document.getElementById("verifyRecipientHide");

    this.encryptBtn.addEventListener("click", () => this.encrypt());
    this.signCheckbox.addEventListener("change", () => {
      setVisible(this.signOptions, this.signCheckbox.checked);
    });

    // Handle toggle for manual key entry in ENCRYPT tab
    this.manualKeyToggle.addEventListener("change", () => {
      setVisible(this.manualKeySection, this.manualKeyToggle.checked);
    });
    // Handle toggle for manual key entry in VERIFY tab
    this.verifyManualKeyToggle.addEventListener("change", () => {
      setVisible(this.verifyRecipientHide, this.verifyManualKeyToggle.checked);
    });

    document
      .getElementById("copyEncryptedBtn")
      .addEventListener("click", () => {
        this.updateClipboard("encryptedText");
      });

    document
      .getElementById("clearEncryptedBtn")
      .addEventListener("click", () => {
        document.getElementById("encryptedText").value = "";
        setVisible(document.getElementById("encryptedOutput"), false);
        clearStatus(document.getElementById("encryptStatus"));
      });

    // Trigger encrypt when Enter is pressed in passphrase field
    document
      .getElementById("encryptSignPassphrase")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.encryptBtn.click();
        }
      });
  }

  /**
   * Encrypt a message
   */
  async encrypt() {
    logger.log("OpenPGP UI", "Encrypt button clicked");

    const statusEl = document.getElementById("encryptStatus");
    const message = document.getElementById("encryptMessage").value.trim();
    const shouldSign = document.getElementById("encryptSign").checked;
    const useManualKey = document.getElementById(
      "encryptManualKeyToggle",
    ).checked;

    // Get public key from dropdown or manual entry
    let publicKey = "";
    if (useManualKey) {
      // Use manual entry
      publicKey = document.getElementById("encryptRecipient").value.trim();
    } else {
      // Use dropdown - get the selected key
      const selectedFingerprint = document.getElementById(
        "encryptRecipientSelect",
      ).value;
      if (selectedFingerprint) {
        const key =
          await pgpHandler.getPublicKeyByFingerprint(selectedFingerprint);
        if (key && key.publicKey) {
          publicKey = key.publicKey;
        }
      }
    }

    if (!message || !publicKey) {
      showStatus(
        statusEl,
        "Please provide both message and recipient public key",
        "error",
      );
      return;
    }

    showStatus(statusEl, "Encrypting message...", "info");
    this.encryptBtn.disabled = true;

    try {
      const options = {
        message,
        publicKey,
      };

      // Add signing if requested
      if (shouldSign) {
        const signerKey = document.getElementById("encryptSignerKey").value;
        const passphrase = document.getElementById(
          "encryptSignPassphrase",
        ).value;

        if (!signerKey || !passphrase) {
          showStatus(
            statusEl,
            "Please select signing key and enter passphrase",
            "error",
          );
          this.encryptBtn.disabled = false;
          return;
        }

        options.signWithKey = signerKey;
        options.passphrase = passphrase;
      }

      logger.log("OpenPGP UI", "Calling PGP handler to encrypt");

      const result = await pgpHandler.encrypt(options);

      if (result.success) {
        logger.log("OpenPGP UI", "Encryption successful");
        showStatus(statusEl, "Message encrypted successfully!", "success");

        document.getElementById("encryptedText").value = result.encrypted;
        setVisible(document.getElementById("encryptedOutput"), true);
        incrementUsageCount();
      } else {
        logger.error("OpenPGP UI", "Encryption failed:", result.error);
        showStatus(statusEl, `Error: ${result.error}`, "error");
      }
    } catch (error) {
      logger.error("OpenPGP UI", "Unexpected error during encryption:", error);
      showStatus(statusEl, `Unexpected error: ${error.message}`, "error");
    } finally {
      this.encryptBtn.disabled = false;
    }
  }

  /**
   * Copy text to clipboard
   *
   * @param {string} elementId - ID of textarea to copy from
   */
  async copyToClipboard(elementId) {
    const element = document.getElementById(elementId);

    try {
      await navigator.clipboard.writeText(element.value);
      logger.log("OpenPGP UI", "Copied to clipboard");
      alert("Copied to clipboard!");
    } catch (error) {
      logger.error("OpenPGP UI", "Copy failed:", error);
      // Fallback: select text
      element.select();
      alert("Please use Ctrl+C to copy");
    }
  }
}

/**
 * Decryption Controller
 */
class DecryptionController {
  constructor() {
    logger.log("OpenPGP UI", "Initializing decryption controller");

    this.decryptBtn = document.getElementById("decryptBtn");
    this.manualKeyToggle = document.getElementById("decryptManualKeyToggle");
    this.manualKeySection = document.getElementById("decryptVerifyKeyManual");

    this.decryptBtn.addEventListener("click", () => this.decrypt());
    document
      .getElementById("copyDecryptedBtn")
      .addEventListener("click", () => {
        this.copyToClipboard("decryptedText");
      });

    document
      .getElementById("clearDecryptedBtn")
      .addEventListener("click", () => {
        document.getElementById("decryptedText").value = "";
        document.getElementById("signatureInfo").innerHTML = "";
        setVisible(document.getElementById("decryptedOutput"), false);
        clearStatus(document.getElementById("decryptStatus"));
      });

    // Handle toggle for manual key entry
    this.manualKeyToggle.addEventListener("change", () => {
      setVisible(this.manualKeySection, this.manualKeyToggle.checked);
    });

    // Trigger decrypt when Enter is pressed in passphrase field
    document
      .getElementById("decryptPassphrase")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          logger.log("OpenPGP UI", "Enter key pressed, decrypt button");
          this.decryptBtn.click();
        }
      });
  }

  /**
   * Decrypt a message
   */
  async decrypt() {
    logger.log("OpenPGP UI", "Decrypt button clicked");

    const statusEl = document.getElementById("decryptStatus");
    const encrypted = document.getElementById("decryptMessage").value.trim();
    const privateKeyFingerprint = document.getElementById("decryptKey").value;
    const passphrase = document.getElementById("decryptPassphrase").value;
    const useManualKey = document.getElementById(
      "decryptManualKeyToggle",
    ).checked;

    // Get public key from dropdown or manual entry (for signature verification)
    let verifyWithKey = null;
    if (useManualKey) {
      // Use manual entry
      verifyWithKey =
        document.getElementById("decryptVerifyKey").value.trim() || null;
    } else {
      // Use dropdown - get the selected key
      const selectedFingerprint = document.getElementById(
        "decryptVerifyKeySelect",
      ).value;
      if (selectedFingerprint) {
        const key =
          await pgpHandler.getPublicKeyByFingerprint(selectedFingerprint);
        if (key && key.publicKey) {
          verifyWithKey = key.publicKey;
        }
      }
    }

    if (!encrypted || !privateKeyFingerprint || !passphrase) {
      showStatus(
        statusEl,
        "Please provide encrypted message, select key, and enter passphrase",
        "error",
      );
      return;
    }

    showStatus(statusEl, "Decrypting message...", "info");
    logger.log("OpenPGP UI", "Decrypting message....");
    this.decryptBtn.disabled = true;

    try {
      logger.log("OpenPGP UI", "Calling PGP handler to decrypt");

      const result = await pgpHandler.decrypt({
        encrypted,
        privateKeyFingerprint,
        passphrase,
        verifyWithKey,
      });

      if (result.success) {
        logger.log("OpenPGP UI", "Decryption successful");
        showStatus(statusEl, "Message decrypted successfully!", "success");
        incrementUsageCount();

        document.getElementById("decryptedText").value = result.decrypted;

        // Display signature info if present
        const sigInfo = document.getElementById("signatureInfo");
        if (result.signatureInfo) {
          if (result.signatureInfo.valid === true) {
            sigInfo.innerHTML = `<div class="signature-valid">✓ Valid signature from key: ${result.signatureInfo.keyID}</div>`;
          } else if (result.signatureInfo.valid === false) {
            sigInfo.innerHTML = `<div class="signature-invalid">✗ Invalid signature: ${result.signatureInfo.error}</div>`;
          } else {
            // valid === null means signature detected but not verified
            sigInfo.innerHTML = `<div class="signature-unverified">⚠ Signature detected from key: ${result.signatureInfo.keyID}<br><small>${result.signatureInfo.note}</small></div>`;
          }
        } else {
          sigInfo.innerHTML =
            '<div class="signature-none">No signature found</div>';
        }

        setVisible(document.getElementById("decryptedOutput"), true);
      }
    } catch (error) {
      logger.error("OpenPGP UI", "Unexpected error during decryption:", error);
      showStatus(statusEl, `Unexpected error: ${error.message}`, "error");
    } finally {
      this.decryptBtn.disabled = false;
    }
  }

  /**
   * Copy text to clipboard
   *
   * @param {string} elementId - ID of textarea to copy from
   */
  async copyToClipboard(elementId) {
    const element = document.getElementById(elementId);

    try {
      await navigator.clipboard.writeText(element.value);
      logger.log("OpenPGP UI", "Copied to clipboard");
      alert("Copied to clipboard!");
    } catch (error) {
      logger.error("OpenPGP UI", "Copy failed:", error);
      element.select();
      alert("Please use Ctrl+C to copy");
    }
  }
}

/**
 * Signing Controller
 */
class SigningController {
  constructor() {
    logger.log("OpenPGP UI", "Initializing signing controller");

    this.signBtn = document.getElementById("signBtn");

    this.signBtn.addEventListener("click", () => this.sign());
    document.getElementById("copySignedBtn").addEventListener("click", () => {
      this.copyToClipboard("signedText");
    });

    document.getElementById("clearSignedBtn").addEventListener("click", () => {
      document.getElementById("signedText").value = "";
      setVisible(document.getElementById("signedOutput"), false);
      clearStatus(document.getElementById("signStatus"));
    });

    // Trigger sign when Enter is pressed in passphrase field
    document
      .getElementById("signPassphrase")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.signBtn.click();
        }
      });
  }

  /**
   * Sign a message
   */
  async sign() {
    logger.log("OpenPGP UI", "Sign button clicked");

    const statusEl = document.getElementById("signStatus");
    const message = document.getElementById("signMessage").value.trim();
    const privateKeyFingerprint = document.getElementById("signKey").value;
    const passphrase = document.getElementById("signPassphrase").value;
    const signType = document.querySelector(
      'input[name="signType"]:checked',
    ).value;

    if (!message || !privateKeyFingerprint || !passphrase) {
      showStatus(
        statusEl,
        "Please provide message, select key, and enter passphrase",
        "error",
      );
      return;
    }

    showStatus(statusEl, "Signing message...", "info");
    this.signBtn.disabled = true;

    try {
      logger.log("OpenPGP UI", "Calling PGP handler to sign");

      const result = await pgpHandler.sign({
        message,
        privateKeyFingerprint,
        passphrase,
        detached: signType === "detached",
      });

      if (result.success) {
        logger.log("OpenPGP UI", "Signing successful");
        showStatus(statusEl, "Message signed successfully!", "success");

        document.getElementById("signedText").value = result.signed;
        setVisible(document.getElementById("signedOutput"), true);
        incrementUsageCount();
      } else {
        logger.error("OpenPGP UI", "Signing failed:", result.error);
        showStatus(statusEl, `Error: ${result.error}`, "error");
      }
    } catch (error) {
      logger.error("OpenPGP UI", "Unexpected error during signing:", error);
      showStatus(statusEl, `Unexpected error: ${error.message}`, "error");
    } finally {
      this.signBtn.disabled = false;
    }
  }

  /**
   * Copy text to clipboard
   *
   * @param {string} elementId - ID of textarea to copy from
   */
  async copyToClipboard(elementId) {
    const element = document.getElementById(elementId);

    try {
      await navigator.clipboard.writeText(element.value);
      logger.log("OpenPGP UI", "Copied to clipboard");
      alert("Copied to clipboard!");
    } catch (error) {
      logger.error("OpenPGP UI", "Copy failed:", error);
      element.select();
      alert("Please use Ctrl+C to copy");
    }
  }
}

/**
 * Verification Controller
 */
class VerificationController {
  constructor() {
    logger.log("OpenPGP UI", "Initializing verification controller");

    this.verifyBtn = document.getElementById("verifyBtn");

    this.verifyBtn.addEventListener("click", () => this.verify());

    document.getElementById("clearVerifyBtn").addEventListener("click", () => {
      document.getElementById("verifyResult").innerHTML = "";
      document.getElementById("verifyMessageText").value = "";
      setVisible(document.getElementById("verifyMessageTextWrapper"), false);
      setVisible(document.getElementById("verifyOutput"), false);
      clearStatus(document.getElementById("verifyStatus"));
    });
  }

  /**
   * Verify a signed message
   */
  async verify() {
    logger.log("OpenPGP UI", "Verify button clicked");

    const statusEl = document.getElementById("verifyStatus");
    const signedMessage = document.getElementById("verifyMessage").value.trim();
    const useManualKey = document.getElementById(
      "verifyManualKeyToggle",
    ).checked;

    // Get public key from dropdown or manual entry
    let publicKey = "";
    if (useManualKey) {
      // Use manual entry
      publicKey = document.getElementById("verifyRecipient").value.trim();
    } else {
      // Use dropdown - get the selected key
      const selectedFingerprint = document.getElementById(
        "verifyRecipientsPublicKey",
      ).value;
      if (selectedFingerprint) {
        const key =
          await pgpHandler.getPublicKeyByFingerprint(selectedFingerprint);
        if (key && key.publicKey) {
          publicKey = key.publicKey;
        }
      }
    }

    if (!signedMessage || !publicKey) {
      showStatus(
        statusEl,
        "Please provide both signed message and public key",
        "error",
      );
      return;
    }

    showStatus(statusEl, "Verifying signature...", "info");
    this.verifyBtn.disabled = true;

    try {
      logger.log("OpenPGP UI", "Calling PGP handler to verify");

      const result = await pgpHandler.verify({
        signedMessage,
        publicKey,
      });

      if (result.success) {
        logger.log("OpenPGP UI", "Verification complete");

        /*
         */
        if (result.valid) {
          showStatus(statusEl, "Signature is VALID ✓", "success");
          document.getElementById("verifyResult").innerHTML = `
                        <div class="signature-valid">
                            <h3>✓ Valid Signature</h3>
                            <p>Signed by key: <code>${result.keyID}</code></p>
                        </div>
                    `;
        } else {
          showStatus(statusEl, "Signature is INVALID ✗", "error");
          document.getElementById("verifyResult").innerHTML = `
                        <div class="signature-invalid">
                            <h3>✗ Invalid Signature</h3>
                            <p>Error: ${result.error}</p>
                        </div>
                    `;
        }
        const verifyMsgWrapper = document.getElementById(
          "verifyMessageTextWrapper",
        );
        const verifyMsgTextarea = document.getElementById("verifyMessageText");
        if (result.message) {
          verifyMsgTextarea.value = result.message;
          verifyMsgWrapper.classList.remove("hidden");
        } else {
          verifyMsgTextarea.value = "";
          verifyMsgWrapper.classList.add("hidden");
        }

        setVisible(document.getElementById("verifyOutput"), true);
        incrementUsageCount();
      } else {
        logger.error("OpenPGP UI", "Verification failed:", result.error);
        showStatus(statusEl, `Error: ${result.error}`, "error");
      }
    } catch (error) {
      logger.error(
        "OpenPGP UI",
        "Unexpected error during verification:",
        error,
      );
      showStatus(statusEl, `Unexpected error: ${error.message}`, "error");
    } finally {
      this.verifyBtn.disabled = false;
    }
  }

  /**
   * Escape HTML to prevent XSS
   *
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Settings Controller — manages backup export/import and master password UI in Settings tab
 */
class SettingsController {
  constructor() {
    logger.log("OpenPGP UI", "Initializing settings controller");

    document
      .getElementById("exportBackupBtn")
      .addEventListener("click", () => this.exportBackup());

    const importBackupBtn = document.getElementById("importBackupBtn");
    const importBackupFile = document.getElementById("importBackupFile");

    importBackupBtn.addEventListener("click", () => {
      importBackupFile.value = "";
      importBackupFile.click();
    });

    importBackupFile.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        this.importBackup(e.target.files[0]);
      }
    });
  }

  async exportBackup() {
    const statusEl = document.getElementById("backupStatus");
    showStatus(statusEl, "Preparing backup...", "info");

    try {
      const hasMasterPassword = await pgpHandler.isMasterPasswordRequired();

      const keysResult = await browser.storage.local.get("MiniPGP_keys");
      const keysData = keysResult.MiniPGP_keys;

      const publicKeys = await browser.storage.local.get("MiniPGP_public_keys");
      const publicKeysData = publicKeys.MiniPGP_public_keys;

      if (!keysData && !publicKeysData) {
        showStatus(
          statusEl,
          "No private or public keys found to export.",
          "error",
        );
        return;
      }

      let backup;
      let filename;

      if (hasMasterPassword) {
        const verifyResult = await browser.storage.local.get(
          "MiniPGP_master_verify",
        );
        const verifyData = verifyResult.MiniPGP_master_verify;

        backup = JSON.stringify(
          {
            MiniPGP_keys: keysData,
            MiniPGP_master_verify: verifyData,
            MiniPGP_public_keys: publicKeys,
          },
          null,
          2,
        );
        filename = "OpenPGP_full_backup_encrypted.json";
      } else {
        backup = JSON.stringify(
          {
            MiniPGP_keys: keysData,
            MiniPGP_public_keys: publicKeys,
          },
          null,
          2,
        );
        filename = "OpenPGP_full_backup.json";
      }

      const blob = new Blob([backup], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      browser.downloads
        .download({ url, filename, saveAs: true })
        .then(() => {
          URL.revokeObjectURL(url);
          showStatus(statusEl, `Backup saved as ${filename}`, "success");
        })
        .catch((err) => {
          URL.revokeObjectURL(url);
          showStatus(statusEl, `Download failed: ${err.message}`, "error");
        });
    } catch (err) {
      logger.error("OpenPGP UI", "Export backup failed:", err);
      showStatus(statusEl, `Error: ${err.message}`, "error");
    }
  }

  importBackup(file) {
    const statusEl = document.getElementById("backupStatus");
    showStatus(statusEl, "Reading backup file...", "info");

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        if (!parsed.MiniPGP_keys) {
          showStatus(
            statusEl,
            "Invalid backup file: missing MiniPGP_keys.",
            "error",
          );
          return;
        }

        const dataToStore = {
          MiniPGP_keys: parsed.MiniPGP_keys,
          MiniPGP_public_keys: parsed.MiniPGP_public_keys,
        };

        if (parsed.MiniPGP_master_verify) {
          dataToStore.MiniPGP_master_verify = parsed.MiniPGP_master_verify;
        }

        await browser.storage.local.set(dataToStore);

        const imported = Object.keys(dataToStore).join(", ");
        showStatus(
          statusEl,
          `Backup imported successfully (${imported}). Please reload the extension.`,
          "success",
        );

        logger.log("OpenPGP UI", "Backup imported:", imported);
      } catch (err) {
        logger.error("OpenPGP UI", "Import backup failed:", err);
        showStatus(statusEl, `Error reading backup: ${err.message}`, "error");
      }
    };

    reader.onerror = () => {
      showStatus(statusEl, "Failed to read the backup file.", "error");
    };

    reader.readAsText(file);
  }
}

/**
 * File Encryption / Decryption Controller
 */
class FileController {
  constructor() {
    logger.log("OpenPGP UI", "Initializing file controller");

    this.fileEncryptBtn = document.getElementById("fileEncryptBtn");
    this.fileDecryptBtn = document.getElementById("fileDecryptBtn");

    document
      .getElementById("fileEncryptManualKeyToggle")
      .addEventListener("change", (e) => {
        setVisible(
          document.getElementById("fileEncryptRecipientManual"),
          e.target.checked,
        );
      });

    this.fileEncryptBtn.addEventListener("click", () => this.encryptFile());
    this.fileDecryptBtn.addEventListener("click", () => this.decryptFile());

    this.refreshFileTabDropdowns();
  }

  async refreshFileTabDropdowns() {
    logger.log(
      "OpenPGP UI",
      "refreshing both pub/priv key dropdowns in file tab",
    );
    // Public keys for file encryption
    const publicKeys = await pgpHandler.getAllPublicKeys();
    const encDropdown = document.getElementById("fileEncryptRecipientSelect");
    encDropdown.innerHTML =
      '<option value="">-- Select an imported public key --</option>';
    publicKeys.forEach((key) => {
      const option = document.createElement("option");
      option.value = key.fingerprint;
      option.textContent = `${key.name} <${key.email}> (${key.fingerprint.substring(0, 16)}...)`;
      encDropdown.appendChild(option);
    });

    // Private keys for file decryption
    const privateKeys = await pgpHandler.getAllKeys();
    const decDropdown = document.getElementById("fileDecryptKeySelect");
    decDropdown.innerHTML = "";
    if (privateKeys.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No keys available";
      decDropdown.appendChild(opt);
    } else {
      privateKeys.forEach((key) => {
        const option = document.createElement("option");
        option.value = key.fingerprint;
        option.textContent = `${key.name} <${key.email}> (${key.fingerprint.substring(0, 16)}...)`;
        decDropdown.appendChild(option);
      });
    }
  }

  async encryptFile() {
    logger.log("OpenPGP UI", "encryptFile() called");
    const statusEl = document.getElementById("fileEncryptStatus");
    const fileInput = document.getElementById("fileEncryptInput");
    const useManual = document.getElementById(
      "fileEncryptManualKeyToggle",
    ).checked;

    if (!fileInput.files || !fileInput.files[0]) {
      showStatus(statusEl, "Please select a file to encrypt", "error");
      return;
    }

    let publicKeyArmor;
    if (useManual) {
      publicKeyArmor = document
        .getElementById("fileEncryptRecipient")
        .value.trim();
      if (!publicKeyArmor) {
        showStatus(
          statusEl,
          "Please paste the recipient's public key",
          "error",
        );
        return;
      }
    } else {
      const fingerprint = document.getElementById(
        "fileEncryptRecipientSelect",
      ).value;
      if (!fingerprint) {
        showStatus(statusEl, "Please select a recipient key", "error");
        return;
      }
      const keyObj = await pgpHandler.getPublicKeyByFingerprint(fingerprint);
      if (!keyObj) {
        showStatus(statusEl, "Key not found", "error");
        return;
      }
      publicKeyArmor = keyObj.publicKey;
    }

    const file = fileInput.files[0];
    showStatus(statusEl, `Encrypting ${file.name}...`, "info");
    this.fileEncryptBtn.disabled = true;

    try {
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const result = await pgpHandler.encryptFile({
        fileBytes,
        publicKey: publicKeyArmor,
        fileName: file.name,
      });

      if (result.success) {
        this.downloadTextFile(result.suggestedFileName, result.encrypted);
        showStatus(
          statusEl,
          `File encrypted and downloaded as ${result.suggestedFileName}`,
          "success",
        );
        logger.log(
          "OpenPGP UI",
          `File encrypted and downloaded as ${result.suggestedFileName}`,
        );
        fileInput.value = "";
        incrementUsageCount();
      } else {
        showStatus(statusEl, `Error: ${result.error}`, "error");
      }
    } catch (err) {
      showStatus(statusEl, `Error: ${err.message}`, "error");
    } finally {
      this.fileEncryptBtn.disabled = false;
    }
  }

  async decryptFile() {
    const statusEl = document.getElementById("fileDecryptStatus");
    const fileInput = document.getElementById("fileDecryptInput");
    const fingerprint = document.getElementById("fileDecryptKeySelect").value;
    const passphrase = document.getElementById("fileDecryptPassphrase").value;

    if (!fileInput.files || !fileInput.files[0]) {
      showStatus(statusEl, "Please select an encrypted file", "error");
      return;
    }
    if (!fingerprint) {
      showStatus(statusEl, "Please select your private key", "error");
      return;
    }
    if (!passphrase) {
      showStatus(statusEl, "Please enter your passphrase", "error");
      return;
    }

    const file = fileInput.files[0];
    showStatus(statusEl, `Decrypting ${file.name}...`, "info");
    this.fileDecryptBtn.disabled = true;

    try {
      const encryptedArmor = await file.text();
      const result = await pgpHandler.decryptFile({
        encryptedArmor,
        privateKeyFingerprint: fingerprint,
        passphrase,
      });

      if (result.success) {
        const outputFileName =
          result.filename ||
          file.name.replace(/\.(pgp|asc)$/i, "") ||
          "decrypted_file";
        this.downloadBinaryFile(outputFileName, result.data);
        showStatus(
          statusEl,
          `File decrypted and downloaded as ${outputFileName}`,
          "success",
        );
        fileInput.value = "";
        document.getElementById("fileDecryptPassphrase").value = "";
        incrementUsageCount();
      } else {
        showStatus(statusEl, `Error: ${result.error}`, "error");
      }
    } catch (err) {
      showStatus(statusEl, `Error: ${err.message}`, "error");
    } finally {
      this.fileDecryptBtn.disabled = false;
    }
  }

  downloadTextFile(filename, content) {
    logger.log("OpenPGP UI", "Downloading encrypted file:", filename);
    const blob = new Blob([content], { type: "application/pgp-encrypted" });
    const url = URL.createObjectURL(blob);
    browser.downloads
      .download({ url, filename, saveAs: true })
      .then(() => URL.revokeObjectURL(url))
      .catch((err) => logger.error("OpenPGP UI", "File download failed:", err));
  }

  downloadBinaryFile(filename, data) {
    logger.log("OpenPGP UI", "Downloading decrypted file:", filename);
    const blob = new Blob([data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    browser.downloads
      .download({ url, filename, saveAs: true })
      .then(() => URL.revokeObjectURL(url))
      .catch((err) => logger.error("OpenPGP UI", "File download failed:", err));
  }
}

/**
 * Increment the stored usage count by one.
 * Called after every successful crypto operation.
 */
async function incrementUsageCount() {
  try {
    const result = await browser.storage.local.get("firegpg_usage_count");
    const count = (result.firegpg_usage_count || 0) + 1;
    await browser.storage.local.set({ firegpg_usage_count: count });
    logger.log("OpenPGP UI", "Usage count incremented to", count);
  } catch (err) {
    logger.error("OpenPGP UI", "Failed to increment usage count:", err);
  }
}

/**
 * Review / Donate Nag Controller
 *
 * Shows a polite banner asking users to leave a review or donate after
 * they have used the extension for a while and performed several operations.
 * Users who want to report a problem are directed to the contact page.
 */
class ReviewNagController {
  // ── Configuration ──────────────────────────────────────────────────────
  // Update REVIEW_URL to the actual AMO listing URL for the extension.
  static REVIEW_URL =
    "https://addons.mozilla.org/en-US/firefox/addon/pgp-suite-encrypt-messages-files/reviews/";
  // Update DONATE_URL to your preferred donation page (PayPal, Ko-fi, etc.).
  static DONATE_URL = "https://www.yourdev.net";
  static CONTACT_URL = "https://www.yourdev.net/#contact";

  // Show nag after this many days since install…
  static MIN_DAYS_INSTALLED = 7;
  // …and this many successful operations.
  static MIN_USAGE_COUNT = 5;
  // Snooze duration: 30 days.
  static SNOOZE_DAYS = 30;
  // ───────────────────────────────────────────────────────────────────────

  constructor() {
    logger.log("OpenPGP UI", "Initializing review nag controller");
    this.banner = document.getElementById("reviewNagBanner");
    this.check();
  }

  async check() {
    try {
      const result = await browser.storage.local.get([
        "firegpg_install_date",
        "firegpg_usage_count",
        "firegpg_review_nag_state",
      ]);

      const installDate = result.firegpg_install_date || null;
      const usageCount = result.firegpg_usage_count || 0;
      const nagState = result.firegpg_review_nag_state || null;

      // Never show if permanently dismissed.
      if (nagState === "dismissed") return;

      // Never show if snoozed and the snooze period has not expired.
      if (nagState && nagState.startsWith("snoozed:")) {
        const until = parseInt(nagState.split(":")[1], 10);
        if (Date.now() < until) return;
      }

      // Require a known install date that is old enough.
      if (!installDate) return;
      const daysSinceInstall =
        (Date.now() - installDate) / (1000 * 60 * 60 * 24);
      if (daysSinceInstall < ReviewNagController.MIN_DAYS_INSTALLED) return;

      // Require enough actual usage.
      if (usageCount < ReviewNagController.MIN_USAGE_COUNT) return;

      this.show();
    } catch (err) {
      logger.error("OpenPGP UI", "Review nag check failed:", err);
    }
  }

  show() {
    logger.log("OpenPGP UI", "Showing review nag banner");

    // Wire up the links.
    document.getElementById("reviewNagReviewBtn").href =
      ReviewNagController.REVIEW_URL;
    document.getElementById("reviewNagDonateBtn").href =
      ReviewNagController.DONATE_URL;

    // Clicking a positive CTA (review / donate) dismisses the nag permanently.
    document
      .getElementById("reviewNagReviewBtn")
      .addEventListener("click", () => this.dismiss());
    document
      .getElementById("reviewNagDonateBtn")
      .addEventListener("click", () => this.dismiss());

    document
      .getElementById("reviewNagContactBtn")
      .addEventListener("click", () => {
        browser.tabs
          .create({ url: ReviewNagController.CONTACT_URL })
          .catch(() => {
            window.open(
              ReviewNagController.CONTACT_URL,
              "_blank",
              "noopener,noreferrer",
            );
          });
        this.snooze();
      });

    document
      .getElementById("reviewNagSnoozeBtn")
      .addEventListener("click", () => this.snooze());
    document
      .getElementById("reviewNagDismissBtn")
      .addEventListener("click", () => this.dismiss());

    this.banner.classList.remove("hidden");
  }

  async dismiss() {
    try {
      await browser.storage.local.set({
        firegpg_review_nag_state: "dismissed",
      });
      logger.log("OpenPGP UI", "Review nag dismissed permanently");
    } catch (err) {
      logger.error(
        "OpenPGP UI",
        "Failed to save review nag dismiss state:",
        err,
      );
    }
    this.banner.classList.add("hidden");
  }

  async snooze() {
    try {
      const until =
        Date.now() + ReviewNagController.SNOOZE_DAYS * 24 * 60 * 60 * 1000;
      await browser.storage.local.set({
        firegpg_review_nag_state: `snoozed:${until}`,
      });
      logger.log(
        "OpenPGP UI",
        "Review nag snoozed until",
        new Date(until).toLocaleDateString(),
      );
    } catch (err) {
      logger.error(
        "OpenPGP UI",
        "Failed to save review nag snooze state:",
        err,
      );
    }
    this.banner.classList.add("hidden");
  }
}

/**
 * Initialize all controllers when DOM is ready
 */
document.addEventListener("DOMContentLoaded", () => {
  logger.log("OpenPGP UI", "DOM loaded, initializing controllers");

  // Initialize controllers
  const tabManager = new TabManager();
  const keyManagement = new KeyManagement();
  const encryptionController = new EncryptionController();
  const decryptionController = new DecryptionController();
  const signingController = new SigningController();
  const verificationController = new VerificationController();
  fileController = new FileController();
  const settingsController = new SettingsController();
  const reviewNagController = new ReviewNagController();

  // Set up debug mode toggle
  const debugCheckbox = document.getElementById("debugMode");
  const verboseCheckbox = document.getElementById("verboseMode");

  // Load checkbox states from storage
  browser.storage.local.get(["debugMode", "verboseMode"]).then((result) => {
    if (result.debugMode !== undefined)
      debugCheckbox.checked = result.debugMode;
    if (result.verboseMode !== undefined)
      verboseCheckbox.checked = result.verboseMode;
  });

  debugCheckbox.addEventListener("change", () => {
    browser.storage.local.set({ debugMode: debugCheckbox.checked });
  });

  verboseCheckbox.addEventListener("change", () => {
    browser.storage.local.set({ verboseMode: verboseCheckbox.checked });
  });

  // Listen for lock requests from the background script (e.g. on browser startup / suspend)
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === "lockMasterPassword") {
      logger.log("OpenPGP UI", "Received lockMasterPassword — locking session");
      pgpHandler.lockMasterPassword();
      // Re-show the unlock banner if master password is configured
      pgpHandler.isMasterPasswordRequired().then((required) => {
        if (required) {
          setVisible(document.getElementById("masterPasswordBanner"), true);
          keyManagement.renderMasterPasswordSection(true, false);
        }
      });
    }
  });

  logger.log("OpenPGP UI", "All controllers initialized successfully");
});
