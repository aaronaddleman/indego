# Design System Strategy: The Kinetic Sanctuary

## 1. Overview & Creative North Star
This design system is built upon the Creative North Star of **"The Kinetic Sanctuary."** Most habit trackers feel like clinical spreadsheets or rigid checklists; this system rejects that friction. It treats the user’s personal growth as a living, breathing landscape. 

By utilizing **intentional asymmetry** and **tonal layering**, we move away from the "grid of boxes" look. Elements should feel like they are floating in a calm, organized space. We use high-contrast typography scales (e.g., a `display-lg` stat next to a `label-sm` caption) to create an editorial feel that celebrates progress as art, rather than just data.

## 2. Colors & Surface Architecture
The palette is rooted in "Productivity Biophilia"—using greens to represent growth, blues for mental clarity, and oranges for metabolic energy.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Layout boundaries must be achieved through background shifts. For example, a `surface-container-low` (#eef6ee) card should sit on a `surface` (#f4fbf4) background to create a soft, "molded" look.

### Surface Hierarchy & Nesting
Depth is created by nesting containers. Instead of a flat grid, treat the UI as stacked sheets of fine paper:
*   **Base Layer:** `surface` (#f4fbf4)
*   **Secondary Sectioning:** `surface-container` (#e8f0e9)
*   **Interactive Cards:** `surface-container-lowest` (#ffffff) to provide maximum "lift" and focus.

### The "Glass & Gradient" Rule
To inject soul into the UI, main action areas or progress visualizations should utilize subtle gradients. Transition from `primary` (#006c49) to `primary_container` (#10b981) to simulate depth. For floating navigation or modal overlays, use **Glassmorphism**: apply `surface_container_low` at 80% opacity with a `20px` backdrop-blur to allow the productivity colors to bleed through softly.

## 3. Typography: The Friendly Authority
We use **Plus Jakarta Sans** for its modern, geometric, yet approachable character. The hierarchy is designed to be "Editorial-First."

*   **The Hero Stat (Display/Headline):** Use `display-md` or `headline-lg` for daily streaks or completion percentages. This makes the data feel like a headline, not just a number.
*   **The Narrative (Body/Title):** `title-md` is used for habit names to ensure high legibility and a "friendly" weight. `body-md` handles the nuance of descriptions.
*   **The Utility (Labels):** `label-md` and `label-sm` should be used sparingly for metadata, often in all-caps with slight letter-spacing to provide a premium, "curated" feel.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are often a crutch for poor contrast. In this system, we prioritize **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` (#ffffff) card on top of a `surface-container-low` (#eef6ee) background. The delta in hex value provides a natural, soft lift that mimics physical paper.
*   **Ambient Shadows:** When an element must "float" (e.g., an active FAB), use an extra-diffused shadow: `offset-y: 8px, blur: 24px`. The shadow color must be a tinted version of `on-surface` at 6% opacity, never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requirements demand a stroke, use `outline-variant` (#bbcabf) at 20% opacity. **Never use 100% opaque borders.**
*   **Tactile Feedback:** Use the `xl` (1.5rem) roundedness for major cards to make them feel comfortable to the touch, reinforcing the "Sanctuary" concept.

## 5. Components & Interaction Patterns

### Buttons
*   **Primary:** A gradient fill (`primary` to `primary_container`) with `full` (9999px) rounding. This creates a "pill" shape that feels energetic and inviting.
*   **Secondary:** Use `secondary_container` (#2170e4) with `on_secondary_container` (#fefcff) text. No border.
*   **Tertiary:** Transparent background with `primary` text. Use for low-emphasis actions like "Cancel" or "Skip."

### Habit Cards & Progress Lists
*   **The Separation Rule:** **Forbid divider lines.** Separate habits using `1.5rem` (6) vertical spacing or by alternating background tones (`surface-container-low` vs `surface-container-lowest`).
*   **Progress Indicators:** Use the `tertiary` (#855300) to `tertiary_container` (#e29100) orange gradient for high-energy highlights (e.g., a "Streak Fire" icon or a completed ring).

### Input Fields
*   **Styling:** Use `surface_container_highest` (#dde4dd) as the field background.
*   **States:** Upon focus, do not use a heavy border. Instead, shift the background to `surface_container_lowest` and add a subtle `primary` "Ghost Border" (20% opacity).

### Specialized Components
*   **The Momentum Chip:** A small, floating `secondary` chip used to show "+2 days" or "New Record." These should use `md` (0.75rem) rounding and sit slightly offset from the main habit card to break the symmetry.

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts. A large streak number on the left with a small habit name on the right creates visual interest.
*   **Do** embrace white space. Use the `12` (3rem) or `16` (4rem) spacing tokens between major sections to let the UI breathe.
*   **Do** use `primary_fixed_dim` (#4edea3) for "Success" states to keep the palette cohesive with the emerald green theme.

### Don’t:
*   **Don't** use 1px solid grey dividers. They create "visual noise" and break the sanctuary feel.
*   **Don't** use harsh shadows. If a shadow looks like a shadow, it’s too dark. It should look like "ambient depth."
*   **Don't** cram data. If a card feels full, use a larger `roundedness` token or increase the internal padding (use `spacing.5` or `spacing.6`).