# JYRA AI

[Live website](https://jyra-ai.vercel.app) · [GitHub repository](https://github.com/shanajtech/JYRA-AI)

The live site is a website/dashboard preview; local AI and account backend are not connected there.

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

## Vercel website preview

`vercel.json` builds the Vite frontend with `VITE_PUBLIC_PREVIEW=true`. The production website explicitly labels itself as a preview. Companion entry can open the browser-only dashboard; local AI, SQLite accounts, online speech service and cloud synchronization are not deployed by this configuration. Online text chat now has a separate Groq connection; see below. Browser edits are not a cloud account or a backend connection. Local Windows development keeps its existing backend behavior.

Deploy with `npx vercel --prod` after signing in. `.vercelignore` excludes credentials, personal data, local runtimes and dependencies from the upload.

## Online text AI (Groq free-plan connection)

The website now includes a stateless Vercel Function at `/api/cloud/chat`. Open Conversation → Connect online AI, create a key in your own Groq account, and enter it in the masked connection dialog. Do not paste a key into chat. Verify that the Groq account remains on its Free plan; model availability and provider limits may change. No shared paid key or new subscription is provisioned by this project.

The key is held only in JavaScript memory until disconnect/reload, sent to JYRA's HTTPS function as a bearer credential, and forwarded only to Groq's official endpoint. It is not stored in localStorage, SQLite or application logs. The function validates origin, payload, roles and memories, rejects redirects, enforces a bounded per-instance limiter, supports cancellation, and returns streamed text. Provider rate limits still apply across all instances. Production protections should be revisited before a general public launch.

After explicit consent, the current conversation (up to 12 messages) and saved memory (up to 20 entries) are sent to Groq. Private sessions omit saved memories and do not save new history. Memory/history in this deployment are browser-local, not cloud-synced accounts. Windows local mode retains SQLite storage and local inference. Cloud voice, PC automation and phone pairing are not enabled by the Groq connection.

`npm run test:backend` includes cloud handler tests with a controlled provider fixture. A real Groq key is still needed for a genuine end-to-end provider test; passing fixture tests does not establish Bengali response quality in the owner's account.
