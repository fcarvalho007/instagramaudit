Restore the Qualification step (step 2) that was accidentally removed from the onboarding modal.

Changes:
1. Add `kind: "qualification"` back to the `View` type.
2. Add missing imports: `Briefcase`, `LineChart`, `Scale`, `Star`, `TrendingUp`, `User`, and `GridSelectField`.
3. Restore `QualificationStepBody` component with ownership + goal grid selects.
4. Wire it into the DialogContent render branch.
5. Update `handleEntrySubmit` to route new emails to `qualification` instead of `final`.
6. Update `handleClose` tracking to include step 1 (qualification).
7. No copy changes — reuse existing `gate.json` keys.
8. No changes to checkout flow, unlock-flow schema, or API routes.

Files: `src/components/onboarding/onboarding-modal.tsx` only.