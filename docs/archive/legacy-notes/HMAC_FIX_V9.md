# HMAC Fix v9

Root cause:
- Apps Script source used `"branding-ops\\n"` which signs the literal characters `\` and `n`.
- Edge Function signs `branding-ops\n` using a real newline.
- The signatures can never match in that state.

Correct Apps Script source:

```javascript
const expected = hex_(
  Utilities.computeHmacSha256Signature(
    "branding-ops\n" + envelope.payload,
    secret
  )
);
```

Correct Edge source:

```ts
new TextEncoder().encode(`branding-ops\n${signedPayload}`)
```

After replacing Code.gs:
1. Save.
2. Deploy > Manage deployments > Edit.
3. Select New version.
4. Deploy.
5. Keep Execute as Me / Who has access Anyone.

No secret rotation is required if both sides already use the same HMAC secret.
No database migration is required.
No Edge Function redeploy is required for this specific fix.
