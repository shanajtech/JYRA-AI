# JYRA AI

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

`vercel.json` builds the Vite frontend with `VITE_PUBLIC_PREVIEW=true`. The production website explicitly labels itself as a preview. Companion entry can open the browser-only dashboard; local AI, SQLite accounts, online speech service and cloud synchronization are not deployed by this configuration. Browser edits are not a cloud account or a backend connection. Local Windows development keeps its existing backend behavior.

Deploy with `npx vercel --prod` after signing in. `.vercelignore` excludes credentials, personal data, local runtimes and dependencies from the upload.
