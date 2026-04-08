# Design System Documentation: The Academic Luminary

## 1. Overview & Creative North Star
**The Creative North Star: "The Digital Curator"**

In the context of University Scientific Management, data is often dense and overwhelming. This design system rejects the "spreadsheet-heavy" aesthetic of legacy institutional software. Instead, it adopts the persona of a **Digital Curator**—an interface that treats scientific data with the prestige of a high-end editorial journal.

The system breaks the "template" look by utilizing **intentional asymmetry** and **tonal depth**. We move away from rigid, boxed-in grids toward an expansive, breathing layout where information is separated by light and shadow rather than harsh lines. The result is a "Modern Corporate" experience that feels "High-Trust" because it is organized, calm, and authoritative.

---

## 2. Colors: The Depth of Knowledge
The palette is rooted in the authority of `Indigo Deep` and the innovative energy of `Radiant Violet`. 

### The "No-Line" Rule
**Designers are strictly prohibited from using 1px solid borders for sectioning.** Boundaries must be defined solely through background color shifts or subtle tonal transitions.
- *Example:* A `surface-container-low` sidebar sitting against a `surface` main content area provides enough contrast to define space without visual clutter.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of frosted glass.
- **Surface (Base):** `#f8f9ff` – The canvas.
- **Surface-Container-Lowest:** `#ffffff` – Used for primary content cards to make them "pop" against the base.
- **Surface-Container-High:** `#dce9ff` – Used for subtle nesting, such as a search bar inside a header.

### The "Glass & Gradient" Rule
To evoke innovation, use **Glassmorphism** for floating elements (modals, dropdowns, navigation rails).
- **Token:** Apply `surface` at 70% opacity with a `20px backdrop-blur`.
- **Signature Gradient:** Use a subtle linear gradient for primary CTAs: `linear-gradient(135deg, #1A237E 0%, #7C4DFF 100%)`. This creates a "visual soul" that flat indigo cannot achieve.

---

### 3. Typography: Editorial Authority
We utilize **Manrope** for its geometric yet approachable proportions. The hierarchy is designed to feel like a modern research publication.

*   **Display (Display-LG/MD/SM):** Reserved for high-level dashboard metrics or hero section titles. Use `ExtraBold` weight.
*   **Headlines (Headline-LG/MD/SM):** For section titles. Use `SemiBold` with tight letter-spacing (-0.02em) to maintain a professional, "tight" corporate look.
*   **Body (Body-LG/MD):** The workhorse for research abstracts and data entries. Use `Medium` weight for `Body-MD` to ensure legibility on high-density screens.
*   **Labels (Label-MD/SM):** For metadata and tags. Always `Uppercase` with `+0.05em` letter-spacing to distinguish from body text.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "software-heavy." We achieve depth through **Ambient Light Physics**.

### The Layering Principle
Instead of shadows, stack your surfaces:
1.  **Level 0 (Background):** `surface`
2.  **Level 1 (Section):** `surface-container-low`
3.  **Level 2 (Active Card):** `surface-container-lowest`

### Ambient Shadows
When an element must float (e.g., a "Create New Project" FAB), use a **Tinted Ambient Shadow**:
- **Blur:** 32px | **Spread:** 0
- **Color:** `#1A237E` at 6% opacity. This mimics natural light passing through a scientific lens.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., input fields), use a **Ghost Border**: `outline-variant` at 20% opacity. **Never use 100% opaque borders.**

---

## 5. Components: Precision & Clarity

### Buttons (The 12px Standard)
All buttons use a `DEFAULT` (0.5rem/12px) corner radius.
- **Primary:** The Signature Gradient (Indigo to Violet). No border. High-trust, high-action.
- **Secondary:** `surface-container-high` background with `on-surface` text. Feels integrated, not intrusive.
- **Tertiary:** Text only, using `primary` color. Reserved for "Cancel" or "Back" actions.

### Data Cards (The Science Hub)
**Rule:** Forbid the use of divider lines inside cards.
- Use vertical white space (from the Spacing Scale) to separate the title from the metadata.
- Use a `surface-variant` (subtle blue-grey) background for the card footer to separate actions from content.

### Glassmorphism Navigation Rail
The side navigation should be a vertical glass slab:
- **Background:** `surface` at 80% opacity.
- **Active State:** A "Radiant Violet" vertical pill (4px wide) on the left edge of the active item.

### Input Fields
- **Background:** `surface-container-lowest` (pure white).
- **Focus State:** A 2px `surface-tint` glow instead of a harsh border change.

---

## 6. Do's and Don'ts

### Do:
*   **Use Generous White Space:** Scientific data needs "room to breathe." If in doubt, double the padding.
*   **Leverage Tonal Shifts:** Distinguish the "Research Submission" area from the "Analytics" area using `surface-container` tiers.
*   **Prioritize Accessibility:** Ensure `on-surface` text meets AA standards against the `surface` background.

### Don't:
*   **Don't Use Pure Black:** Use `on-surface` (`#0d1c2e`) for text. It’s softer and more premium.
*   **Don't Use Standard Grids:** Occasionally offset a card or a header to create a bespoke, editorial feel.
*   **Don't Overuse Glass:** Save glassmorphism for *overlaying* elements (menus, top bars) to maintain performance and focus.
*   **Don't Use 1px Dividers:** Use a 4px gap or a change in background color to separate list items.

---

## 7. Signature Elements for University Management
- **The "Grant Status" Chip:** Use `secondary-container` with `on-secondary-container` text. Large `full` roundness.
- **The "Publication Feed":** An asymmetrical masonry layout for research cards to break the monotony of traditional lists.
- **Metric Highlights:** Use `Display-SM` in `Radiant Violet` for key numbers (e.g., Total Citations) to give the user an immediate sense of achievement.