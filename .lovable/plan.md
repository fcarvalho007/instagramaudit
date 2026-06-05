Apply subtle premium visual polish below the hero fold without adding dependencies or changing functionality.

1. ReportPreviewBand card hover
   - Wrap the `.dark-preview-mask` card in a div that adds `transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(56,189,248,0.12)]`.
   - This avoids the `overflow-hidden` on the card clipping the shadow.
   - No new libraries; pure Tailwind utilities.

2. Section rhythm adjustments
   - Support sections (less height): StatsBand, ManualVsToolBand, HowItWorksBand, TransparencyBand padding `py-10 sm:py-12` → `py-8 sm:py-10`.
   - Product sections (more breathing room):
     - ReportPreviewBand: `pt-14 pb-0 sm:pt-16` → `pt-16 pb-0 sm:pt-20`; subhighlights `pt-6 pb-10` → `pt-8 pb-12 sm:pb-14`.
     - PricingTeaserBand: `py-14 sm:py-16` → `py-16 sm:py-20`.
     - FinalCtaBand: `py-16 sm:py-20` → `py-20 sm:py-24`.
   - Mobile stays compact since support section mobile padding drops from `py-10` (40px) to `py-8` (32px).

3. Optional BlurReveal
   - Skipped: `.hero-blur-reveal` CSS exists but there is no reusable `BlurReveal` component, and adding one would introduce complexity. The existing `Reveal` wrapper already provides scroll-driven fade-in.

4. Validation
   - `bunx tsc --noEmit`.
   - Preview check for no layout shift or horizontal overflow.

Scope confirmation
   - Hero, copy, pricing values, checkout, EuPago, onboarding, report generation, backend, admin untouched.
   - No new packages.