# Branding Chiller V1.4.0 — Assignment & Backend Rules

## Scope

This release completes the backend side of the PIC/Stockpoint revision introduced by the V1.3 frontend.

### Existing PIC assignment management
Admin and Super Admin can open **Manajemen User → Stockpoint** for a PIC and update the PIC's active Stockpoints.

Rules:
- PIC stays on exactly one Branch.
- A PIC may have multiple active Stockpoints.
- One Stockpoint may only have one active PIC.
- An assignment can be removed only when that PIC has never created a submission on that Stockpoint.
- If work already exists, the UI marks the assignment as locked and the database rejects removal too.
- Changes are audited.

## Code rules
For a Stockpoint code such as `5219/129`:
- Kode Toko: `5219/129/<3-4 digits>`
- ID Salesman: `5219/129/S<1-4 digits>`

The first two segments are validated against the selected Stockpoint at the database layer.

Historical salesman codes are not rewritten. The table constraint accepts the legacy format for historical rows while the create/update RPCs enforce the new `S` format for new edits.

## Chiller rule
`has_chiller = false` is normalized server-side to:
- `branding_status = not_brandable`
- reason = `Tidak ada chiller`

## Location rule
Location is optional. New submissions may use:
- browser geolocation,
- manual Google Maps URL, or
- no location (`location_source = not_provided`).

## Deploy
Run only migration `024_pic_assignment_and_salesman_rules.sql` after migration 023.
Use `024_VERIFY.sql` afterwards. No Edge Function deployment is required for this release.
