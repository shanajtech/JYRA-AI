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
## Online backend progress (2026-11-15)

- Added a deployable Vercel text-chat function using the user's Groq key, with masked opt-in connection, streamed responses and explicit saved-memory context.
- The live website still needs the owner's real key to verify genuine provider replies and Bengali quality. No Groq account, billing plan or API key was created automatically.
- Cloud memory/history remain in the browser. Cross-device durable accounts, cloud voice and background jobs remain incomplete.
- Cloud integration tests use a controlled provider fixture. The owner's reported memory/Bengali issues are not marked resolved solely from those tests.
## Browser service progress (2026-11-15)

- Added open-browser alarm/reminder execution with durable browser run history, stop, snooze, repeat caps and quiet hours. This is not closed-browser/background phone delivery.
- Added memory-only JSON export and reviewed, non-replacing restore. A controlled browser test verified an imported test note remained after reload on an isolated localhost test origin.
- No external AI key, cloud database credentials, SMTP sender or new vendor account was provisioned. Real Groq responses/Bengali quality, cloud account sync, online voice and general PC control remain pending.
