# PGP Suite - v5.4 Release Notes

After last big patch where we introduced android compatibility somehow a bug where the dropdown list of public keys
in the Encrypt tab would not populate. It was a naming issue. When working on that bug I came up with a better idea of
handling Private/Public keypairs and Public keys.

## Changes

- When you generate a keypair it will now automatically add that keys public key to the list of public keys, however it will be clearly separated and shown that it is one of your private keys. This is made like this so that you can encrypt for example files which only you yourself can decrypt with your private key. Sometimes you want it to stay local.
- It will clearly state that it is one of your keys and not one of your recipients. You can also see this on the fingerprint, and the emailaddress as well as the blue colored border around it and the tag "My Public Key"
- All public key drop down lists will include all of your public keys automatically - They are displayet at the end of the list after a separator for clarity
- Fixed a bug which made the "Clear" button on the Verify tag not usuable.