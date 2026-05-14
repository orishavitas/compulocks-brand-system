# Result: T-20260514-ds-04-approve-cli
**Status:** done
**Branch:** task/T-20260514-ds-04-approve-cli
**Commits:** c4e0ec0 feat(approve): add approval CLI and design management scripts
**AC check:**
- [x] Authorized approval with `COMPULOCKS_CONTRIBUTOR=ori@compulocks.com` approves a draft component, triggers build, and logs audit - pass
- [x] Unauthorized contributor exits 1 and logs rejection to `design-audit.log` - pass
- [x] Approving an already-stable component is a no-op - pass
- [x] `npm run build` runs `sync-vault.mjs` and tolerates missing `generate-living-html.mjs` before T-05 - pass
- [x] `npm run design:status` prints all 6 components with status - pass
- [x] `npm run design:requests` prints `No open requests.` when the request log is empty - pass
- [x] Committed on branch `task/T-20260514-ds-04-approve-cli` - pass
**Notes:** Build hook checks for the living HTML generator before executing it to avoid noisy missing-module stacks before T-05 exists.
