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

## Shared-service backend preparation (2026-11-15)

- Public key-entry UI has been replaced with owner-managed shared AI, signed HttpOnly sessions and durable Redis usage limits. No required production environment variables were present at the audit; real inference remains blocked until the owner sets them.
- Encrypted manual cloud backup/transfer, short online dictation and configured support SMTP endpoints have been implemented with controlled tests. Real Redis/Groq/SMTP connectivity and Bengali quality are not established by those tests.
- Cloud backup is optional/manual with a 30-day browser session and 90-day storage retention. It is not a permanent cloud account or automatic sync; retain local/downloaded copies.
- Spoken cloud replies, permanent cloud login, separate family accounts, general PC automation, phone calls/Messenger actions, background phone push and a verified release installer remain incomplete. They must not be advertised as complete.

## Live database verification (2026-11-16)

- The owner’s persistent Upstash Free database is configured in production; credentials remain server-only. A production redeployment applied the settings.
- Real HTTPS tests passed: synthetic backup save/read, stale-version conflict rejection, isolation from another anonymous session, one-time device transfer and replay rejection. Test sessions were separate from the owner’s browser; no personal notes were uploaded. Small synthetic test records expire under the normal retention policy.
- GROQ_API_KEY is still absent from production. Shared chat and online dictation cannot be tested or enabled until the owner enters it. SMTP support sender remains unconfigured.
- npm run test:cloud-backup repeats these live checks with synthetic data. It creates expiring test records; it is not part of the ordinary offline backend test command.

## Live AI verification (2026-11-16)

- Owner saved GROQ_API_KEY; production redeployed successfully. Real Groq model/session verification passed. Shared visitors need no individual key.
- Actual streamed replies passed English arithmetic (43), Banglish input with Bengali-script response, and a synthetic saved-memory preference. Complete response timings were 859, 1133 and 641 ms in this small test; no general latency guarantee.
- The memory check passed explicitly supplied context, not automatic saving. Real microphone transcription, spoken replies and broader Bengali quality remain unverified. SMTP sender remains unconfigured. Earlier missing-key entries describe historical state.

## Website audit and fixes (2026-11-16)

- Browser UI verified: connection consent, real reply, Remember this, a fresh conversation recalling a synthetic preference, and persistence of that note after reload. One clearly labelled synthetic test note remains; personal data was not removed.
- All nine main dashboard sections opened. Public Devices previously requested unavailable local endpoints; it now exposes the working encrypted backup/transfer flow and explains browser-only limits.
- Real Groq transcription returned the exact generated English test sentence. No owner microphone was opened. Actual microphone hardware, noisy speech and Bengali recognition quality still need user-device testing.
- Fixed chat cancellation when leaving the page or changing private-session mode, a missing memory-save error message, duplicate comparison for long notes, the 500-memory limit and microphone acquisition cancellation.
- Listen now supports an identified installed local female English/Bengali device voice, with speech cancellation. Remote browser voices and wrong-language fallbacks are excluded. Automatic reading is opt-in on the public site. Welcome uses the existing female recording. This does not provide universal Bengali TTS or audio-driven lip motion for browser synthesis.
- Voice names/language selection are tested with fixtures; real playback availability depends on the device. See https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices and https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService .
- SMTP sender, permanent cloud accounts, shared family accounts, general remote PC/phone actions, closed-browser push and final Windows release remain incomplete.

## Personalization, speech and desktop verification (2026-11-16)

- Browser personalization now edits name/nickname in the Figma-style dialog, labels reply language separately from the English UI, removes the inapplicable Microsoft switch on the public site, and uses the corrected welcome recording for voice preview. Name/nickname, Bengali reply preference and reduced-motion state persisted through reload on an isolated localhost test origin. Theme and quiet-hour changes also worked there. No owner preferences were changed.
- Saved profile identity is included in consented chat context on web and desktop; private sessions exclude it and saved notes. All 69 backend tests passed.
- Real Bengali transcription of a generic synthesized sentence returned Bengali script with word errors, including after the full-model/Bengali-prompt change. This is not a successful accuracy benchmark. The old developer-bn audio also produced poor/partial recognition. Real microphone and broader Bengali quality still need testing.
- Existing D: Rust/Cargo tools were discovered and the false PATH-only prerequisite result fixed. Native compilation succeeded. NSIS could not embed the large GGUF model; setup now copies an external JYRA-offline-model.gguf located beside the installer. A 0.6B model failed a simple arithmetic check and was rejected for this preview; 1.7B answered the check correctly. This is not a broad quality evaluation.
- Actual installer execution completed in a new isolated D: preview directory, preserving existing app data. Installed packaged services passed isolated SQLite/profile recall, optional Microsoft Bengali speech generation, offline model loading and the basic arithmetic reply. No credentials or user databases are shipped.
- Five Gmail support settings are saved in Vercel; ZYRA_SUPPORT_SMTP_PASSWORD is still required. No real support email has been sent or delivered.
- Tailscale reported the PC Running but zero online Android peers at this check. ADB inventory was unavailable. Physical Android calls/Messenger, microphone behavior and continuous observation are not verified or implemented as general remote actions.

## Support email activated (2026-11-16)

- Owner saved ZYRA_SUPPORT_SMTP_PASSWORD as a production Secret and the site was redeployed. Readiness now returns configured:true.
- With explicit owner approval, one generic connection-test email was submitted through the live support API to the configured owner Gmail address. HTTP 201 and accepted-by-mail-server were returned. No personal chat or memory was included.
- SMTP acceptance is verified; recipient inbox placement was not inspected and is not guaranteed by this result. Earlier missing-password statements are historical.
