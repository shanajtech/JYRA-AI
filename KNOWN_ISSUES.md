# Known issues and incomplete features

## Reported by the owner (2026-11-15)

- Memory does not work reliably in their actual use, despite isolated saved-note/context tests passing.
- Bengali/Banglish conversation and Bengali voice do not work reliably in their actual browser/account.
- These issues must be reproduced in the owner's real browser/account and fixed; do not mark them resolved based only on unit tests or a sample demo.

## Integration gaps

- The optional online voice Python runtime/dependencies are excluded from Git and require a reproducible setup step on a fresh machine.
- Windows speech, local AI models and hardware permissions depend on the machine/environment.
- Separate shared family accounts, general autonomous computer-use execution and background phone push delivery are not implemented.
- Support delivery needs a dedicated configured SMTP sender; local persistence alone does not send email.
- Login/registration design and the remaining Figma reference screens require follow-up.

The repository is a snapshot for further development, not a finished release.
