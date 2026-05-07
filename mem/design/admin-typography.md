---
name: Admin typography scale
description: Admin v2 typography hierarchy, density rules, utility classes
type: design
---

## Admin Typography Scale (v2 — May 2026)

| Role | Size | Font | Weight | Class | Notes |
|------|------|------|--------|-------|-------|
| Page title (h1) | 36px | Inter | 500 | inline | AdminPageHeader |
| Panel heading | 20px | Inter | 500 | `.admin-panel-title` | Sheets, modals, drawers |
| Section title (h2) | 15px | Inter | 500 | `.admin-section-title` | Uppercase, 0.05em tracking |
| Card title | 15px | Inter | 500 | `.admin-card-title` | -0.01em tracking |
| Body text | 13px | Inter | 400 | `.admin-body` | |
| Table cell | 13px | Inter | 400 | `.admin-table-cell` | |
| Metadata | 12px | Inter | 400 | `.admin-meta` | |
| Badge | 12px | Inter | 500 | AdminBadge component | Was 11px/400 |
| Code / mono | 12px | JBM | 400 | `.admin-code` | |
| Table header | 12px | Inter | 500 | `.admin-table-header` | Uppercase |
| Eyebrow | 11px | JBM | 400 | `.admin-eyebrow` | Decorative only |

## Hard Rules

- Nothing interactive or informational below 12px.
- 11px reserved ONLY for decorative eyebrows.
- Use `.admin-code` instead of raw `font-mono` in admin components.
- No hardcoded hex colors — use admin tokens from admin-tokens.css.
- DetailRow in sheets uses py-2.5 minimum for premium density.
