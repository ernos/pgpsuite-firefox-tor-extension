# PGP Suite - v5.70 Release Notes

## New Feature: Persistent Vault

A new **Persistent Vault** tab has been added, allowing you to securely store sensitive notes and credentials encrypted with your own PGP key directly in the browser.

### How it works

- **Create entries** by selecting one of your own private keys, writing your sensitive content (passwords, usernames, notes, etc.), and clicking **Encrypt & Save**. The content is encrypted with your key's public key and stored persistently in `browser.storage.local` — surviving browser restarts.
- **View and edit entries** by entering your key's passphrase and clicking **Unlock & Edit**. Once decrypted, the content becomes editable in-place.
- **Save changes** by clicking **Re-encrypt & Save**, which re-encrypts the updated content and overwrites the stored entry.
- **Lock** an entry at any time to clear it from session memory and return it to its encrypted state.
- **Delete** an entry — only available after successfully decrypting it, proving ownership.

### Security notes

- Only your own private keys (keys for which you hold the private key) are available in the key selection dropdown. Imported-only public keys are excluded.
- Decrypted content is held in session memory only and is never written to disk in plaintext.
- An entry cannot be edited or deleted without first successfully decrypting it with the correct passphrase.

## Changes

- Added **Persistent Vault** tab to the main navigation.
- Added `VaultController` class in `ui.js` handling all vault UI logic (create, decrypt, edit, re-encrypt, lock, delete).
- Vault entries are stored under the `MiniPGP_vault` key in `browser.storage.local`.
- Tab switching to the Vault tab automatically refreshes the key dropdown and entry list.

