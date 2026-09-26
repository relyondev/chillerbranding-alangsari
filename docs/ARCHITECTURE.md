# Architecture

## Overview

The application follows a browser → Supabase → external integration architecture.

```text
Browser / Vercel
  ├─ Supabase Auth
  ├─ PostgreSQL + RLS + RPC
  └─ Supabase Edge Functions
        └─ signed HMAC request
             └─ Google Apps Script
                  ├─ Private Google Drive
                  └─ Google Spreadsheet
```

## Source of Truth

PostgreSQL in Supabase is the business source of truth. Google Drive and Google Spreadsheet are external integration targets. A transient integration failure must not corrupt the submission workflow.

## Frontend

- Astro renders application pages.
- React islands provide interactive flows.
- Browser uses only the Supabase public URL and anon key.
- Role-aware navigation is derived from the authenticated profile.

## Backend

- Database writes use RPC functions for protected workflows.
- RLS limits direct reads/writes.
- Edge Functions perform privileged integration operations.
- Service-role credentials never reach the browser.

## Google Integration

- Apps Script is called with a signed payload.
- HMAC signing uses the `branding-ops\n` prefix plus payload.
- Drive hierarchy is created server-side.
- Photo folder creation is idempotent per submission.
- Drive remains Restricted/private.
