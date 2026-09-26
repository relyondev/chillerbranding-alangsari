# Integrations

## Google Drive

Drive is private/Restricted. The application does not depend on public file permissions.

Hierarchy:

```text
ROOT
└── Branch
    └── Stockpoint
        └── ID PIC - Nama PIC
            └── Nama Toko
                └── photo files
```

Folder creation is idempotent per submission and protected by Apps Script locking to avoid duplicate folders during parallel uploads.

## Google Spreadsheet

One Spreadsheet contains Branch tabs:
- BOGOR
- SEMARANG
- YOGYAKARTA
- SURABAYA
- MALANG

Rows are upserted by hidden `_SYSTEM_SUBMISSION_ID`.

Location column uses:
1. manual `google_maps_url`, when present; otherwise
2. coordinate URL generated from latitude/longitude.

## Apps Script

Required Script Properties:
- `DRIVE_ROOT_ID`
- `SPREADSHEET_ID`
- `HMAC_SECRET`

Deployment:
- Execute as: Me
- Access: Anyone
- Requests remain authenticated by HMAC envelope.

## Supabase Edge Secrets

- `APPS_SCRIPT_ENDPOINT`
- `APPS_SCRIPT_HMAC_SECRET`
- `CRON_SECRET`

Never expose these as frontend `PUBLIC_*` variables.
