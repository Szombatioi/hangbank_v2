# Design System: Technical Editorial & The Sonic Archive

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Sonic Archivist."** 

Unlike standard "SaaS-blue" platforms, this system treats audio data with the reverence of a high-end editorial publication. We move away from the "app-like" clutter of buttons and borders, favoring an interface that feels like a precision instrument. The design breaks the traditional grid through **intentional asymmetry**—aligning technical metadata (timestamps, bitrates) against wide, breathable columns of transcribed text. By overlapping waveform visualizations with translucent control surfaces, we create a sense of depth that feels technical yet sophisticated.

## 2. Colors: The Depth of Slate & Signal
The palette is rooted in stability. We use deep slate grays and midnight blues to provide a low-fatigue environment for long-form reading and editing.

### The Palette Logic
- **Primary (`#000000` / `#101b30`):** Used for high-authority elements and deep "void" backgrounds where focus is paramount.
- **Secondary (`#47607e`):** The "Workhorse" slate blue. Used for secondary actions and structural grounding.
- **Tertiary/Accent (`#ed4a14` / `#3b0900`):** The "Signal" color. Reserved strictly for the 'Record' action, 'Live' indicators, and critical errors. This vibrant orange cuts through the cool slates to demand immediate, singular attention.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section off the UI. 
Boundaries must be defined solely through background color shifts. For example, a transcription sidebar should use `surface_container_low` sitting against a main editor area of `surface`. This creates a seamless, "molded" look rather than a "boxed" look.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers:
1.  **Base Layer:** `surface` (#f8f9fa) – The canvas.
2.  **Sectional Layer:** `surface_container_low` (#f3f4f5) – For sidebar utilities.
3.  **Content Layer:** `surface_container_highest` (#e1e3e4) – For active cards or transcription segments.
4.  **Floating Elements:** Use `surface_container_lowest` (#ffffff) with a 60% opacity and a `backdrop-blur(12px)` to create a glassmorphism effect for playback controls.

---

## 3. Typography: Editorial Authority
The type system balances a technical monospace feel with high-legibility sans-serifs.

- **Display & Headlines (`Space Grotesk`):** A rhythmic, geometric typeface. Its wide apertures and technical quirks (like the 'g' and 'f') provide a "precision-engineered" aesthetic. Use `display-lg` for hero recording titles to command the page.
- **Body & Titles (`Inter`):** The "Corpus." Selected for its exceptional legibility in long-form transcription. Use `body-lg` (1rem) with a generous line-height (1.6) for the main transcription text.
- **Labels (`Manrope`):** A modern, functional sans used for metadata (e.g., "00:42:15" or "Bitrate: 320kbps"). It bridges the gap between the technicality of Space Grotesk and the neutrality of Inter.

---

## 4. Elevation & Depth: Tonal Layering
We reject traditional drop shadows in favor of **Tonal Layering**.

- **The Layering Principle:** To lift a "Recording Card" from the background, do not add a shadow. Instead, place a `surface_container_lowest` card on a `surface_container` background. The subtle 2-3% difference in lightness creates a sophisticated "lift."
- **Ambient Shadows:** Only for floating modals or context menus. Use the `on_surface` color at 4% opacity with a 32px blur. It should feel like a soft glow rather than a dark shadow.
- **The "Ghost Border" Fallback:** If high-contrast separation is required (e.g., a waveform graph), use `outline_variant` at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components: Technical Primitives

### Waveform Elements
Waveforms should not be flat. Use a gradient transition from `secondary` to `secondary_fixed_dim` to give the audio visual "weight." Use `spacing.0.5` (0.1rem) as the gap between waveform bars to maintain a high-density, technical look.

### Record Button (The "Signal")
- **Style:** A circular `tertiary` container.
- **Interaction:** On hover, apply a subtle `tertiary_fixed` outer glow (8px blur, 20% opacity).
- **State:** When active (Recording), use a breathing animation (scale 1.0 to 1.05) to simulate a pulse.

### Transcription Cards & Lists
- **Prohibition:** Divider lines are strictly forbidden. 
- **Structure:** Separate transcription segments using `spacing.8` (1.75rem) of vertical white space. Use `label-sm` in `on_surface_variant` for timestamps, placed in the left margin to create an asymmetrical editorial layout.

### Status Indicators (Audio Quality Checks)
- **High Quality:** A soft `primary_fixed` pill with `on_primary_fixed` text.
- **Clipping/Warning:** A `tertiary_container` background with `on_tertiary_container` (Orange) text. Use a "Glass" finish for these indicators to make them feel like LED lights on a physical console.

### Inputs & Fields
Text inputs should be "Underlined Only" or "Ghost Style." Use `surface_container_high` as a subtle background fill with no border, rounding only the top corners (`roundedness.md`).

---

## 6. Do’s and Don'ts

### Do:
- **Use Asymmetry:** Place technical data in narrow columns and transcribed text in wide columns.
- **Embrace White Space:** Use `spacing.16` (3.5rem) between major sections to let the "Corpus" text breathe.
- **Layer Surfaces:** Always ask: "Can I define this area with a background color shift instead of a line?"

### Don’t:
- **Don’t use 1px borders:** They clutter the technical aesthetic and feel "cheap."
- **Don’t use pure black shadows:** They "dirty" the slate and deep blue palette.
- **Don’t center-align long text:** Transcription must always be left-aligned for maximum readability (the "Editorial" rule).
- **Don’t over-use the Accent:** If everything is Orange, nothing is important. Reserve it for the 'Record' state and errors.