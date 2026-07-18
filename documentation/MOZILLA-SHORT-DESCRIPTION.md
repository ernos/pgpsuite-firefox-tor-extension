# PGP Suite for Firefox and Tor Browser

PGP Suite brings complete OpenPGP encryption directly into Firefox/Tor on any platform. Android works as well — no command line, no external software, no accounts required, Tor compatible.

Whether you want to send a private message, share an encrypted file, or simply verify that a message hasn't been tampered with, PGP Suite handles it all from a clean sidebar that opens in seconds.

## What you can do

- 🔐 **Encrypt & decrypt messages** — Paste any text, select a recipient's public key, and get an armored PGP message ready to send anywhere: email, forums, chat, anywhere.
- 📁 **Encrypt & decrypt files** — Select any file from your computer, encrypt it with a recipient's public key, and download the result. The recipient decrypts it with their private key and gets the original file back, name and all.
- ✍️ **Sign & verify** — Sign messages with your private key so recipients can prove the message is authentically yours. Verify incoming signed messages from others.
- 🗝️ **Key management** — Generate RSA key pairs, import and export keys, and store multiple key pairs for different identities. Imported public keys are saved for quick reuse. You can also add a custom name or note to any imported public key that lacks identifying information, so you can always tell your contacts apart.
- 🔑 **Choose your encryption algorithm** — When generating a new key pair, pick the algorithm and strength that suits you: RSA 4096 (recommended for maximum compatibility with other PGP tools), RSA 3072, RSA 2048, or one of the modern ECC options (Curve25519, P-256, P-384, P-521).
- 🔒 **Persistent Vault** — Store passwords, usernames, and private notes securely inside the extension. Each vault entry is encrypted with your own PGP key and saved to the browser's local storage, so it survives browser restarts. You need your passphrase to unlock, edit, or delete an entry — nothing is ever saved in plain text.
- **Master password protection** — Optionally encrypt all stored private keys behind a master password. Keys are locked at browser startup and unlocked on demand.

## Who is this for?

Anyone who wants to send private messages without relying on a third-party service
People who need to share sensitive files securely by email or cloud storage
Windows users tired of outdated tools like GPG4USB or Kleopatra
Developers and sysadmins managing PGP keys without leaving the browser
Privacy-conscious users who want a portable PGP tool on a USB stick or live OS
Tor Browser users who regularly work with PGP-encrypted messages

## Privacy by design

- ✅ No servers — everything runs locally in your browser
- ✅ No telemetry, no analytics, no tracking of any kind
- ✅ Minimal permissions: only storage (to save your keys) and downloads (to save files)
- ✅ Open source — the full code is readable, no minification or obfuscation
- ✅ Built on OpenPGP.js, a widely audited cryptography library used across the industry
- ✅ Compatible with GnuPG, Kleopatra, Mailvelope, ProtonMail, and any other OpenPGP-standard tool

No installation hassle
Unlike desktop PGP tools, PGP Suite requires zero setup. There is nothing to install outside of Firefox. Keys are stored in the browser's local storage and travel with your Firefox profile — or you can export a backup and take them anywhere.

## ⚠️ Tor Browser users: one extra step required

Tor Browser treats every website as a private window. Because of this, extensions are not allowed to run by default. After installing PGP Suite, you need to **enable the "Allow in Private Windows" permission** for the extension — otherwise it will appear installed but won't work. The extension does not have access to information on any website you visit regardless. Only permission to store data in local storage.

How to do it: Either just check the checkbox while installing the addon or if already installed: go to **about:addons** → find PGP Suite → open its detail page → under **Permissions**, tick **Run in Private Windows**. You only need to do this once.

Contributions and source code:
<https://www.yourdev.net/pgpsuite>
<https://github.com/ernos/pgpsuite-firefox-tor-extension>
