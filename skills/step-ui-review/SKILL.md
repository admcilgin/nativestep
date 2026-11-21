---
name: step-ui-review
description: Compare screenshots of one state on the reference and on the native platforms, and list the differences by severity (gate G3). Use in step-feature after G2, on the shots `nativestep shot` takes; without a reference, compare against the design in docs/design/, or the two platforms with each other when there is none.
---

# step-ui-review

Input: one set of screenshots of the same state, taken with `nativestep shot`: `<stem>-flutter.png` (without a reference, the design export `docs/design/<feature>/<stem>.png`, if there is one), `<stem>-ios.png` and `<stem>-android.png`. Output: a list of differences, or `INVALID`.

## 1. Is the set valid?

The shots must show the same state: the same screen, the same data, the same loading or error. A set is `INVALID` when:

- one shot shows another screen, another state, a spinner the others do not have, or an empty screen;
- the data differs (another product, another count), which means the fixtures or the timing differ;
- a system dialog, keyboard or debug banner covers content. A banner in an empty corner is a note, not a reason.
- the iOS shot comes from a wide simulator (an iPad or the iPhone Duo). There, `TabView` becomes an icon-only rail and layouts take their regular-width form. Boot an iPhone simulator and take the shots again (GUIDE.md §1).

Answer `INVALID` with the reason and stop. Do not compare an invalid set.

## 2. Compare

Compare each native shot with the reference (the Flutter shot or the design), not the two native shots with each other. Without either, compare iOS with Android, and both with the feature doc's words: the texts, the states and the order the doc gives. Go from the top of the screen to the bottom: status bar (its icons readable on the app's background), navigation bar and title, content, controls, tab bar.

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
- **Controls:** every action the screen's node offers has a control on screen that sends it. Tests drive the node, so a poster or row that cannot be tapped still passes them; a shot cannot show it either. For each new control, tap it once on the device and see the screen change.

## 3. Grade

Each difference gets one severity:

- **blocking:** text or data that is missing, wrong or extra. A state shown wrongly (an error not shown, a button enabled that must not be). An element that is unreadable or cut off.
- **minor:** spacing, size or color that differs without changing meaning.
- **note:** a platform convention worth the engineer's attention.

For each difference write the severity, the platform, where it is on the screen, and what the reference shows against what the platform shows. G3 passes when there is no blocking difference. Minor differences and notes go to the evidence for the engineer (G5).
