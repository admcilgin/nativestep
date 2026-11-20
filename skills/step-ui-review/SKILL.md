---
name: step-ui-review
description: Compare screenshots of one state on the reference and on the native platforms, and list the differences by severity (gate G3). Use in step-feature after G2, on the shots `nativestep shot` takes; after the migration, compare against the design instead of the Flutter app.
---

# step-ui-review

Input: one set of screenshots of the same state, taken with `nativestep shot`: `<stem>-flutter.png` (or a design export after the migration), `<stem>-ios.png` and `<stem>-android.png`. Output: a list of differences, or `INVALID`.

## 1. Is the set valid?

The shots must show the same state: the same screen, the same data, the same loading or error. A set is `INVALID` when:

- one shot shows another screen, another state, a spinner the others do not have, or an empty screen;
- the data differs (another product, another count), which means the fixtures or the timing differ;
- a system dialog, keyboard or debug banner covers content. A banner in an empty corner is a note, not a reason.

Answer `INVALID` with the reason and stop. Do not compare an invalid set.

## 2. Compare

Compare each native shot with the reference, not the two native shots with each other. Go from the top of the screen to the bottom: navigation bar and title, content, controls, tab bar.

Platform conventions are not differences. Each platform keeps its own:

- navigation bar and back button;
- tab bar and system fonts;
- switch, text field and button styles;
- list separators and safe areas.

What must match the reference:

- **Content:** every text, its wording, and the order of elements.
- **Formatting:** prices, dates and counts as the reference formats them.
- **States:** which elements are shown, hidden or disabled.
- **Hierarchy:** what is primary, what is secondary, what is an error.
- **Colors:** colors that carry meaning, such as errors and the brand color.

## 3. Grade

Each difference gets one severity:

- **blocking:** text or data that is missing, wrong or extra. A state shown wrongly (an error not shown, a button enabled that must not be). An element that is unreadable or cut off.
- **minor:** spacing, size or color that differs without changing meaning.
- **note:** a platform convention worth the engineer's attention.

For each difference write the severity, the platform, where it is on the screen, and what the reference shows against what the platform shows. G3 passes when there is no blocking difference. Minor differences and notes go to the evidence for the engineer (G5).
