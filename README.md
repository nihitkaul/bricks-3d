# Bricks 3D

A classic arcade brick-breaker reimagined in 3D with Three.js, **cannon-es** 3D rigid-body shattering physics, custom **Blender-authored `.glb` assets**, procedural Web Audio sound effects, and three live-toggleable 3D worlds — ready to deploy on **Cloudflare Workers / Pages**.

## Environments (Press `1`, `2`, `3` anytime)
1. **Nature Glade (`1`)** — Sunlit forest clearing with swaying Blender pine trees, floating fireflies, and timber rails.
2. **Neon Mall (`2`)** — Retro 80s/90s atrium with checkered terrazzo flooring, glowing neon arches, and Blender palm planters.
3. **Orbital Station (`3`)** — Deep-space starfield, ringed alien planet, sci-fi energy deck, and orbiting Blender satellites.

## Keyboard Controls
- `←` / `→` or `A` / `D` — Move 3D paddle
- `Space` — Launch ball / Start / Resume
- `1` / `2` / `3` — Switch 3D environment live
- `C` — Cycle 3D camera angles (Arcade 3D, Low Action, Overhead)
- `P` — Pause / Resume
- `M` — Mute / Unmute procedural audio
- `R` — Restart

## Regenerating Blender 3D Assets
```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/generate_assets.py
```

## Deploying to Cloudflare
Connect this GitHub repository in **Cloudflare Workers & Pages** (static assets configured in `wrangler.jsonc`), or deploy with `npx wrangler deploy`.
