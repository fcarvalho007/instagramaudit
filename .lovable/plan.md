### Scope
Add two visible columns to the `/admin/apify-lab` results table and CSV export: `resultsLimit` and `onlyPostsNewerThan`.

### Context
The endpoint already stores these values inside `input_params` (returned via `.select("*")`). No backend or endpoint changes are needed.

### Changes
**File: `src/routes/admin.apify-lab.tsx`**

1. Update `LabRun` interface to include `input_params?: Record<string, unknown> | null`.

2. Add helper to safely extract `resultsLimit` and `onlyPostsNewerThan` from `input_params`.

3. Table headers: insert two `<th>` after "Janela" column:
   - `resultsLimit`
   - `onlyPostsNewerThan`

4. Table rows: render extracted values in matching `<td>` cells.

5. CSV export: append `resultsLimit` and `onlyPostsNewerThan` to the `header` array and to each row's data array.

6. Update `colSpan={14}` to `colSpan={16}` for the empty-state row.

### Constraints respected
- No endpoint logic changes.
- No cap changes.
- No Apify calls.
- No production analysis impact.
- Only frontend table readability and CSV export improved.