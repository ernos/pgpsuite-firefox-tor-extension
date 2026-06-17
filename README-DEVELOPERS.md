# OpenPGP Extension

This project is mainly for people using Tor Browser and Firefox where PGP messages are common, especially on sites where you must decrypt a message to log in or encrypt one before sending it.
Many people are correctly taught: “Do not install random Tor extensions.” That warning is important. But this extension was built to reduce risk while still helping with a real problem people face every day.
Think of it like a lockbox that stays inside your browser:

    Your keys and messages are handled inside the extension, not sent to some mystery website or saved to your computer (it's easy to forget delete message files, decrypted messages and private keys       should always be encrypted/behind an admin password)
    The extension asks for very limited permissions (storage and downloads). Storage is for saving private keys, public keys and the master password.
    The code is open and readable, with no hidden/packed tricks, so anyone can inspect what it does.
    It uses OpenPGP.js, a widely reviewed crypto library used by many developers.

So, in simple terms for a 10-year-old: this tool is like doing your secret-note math in your own notebook at home (and **locked in a safe** if the master password is enabled, ***which it should be!***), instead of saving all keys, messages(encrypted and decrypted) on your hard-drive.
It still follows the golden rule (be careful with extensions), but it is designed to be transparent, minimal, and focused on keeping your private messages private.

## Ideal scenarios when this extension might be useful

- If you want to have Tor Browser on a USB stick and want your PGP keys to be portable as well ***TODO: Make a tutorial for how to create a portable USB TOR drive***
     ***(They will simply be saved the regular Firefox profile directory, depends on what OS you are running)***
- If you want to create a **LIVE USB** with a privacy-oriented operating system with encrypted root partition and include a portable version of TOR with the extension
- If you are using Windows and outdated versions of PGP programs (Yes, I'm talking about you, **GPG4USB**)
     ***This extensions uses a library of OpenPGP which is much more up to date and much safer to use***
- Just for simplicity. No need to remember nugpg arguments or anything else - ***It's super-easy to use***
  
## Features

 **Complete PGP Functionality**
- Generate RSA key pairs
- Encrypt messages with public keys
- Decrypt messages with private keys
- Sign messages (cleartext and detached)
- Verify signatures
- Import/Export keys (both private and public)
- Auto-detect key type during import
- Separate storage for imported public keys
- Handle encrypted, signed, and encrypted+signed messages
- Auto-detect PGP content on web pages

 **User-Friendly Interface**
- Clean sidebar interface
- Tab-based navigation
- Public key dropdown selectors for easy encryption
- Signature verification dropdown in decrypt tab
- Toggle between dropdown and manual key entry
- Dedicated section for imported public keys
- Copy-to-clipboard functionality
- Context menu integration
- Real-time status feedback

 **Developer-Friendly**
- Extensive code comments
- Debug logging (toggleable)
- No minification or obfuscation
- Clean, maintainable code structure

## Installation

### Step 1: Download OpenPGP.js Library

This extension requires the OpenPGP.js library for cryptographic operations.

1. Visit the OpenPGP.js releases page: https://github.com/openpgpjs/openpgpjs/releases
2. Download the latest version (e.g., `openpgp.min.js`)
3. Place it in the `lib/` directory of this extension as `openpgp.min.js`

**Or use this direct command:**

```bash
# Create lib directory
mkdir -p lib

# Download OpenPGP.js (version 5.x)
curl -L -o lib/openpgp.min.js https://unpkg.com/openpgp@5/dist/openpgp.min.js
```
Install openpgp.js library

```bash
npm install openpgp
nvm run build.js

#This scripts will take the version number from the file __version__ and increment it with one, then replace __VERSION__ in index.html and manifest.json with the version number. Thats all it does basically, then it builds the archive.
./make.sh
```

### Step 2: Create Icon Files

Create placeholder icon files in the `icon/` directory:

```bash
mkdir -p icon
```

You can use any PNG images (19x19, 38x38, and 64x64 pixels) or create simple placeholders.

### Step 3: Load Extension in Firefox

#### For Development/Testing (Temporary):

1. Open Firefox
2. Type `about:debugging` in the address bar
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Navigate to the extension directory and select `manifest.json`

#### For Permanent Installation:

1. Package the extension: `zip -r OpenPGP.xpi *`
2. Open Firefox
3. Go to `about:addons`
4. Click the gear icon → "Install Add-on From File"
5. Select the `OpenPGP.xpi` file

**Note:** For production use, you'll need to sign the extension through Mozilla's Add-on store.

## Usage

### Opening the Extension

- Click the OpenPGP icon in the toolbar, OR
- Go to View → Sidebar → OpenPGP

### Generating Your First Key Pair

1. Open the sidebar
2. Go to the "Keys" tab
3. Fill in your name, email, and a strong passphrase
4. Click "Generate Key Pair"
5. Wait about 30-60 seconds for key generation to complete

### Importing Keys

The extension automatically detects whether you're importing a private key or a public key:

**To Import a Private Key:**
1. Go to the "Keys" tab
2. Scroll to "Import/Export" section
3. Paste your private key
4. Enter the passphrase
5. Click "Import Key"

**To Import a Public Key:**
1. Go to the "Keys" tab
2. Scroll to "Import/Export" section
3. Paste the public key
4. Leave passphrase field empty (not needed for public keys)
5. Click "Import Key"
6. The public key will appear in "Imported Public Keys" section

### Encrypting a Message

**Using Imported Public Keys (Recommended):**
1. Go to the "Encrypt" tab
2. Select recipient from the "Recipient's Public Key" dropdown
3. Type your message
4. Optionally check "Sign message with my key"
5. Click "Encrypt Message"
6. Copy the encrypted output

**Using Manual Key Entry:**
1. Go to the "Encrypt" tab
2. Check "Use manual key entry instead"
3. Paste the recipient's public key in the textarea
4. Type your message
5. Click "Encrypt Message"

### Decrypting a Message

1. Go to the "Decrypt" tab
2. Paste the encrypted message
3. Select your private key
4. Enter your passphrase
5. (Optional) Select sender's public key from dropdown for signature verification
6. Click "Decrypt Message"

**Note:** The extension now properly handles:
- Encrypted messages
- Signed-only messages
- Encrypted + signed messages

### Signing a Message

1. Go to the "Sign" tab
2. Type your message
3. Select your private key
4. Enter your passphrase
5. Choose signature type (cleartext or detached)
6. Click "Sign Message"

### Verifying a Signature

1. Go to the "Verify" tab
2. Paste the signed message
3. Paste the signer's public key
4. Click "Verify Signature"

### Auto-Detection Feature

The extension automatically detects PGP content on web pages and adds action buttons:
- " Decrypt with OpenPGP" for encrypted messages
- " Verify with OpenPGP" for signed messages  
- " Import with OpenPGP" for public keys

## Project Structure

## File Structure

```
OpenPGP/
│
├── manifest.json           # Extension configuration (Manifest V3)
├── index.html             # Main sidebar UI
│
├── js/                    # JavaScript modules
│   ├── pgp-handler.js     # Core PGP operations (1,080 lines)
│   ├── ui.js              # UI controllers (780 lines)
│   ├── background.js      # Background service worker (220 lines)
│   └── content.js         # Content script for page integration (480 lines)
│
├── css/
│   └── styles.css         # Complete styling (570 lines)
│
├── lib/
│   └── openpgp.min.js     # OpenPGP.js cryptography library
│
├── icon/
│   ├── icon_gray.png      # Toolbar icon (19x19)
│   └── icon64.png         # Sidebar icon (64x64)
│
├── README.md              # Complete documentation
├── QUICKSTART.md          # Quick start guide
├── setup.sh               # Automated setup script
└── verify-setup.sh        # Setup verification script
```

## Code Architecture

### Components

1. **pgp-handler.js** - Core PGP functionality
   - Key generation, encryption, decryption
   - Signing and verification
   - Key storage management
   - Uses OpenPGP.js library

2. **ui.js** - User interface controller
   - Tab management
   - Form handling
   - Event listeners
   - Status messages

3. **background.js** - Extension lifecycle
   - Installation/update handling
   - Message passing
   - Context menu creation
   - Storage monitoring

4. **content.js** - Web page integration
   - Auto-detect PGP content
   - Add action buttons
   - Context menu support
   - Monitor dynamic content

### Data Storage

Keys are stored in Firefox's local storage API (`browser.storage.local`):

```javascript
{
  // User's own private/public key pairs
  MiniPGP_keys: [
    {
      name: "User Name",
      email: "user@example.com",
      privateKey: "-----BEGIN PGP PRIVATE KEY BLOCK-----...",
      publicKey: "-----BEGIN PGP PUBLIC KEY BLOCK-----...",
      fingerprint: "ABCD1234...",
      keyID: "1234ABCD",
      created: "2024-01-01T00:00:00.000Z"
    }
  ],
  
  // Imported public keys (encryption recipients)
  MiniPGP_public_keys: [
    {
      name: "Recipient Name",
      email: "recipient@example.com",
      publicKey: "-----BEGIN PGP PUBLIC KEY BLOCK-----...",
      fingerprint: "EFGH5678...",
      keyID: "5678EFGH",
      created: "2024-01-01T00:00:00.000Z",
      imported: true
    }
  ],
  
  debugMode: false
}
```

## Debug Mode

Enable debug mode for detailed logging:

1. Scroll to the bottom of the sidebar
2. Check "Enable Debug Logging"
3. Open Firefox Developer Tools (F12)
4. View console logs prefixed with `[OpenPGP]`

## Security Considerations

 **Important Security Notes:**

1. **Passphrase Storage**: This extension does NOT store your passphrases. You must enter them each time you use your private key.

2. **Private Key Storage**: Private keys are stored encrypted (by the passphrase) in Firefox's local storage. While this is relatively secure, for maximum security consider:
   - Using strong passphrases
   - Not storing highly sensitive keys in the browser
   - Regularly backing up keys to secure offline storage

3. **Memory Security**: Passphrases and decrypted keys exist briefly in browser memory during operations. Close the browser to clear memory.

4. **Web Page Access**: Content scripts can detect PGP content on pages but cannot access your keys without explicit user action.

## Development

### Prerequisites
- Firefox Developer Edition (recommended) or Firefox
- Basic knowledge of JavaScript, HTML, CSS
- Understanding of PGP/PGP concepts

### Making Changes

1. Edit the source files
2. Reload the extension in `about:debugging`
3. Test your changes
4. Check the console for errors and debug logs

### Code Style

- Extensive comments explaining functionality
- Debug logging throughout
- No minification or obfuscation
- Clear variable and function names
- Modular class-based architecture

## Troubleshooting

### Extension won't load
- Ensure `lib/openpgp.min.js` exists
- Check Firefox console for errors
- Verify manifest.json is valid JSON

### Key generation fails
- Check debug logs
- Ensure all fields are filled
- Try a shorter key size (2048 instead of 4096)

### Can't decrypt messages
- Verify you have the correct private key
- Check passphrase is correct
- Ensure message was encrypted for your public key
- For signed-only messages, they will be processed even without encryption
- If message is only signed (not encrypted), you don't need to provide a private key

### Public key dropdown is empty
- Ensure you have imported at least one public key
- Go to Keys tab and import a public key
- Check the "Imported Public Keys" section to verify keys are stored

### Auto-detection not working
- Check debug logs
- Verify PGP blocks have correct formatting
- Try manual refresh of the page

## Contributing

Potential improvements:

- [ ] Support for ECC keys
- [ ] Key server integration
- [ ] Bulk operations
- [ ] Settings/preferences page
- [ ] Key expiration handling
- [ ] Subkey management
- [ ] Web Crypto API integration for better performance
- [ ] Search/filter functionality for imported public keys
- [ ] Key nicknames or labels for easier identification
- [ ] Export all keys at once
- [ ] QR code generation for public keys

**Recently Completed:**
- [x] Separate storage for imported public keys
- [x] Auto-detect key type during import
- [x] Public key dropdown selectors
- [x] Handle signed-only messages (not just encrypted)
- [x] Toggle between dropdown and manual key entry

## License

This extension is provided as-is for educational and personal use.

## Credits

- Built with [OpenPGP.js](https://openpgpjs.org/)
- Compatible with PGP/PGP standard (RFC 4880)

## Version History

### v3.7 (Current)
**Public Key Management & Message Type Handling**
- ✨ Separate storage and display for imported public keys
- ✨ Auto-detect key type during import (private vs public)
- ✨ Public key dropdown selectors in Encrypt tab
- ✨ Public key dropdown selectors in Decrypt tab for signature verification
- ✨ Toggle between dropdown and manual key entry
- ✨ Dedicated "Imported Public Keys" section with export/delete actions
- 🐛 Fixed decrypt function to properly handle signed-only messages
- 🐛 Fixed "Session key decryption failed" error for non-encrypted messages
- 🔧 Improved message type detection (encrypted, signed, encrypted+signed)
- 🔧 Enhanced signature verification for all message types

### v3.6
- Previous stable release
- Basic key management
- Encryption, decryption, signing, verification
- Master password protection
- Key backup/restore functionality

### v1.3.4
- Initial MVP release
- Key generation, encryption, decryption
- Signing and verification
- Auto-detection of PGP content
- Sidebar interface
- Debug logging

---

**Made with for secure communications**
