# Apply V1.6.9 Hotfix

Overlay the contents of this folder onto the repository root, preserving paths.

Then run:

```powershell
npm install
npm run build
```

QA priorities:
1. PDF export: full Branch name, Branding Status label, Update/Export timestamps, DONE and REOPEN tables.
2. Dashboard: multicolor Visit per Branch, Top 10 PIC, Branch ranking.
3. PIC Pekerjaan Selesai: read-only Detail button/modal.
4. PIC sidebar: Pekerjaan Belum Selesai.
5. Submit a PIC job and verify Total input hari ini increments correctly for that PIC.

No SQL migration and no Edge Function deploy are required for V1.6.9.
