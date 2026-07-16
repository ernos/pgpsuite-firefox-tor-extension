# PGP Suite - v5.65 Release Notes

Added the ability too choose between different encryption algorithms and bitrates when generating new keys. RSA 4096 is selected as default as it is supported by most (if not all) other PGP compatible programs. ECC Curve25519 is the default one in linux and should be faster generally..

## Changes

1. Imported public keys with weird layouts that does not include information about recipient name/email address or comments about them are now editable by the user so that he can write details about the recipient to be able to tell them apart from other unknown ones.

2. Algorithm/bits are now selectable between the following:

- RSA 4096 bits (Recommended, because this is what most websites and all other programs support)
- RSA 3072 bits
- RSA 2048
- ECC Curve25519
- ECC P-256
- ECC P-384
- ECC P-521
