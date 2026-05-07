---
name: Admin typography scale
description: Consistent sizing scale for the admin cockpit — min 12px for interactive/informational, 11px only for eyebrows/badges
type: design
---

## Admin Typography Scale (admin-tokens.css)

| Role | Size | Class/token |
|---|---|---|
| Page title (h1) | 36px | inline in AdminPageHeader |
| Section title (h2) | 14px uppercase | `.admin-section-title` |
| Card title | 15px | `.admin-card-title` |
| Body text | 13px | `.admin-body` |
| Table cell | 13px | `.admin-table-cell` |
| Metadata / sub-line | 12px | `.admin-meta` |
| Eyebrow / label | 11px uppercase mono | `.admin-eyebrow` |
| Badge pill | 11px | AdminBadge component |
| Button sm | 12px, h-28px | AdminActionButton sm |
| Button md | 13px, h-32px | AdminActionButton md |
| Tab pill | 13px | AdminTabsNav |

**Hard rule**: nothing interactive or informational below 12px.
11px floor reserved exclusively for decorative eyebrows and badge pills.

## Density Rules

- Card default padding: 24px
- Card compact (kanban): 16px
- Kanban column width: 270px
- Select trigger min height: 28px
- Table th: px-16 py-12; Table td: px-16 py-10
