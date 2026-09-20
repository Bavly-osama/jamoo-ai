# Prompt: Visible hand + one-time “Pinch here”

## Goal
Make onboarding obvious and finishable in one pinch.

1. **See my hand** — While the camera is on, always show a live hand skeleton (joints + bones) so I know tracking sees me.
2. **Pinch here once** — Tutorial ends after a single pinch on “Pinch here” (or one tap). No drag step. No two-hand zoom step.

## UX requirements
- Camera preview is large and easy to find during setup.
- Skeleton draws on the camera preview and as a light full-screen overlay aligned with the mirrored pointer.
- Tutorial steps only:
  1. Open palm (hand detected)
  2. Move left / right
  3. **Pinch here** once → enter workspace
- Button label: `Pinch here`
- One pinch (or tap) advances and completes setup immediately.
- Keep easy-mode thresholds for this single pinch.

## Out of scope
- Changing post-tutorial drag / zoom gestures in the main HUD
- Uploading video or sending frames to the server

## Acceptance
- With camera on, skeleton appears whenever a hand is detected (no debug toggle required).
- Completing open → move → one pinch hides welcome and sets HAND TRACKING.
- Tap on “Pinch here” also completes setup.
- Existing unit tests still pass; browser onboarding test updated for the shorter flow.
