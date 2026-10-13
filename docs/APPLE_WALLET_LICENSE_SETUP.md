# Apple Wallet Diving License Setup

## Implemented flow

1. The signed-in user selects an active diving license in the app.
2. `POST /api/wallet/apple-pass` verifies ownership and license status.
3. The API returns a five-minute, license-scoped download URL.
4. `GET /api/wallet/apple-pass/:licenseId` creates a signed `.pkpass` file.
5. iOS opens the pass and presents the system Add to Apple Wallet sheet.

The pass includes the holder, agency, certification level, license number, discipline, issue and expiration dates, and a QR verification URL. It is a Divergram digital card and does not claim to replace an issuing agency's official credential.

## Apple Developer configuration

Create a Pass Type ID for `pass.com.divergram.app.ios.license`, then create and download a Pass Type ID certificate for that identifier. Keep the certificate and private key outside the repository.

The Apple Worldwide Developer Relations intermediate certificate is also required. Convert the certificates to PEM files on a secure machine:

```bash
openssl x509 -inform DER -in pass.cer -out pass-cert.pem
openssl pkcs12 -in pass-certificate.p12 -nocerts -out pass-key-encrypted.pem
openssl pkey -in pass-key-encrypted.pem -out pass-key.pem
openssl x509 -inform DER -in AppleWWDRCAG4.cer -out AppleWWDRCAG4.pem
```

Restrict the private key file before copying it to the API server:

```bash
chmod 600 pass-key.pem
```

## API environment

```dotenv
APPLE_WALLET_PASS_TYPE_ID=pass.com.divergram.app.ios.license
APPLE_WALLET_TEAM_ID=6G5RCDLQLG
APPLE_WALLET_WWDR_CERT_PATH=/home/divergram/private/apple-wallet/AppleWWDRCAG4.pem
APPLE_WALLET_SIGNER_CERT_PATH=/home/divergram/private/apple-wallet/pass-cert.pem
APPLE_WALLET_SIGNER_KEY_PATH=/home/divergram/private/apple-wallet/pass-key.pem
APPLE_WALLET_SIGNER_KEY_PASSPHRASE=
```

Do not commit certificates, private keys, or passphrases. After deployment, confirm readiness while authenticated with `GET /api/wallet/apple-pass/status`, then download a pass on a physical iPhone. The iOS Simulator is not sufficient for final Wallet verification.
