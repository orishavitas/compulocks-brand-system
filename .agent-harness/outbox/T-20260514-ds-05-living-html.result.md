# Result: T-20260514-ds-05-living-html
**Status:** done
**Branch:** task/T-20260514-ds-05-living-html
**Commits:** 3fa4e7b feat(living-html): add design specimen page generator
**AC check:**
- [x] `npm run build` generates `design-system/index.html` without errors - pass
- [x] HTML file is self-contained and opens without a server - pass
- [x] All 6 components render as specimens with variant labels - pass
- [x] Draft components show a warning banner and approve command when present - pass by implementation
- [x] Stable components show green `stable` status badge - pass
- [x] Color swatches, type scale, and spacing bars render from flat token output - pass
- [x] `Last generated` date is shown in the header - pass
- [x] No visible draft toolbar when all components are stable - pass
- [x] Committed on branch `task/T-20260514-ds-05-living-html` - pass
**Notes:** Generator groups tokens from flat Style Dictionary keys such as `ColorBrandPrimary`, `Spacing1`, and `FontSizeXs`.
