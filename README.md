# JYRA AI

[Live website](https://jyra-ai.vercel.app) · [GitHub repository](https://github.com/shanajtech/JYRA-AI)

The live site is a website/dashboard preview with deployable shared-cloud services. Online features stay unavailable until the owner supplies server credentials. End users do not enter AI keys.

Windows-first React + TypeScript desktop companion prototype with a Tauri v2 scaffold and a local Node.js/SQLite backend.

**Work in progress.** The owner reports that memory recall and Bengali conversation/voice still do not work reliably in their browser. Passing automated tests does not mean those user-facing issues are resolved. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Start locally

Requires Node.js 24+, npm, and Windows for the bundled local speech integration.

```sh
npm ci
npm run setup:ai
npm run dev:all
```

Open http://127.0.0.1:1430/ . The local backend listens on port 4310. `setup:ai` downloads the local inference runtime and a roughly 2.5 GB model; these binaries are not stored in this repository.

```sh
npm run build
npm run test:backend
```

## Current code

- Figma-based website and companion screens, responsive chat layout, one JYRA portrait.
- Local accounts, account-scoped SQLite storage, recovery, tasks, alarms, saved notes and streaming local AI replies.
- Experimental Banglish handling, explicit “Remember this” action, saved-note context, and Bengali/English language preferences.
- Optional Microsoft online voice, enabled per account with disclosure. The text being read is sent to Microsoft. Its Python runtime and dependencies must be prepared separately; they are not included in this source repository.
- Optional Gmail and private mobile portal integrations require separate configuration.
- Tauri scaffold and Windows build/setup scripts; a production installer is not claimed ready.

## Data and credentials

Copy `.env.example` to `.env` only if required. Keep credentials on your own PC. `.env`, local databases, saved photos/memory, runtime downloads, model files, build output and dependencies are ignored by Git.

`public/` contains application artwork, generic voice clips and frontend model assets. `server/fixtures/` contains explicitly test-only certificates/keys for isolated HTTPS tests; never use them for a real server.

## Limitations

This is not a production-ready AI assistant. Sample Figma task/briefing screens do not execute real computer automation. Separate family-account sharing, background phone push delivery and production deployment remain unfinished. A support request saved locally is not an email delivery receipt.

## Shared cloud backend on Vercel

Vercel builds the web frontend with VITE_PUBLIC_PREVIEW=true and deploys the functions under api/cloud/. Local Windows mode keeps its existing SQLite accounts, local inference and private mobile portal. Cloud users never provide an AI key. The previous BYOK handler is retained only for explicitly enabled private experiments (ZYRA_ALLOW_BYOK=true); the public interface does not expose a key form.

Required server-only production settings:

- GROQ_API_KEY: the owner's Groq key. Keep the intended provider plan and spend limits; this project does not create or upgrade a paid plan.
- UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN: the owner's persistent Upstash Redis database, including TLS.
- ZYRA_SESSION_SECRET: at least 43 characters of high-entropy random text. Keep this unchanged: it signs sessions and derives cloud-backup encryption keys. Rotation invalidates sessions and makes old encrypted backups unreadable.

Run npm run setup:cloud from this repository to enter the three provider values using masked prompts. The script sends values to Vercel through stdin, not command-line arguments or files. It generates the signing secret only if one is not already present. Review the provider accounts and their terms yourself. The script provisions no external account/database and creates no subscription.

Optional ZYRA_DAILY_LIMIT defaults to 20 chat requests per browser, with network and overall service limits. ZYRA_GLOBAL_DAILY_LIMIT defaults to 200 requests per day. Counters are atomic Redis operations shared across function instances; storage failure blocks shared inference. Limits reset at midnight in Bangladesh. These are application request limits, not a guarantee of zero provider cost. Set provider-side spend limits too.

For separate experimental app variants, set a distinct ZYRA_APP_ID (lowercase letters, digits and hyphens, at most 32 characters). Each namespace has separate backups and usage counters. Provider-account limits still apply across all variants. These are application variants using existing AI models, not newly trained foundation models.

### Functions

- /api/cloud/chat: availability, protected anonymous session, streamed shared Groq chat, stop/cancellation, server-only credentials and daily/network/global limits. Explicit consent covers current chat and selected memories.
- /api/cloud/transcribe: optional short microphone recordings sent to Groq Whisper after the user connects and presses Record. Accepts validated mono 16 kHz PCM WAV, at most 20 seconds. English, Bengali or automatic language detection. No persistent audio files are written.
- /api/cloud/state: optional encrypted manual backup of notes and conversation history, compare-and-swap versions, reviewed restore and one-time device codes expiring after 10 minutes. Backups expire 90 days after upload; sessions expire after 30 days. Keep a downloaded copy and do not treat this as a permanent signed-in cloud account or automatic sync. Photos and service credentials are excluded.
- /api/cloud/support: validated support text to a fixed configured owner recipient over TLS SMTP. Returns success only if that mail server accepts it; otherwise it reports failure. No fake delivery receipt.

Support additionally requires ZYRA_SUPPORT_TO, ZYRA_SUPPORT_FROM, ZYRA_SUPPORT_SMTP_HOST, ZYRA_SUPPORT_SMTP_USER and ZYRA_SUPPORT_SMTP_PASSWORD. Port may be 465 or 587. These are server-only settings. No email is sent by merely building/deploying the project.

### Browser-only features

Saved alarms and task reminders execute while the dashboard remains open and the computer stays awake. Enable alarm sound to hear chimes. Stop, snooze, repeat caps, weekdays and quiet hours are supported. Browser timers may be delayed or suspended; closed-browser delivery and phone push are not implemented. Memory JSON download/reviewed restore remains available without any cloud account.

### Validation and remaining release work

npm run test:backend includes controlled provider/Redis/SMTP fixtures. These tests establish request handling and security behavior; they do not establish actual provider connectivity or Bengali quality in the owner's account. Configure the server values, then test real chat, dictation, backup transfer and support delivery before release.

Spoken cloud replies, permanent cloud login/registration, separate family accounts, general autonomous PC control, phone calls/Messenger actions, background phone push and a verified production Windows installer remain unfinished. The app must not claim those features are operational. See KNOWN_ISSUES.md.

## Live backup smoke test

Run `npm run test:cloud-backup` only when you intend to test the deployed database. It uses isolated anonymous sessions and synthetic notes, checks persistence/isolation/version conflicts/device-code replay, and prints no credentials or session values. Small test records remain until their retention expiry. Set ZYRA_TEST_SITE_URL to another HTTPS site origin to check an experimental deployment. The owner’s browser notes/cookies are not accessed.
