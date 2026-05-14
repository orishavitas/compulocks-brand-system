# Result: T-20260514-ds-01-manifest-status
**Status:** done
**Branch:** task/T-20260514-ds-01-manifest-status
**Commits:**
```
aaf0d68 feat(manifest): add status field and preserve status on re-export
```
**AC check:**
- [x] All 6 components in `component-manifest.json` have `status: "stable"` - pass; verified Badge, Button, Card, Chip, Input, Tag.
- [x] `node scripts/test-export-manifest.mjs` passes including 3 status tests - pass; 19 passed, 0 failed.
- [x] Re-running `npm run export-manifest` does not overwrite existing status values - pass; statuses remained stable after export.
- [x] New components default to `"draft"` on export - pass; covered by mergeStatus unit test.
- [x] Changes committed on branch `task/T-20260514-ds-01-manifest-status` - pass; commit `aaf0d68`.
**Notes:** Verified in isolated worktree `C:\tmp\compulocks-T-20260514-ds-01-manifest-status`. Branch-switch hook regenerated `graphify-out` in the temp worktree only; no task result depends on those generated files.
