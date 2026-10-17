# Repository Maintenance

## Keep out of Git

- `.env` and local secret files
- `.git/` copies inside exported ZIPs
- `node_modules/`
- `dist/`
- `.astro/`
- temporary ZIP/package artifacts

## Root files intentionally retained

- `README.md`
- `CHANGELOG.md`
- `AGENTS.md`
- `CLAUDE.md`

`AGENTS.md` and `CLAUDE.md` remain at root because coding agents conventionally discover them there.

## Historical docs

Old apply notes, one-off fixes, and release-specific notes are archived under `docs/archive/`. They are retained for traceability but are not part of the current operating instructions.
