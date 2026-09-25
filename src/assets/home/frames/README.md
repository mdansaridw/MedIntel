# Capsule frame sequence

The Blender-rendered capsule frames for the home hero live here. The app picks
them up automatically at build time and orders them by the number in each
filename, so dropping in a new sequence needs no code change.

## What is here

- `0001.webp` … `0144.webp` — 144 frames, 1280 × 1080, WebP with alpha, ~2.1 MB total.
- Ordered by their trailing number, so padding and extension don't matter.

## Export settings (Blender)

- Fixed camera; only the capsule is animated (see the transition map below).
- Render Properties → Film → **Transparent** checked, so frames ship with an
  alpha background and composite over both the light and dark theme canvases.
- File format: **WebP** (or PNG) with alpha. WebP keeps a sequence this length
  around 2 MB; PNG is roughly 10–20× heavier.
- The hero scrubs 144 frames across a 380vh scroll track (~2vh of scroll per
  frame). More frames smooth the scrub but every one of them is bundled, so
  grow the sequence only if the motion needs it.

## Optimising the export

The renders are 1920 × 1080 with the capsule occupying roughly the middle
third, so each frame carries a lot of never-visible transparent margin. Crop the
dead space before committing; the contain-fit canvas then maps source pixels
almost 1:1 and the capsule reads larger on every viewport:

```bash
# 1920x1080 render -> 1280x1080, symmetric 320px crop (capsule stays centred)
for f in *.webp; do
  magick "$f" -crop 1280x1080+320+0 +repage \
    -quality 85 -define webp:method=6 -define webp:alpha-quality=100 "$f"
done
```

Check any new sequence still fits before committing — the widest frame is the
fully-parted capsule and the tallest is the rotated one:

```bash
python3 - <<'PY'
from PIL import Image
import numpy as np, glob
for f in sorted(glob.glob('*.webp')):
    a = np.array(Image.open(f).convert('RGBA'))[:, :, 3]
    ys, xs = np.nonzero(a > 8)
    print(f, 'x', xs.min(), xs.max(), 'y', ys.min(), ys.max())
PY
```

## Transition map (frame → scroll overlay)

| Frames | Capsule motion | Headline |
|---|---|---|
| 0001–0048 | Halves part ~6 m sideways | "Clinical intelligence, unified." — pinned near the top, above the capsule, in the theme blue; on screen from the first paint |
| 0048–0096 | Halves rise/dip ~6 m on Z and rotate 45° | "From data to decisions." — dead centre in the theme blue, fading in place, never rotates |
| 0096–0144 | Halves return to origin and remerge at the centre | "Meet MedIntel." — bottom centre, fading in as frame 0096 starts and holding to the end of the track |

Headlines only ever fade, never move: the scroll position picks the opacity and
the capsule carries all the motion.

Overlay timing lives in `capsuleOverlaySpecs` in
`src/pages/home/lib/capsuleFrames.ts` and is expressed as fractions of the
timeline, so it survives frame-count changes. A `fadeIn`/`fadeOut` of `0` holds
that overlay at full opacity across the edge instead of ramping. Placement and
colour per headline live in `overlayPlacement`/`overlayTone` in
`src/pages/home/components/CapsuleScrollHero.tsx`.

## Notes

- Frames are bundled by Vite, so the sequence weight lands directly in the
  production build. Keep it lean.
- The dev server watches this directory; if a newly added sequence is not picked
  up, restart `npm run dev`.
- `src/assets/3dModels/Capsule.glb` is the Blender source mesh, not used by the
  app at runtime — the hero renders the frame sequence on a canvas.
