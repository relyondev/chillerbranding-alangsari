# Branding Chiller V1.5.1 — Photo Watermark & Single-attempt GPS Fallback

## Included baseline

This package already includes every V1.5.0 change. V1.5.0 does not need to be deployed first.

- Manual two-digit PIC number with automatic Branch prefix and duplicate detection.
- One-section reordered PIC input form.
- Kode Toko suffix 2–6 digits.
- Frontend uppercase conversion for Nama Toko and Nama Pemilik.
- Existing duplicate engine and branding logic preserved.
- Frontend photo resize/compression.
- Migration 025 and `admin-create-user` Edge Function revision are included.

## Photo watermark

Every newly uploaded photo is processed in the browser before it is sent to the existing photo upload Edge Function. Processing order:

1. Read/orient image.
2. Resize proportionally to max 1600 px on the longest edge (no upscaling).
3. Draw watermark at bottom-left.
4. Encode JPEG starting at 82% quality and reduce quality when needed toward ~1 MB.
5. Upload only the processed final image.

Watermark content:

- Hanzi Management logo (fallback: `HANZ MANAGEMENT`).
- `04 OCT 2026 · 16:42:18 WIB` style timestamp.
- Photo type, e.g. `FOTO CHILLER BEFORE`.
- `LAT -6.123456 · LNG 106.123456`.
- `PIC MLG-02 · BUDI SANTOSO`.
- `SP 5219/129 · AMPEL GADING`.

When manual Google Maps is used and browser coordinates are unavailable, the coordinate line is `LAT - · LNG -`.

Existing photos are not rewritten; the watermark applies to new/replacement uploads after this version is deployed.

## GPS / Google Maps fallback

- Browser geolocation is attempted once only.
- Success: coordinates + accuracy are stored using the existing flow, and the embedded Google Maps preview remains.
- Failure or unsupported browser: the GPS button becomes inactive and the manual Google Maps input appears immediately.
- Manual URL validation only accepts recognized Google Maps hosts.
- Placeholder: `https://maps.app.goo.gl/xxxxxxxx`.

## Deployment order

Because V1.5.0 was not previously deployed:

1. Apply `025_manual_pic_id_store_code_range.sql`.
2. Run `025_VERIFY.sql`.
3. Redeploy `admin-create-user`.
4. Deploy this V1.5.1 frontend.
5. QA PIC creation, form rules, GPS success/failure, manual Google Maps validation, and photo watermark on Android/iPhone.

No migration 026 is required.
