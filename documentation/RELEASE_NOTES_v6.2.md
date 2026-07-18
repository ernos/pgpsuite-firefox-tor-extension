# PGP Suite - v6.2 Release Notes

## Changes

### Clear and Copy To Clipboard Buttons Added to Input Fields

All major input areas now have a dedicated **Copy To Clipboard** button and a **Clear** button, making it faster to copy or reset fields without manually selecting text.

The following tabs have been updated:

- **Keys tab — Import/Export**: A Copy To Clipboard button and a Clear button now appear below the _Import Private or Public Key_ textarea. The Clear button also resets the passphrase field.
- **Encrypt tab**: A Copy To Clipboard button and a Clear button now appear below the _Message to Encrypt_ textarea.
- **Decrypt tab**: A Copy To Clipboard button and a Clear button now appear below the _Message to Decrypt_ textarea.
- **Sign tab**: A Copy To Clipboard button and a Clear button now appear below the _Message to Sign_ textarea.
- **Verify tab**: The existing Clear button now also clears the _Message to Verify_ input in addition to resetting the verification output.

### Copy To Clipboard Buttons Added to Output Fields

- **Encrypt tab**: A Copy To Clipboard button now appears before the Clear button on the _Encrypted Message_ output area.
- **Decrypt tab**: A Copy To Clipboard button now appears before the Clear button on the _Decrypted Message_ output area.

### Non-Invasive Copy Feedback

Copy To Clipboard buttons no longer show an alert dialog. Instead, the button briefly turns green and displays **✓ Copied!** for 2 seconds before reverting to its original label.
