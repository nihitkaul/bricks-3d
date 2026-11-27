# Bricks 3D

### **▶ Play Live: [https://bricks-3d.nihitk.workers.dev](https://bricks-3d.nihitk.workers.dev)**

> Play directly in your desktop or mobile browser—deployed on **Cloudflare Workers**.

A classic arcade brick-breaker reimagined in **3D** with Three.js, **cannon-es** 3D rigid-body shattering physics, **9 Blender-authored `.glb` assets**, procedural Web Audio sound effects, mobile touch controls, three live-toggleable worlds with unique 3D mechanics, explosive TNT chain reactions, and a Level 3 Boss Core.

## Environments & World Mechanics (Press `1`, `2`, `3` anytime)
1. **Nature Glade (`1`)** — Sunlit clearing with rolling hills, stone archway, swaying Blender pine trees, fireflies, **bouncy 3D Mushroom Bumpers**, and **forest wind gusts**.
2. **Neon Mall (`2`)** — Retro 2-story glass atrium with checkered terrazzo flooring, pulsing neon arches, Blender palm planters, and **paired Neon Warp Portals**.
3. **Orbital Station (`3`)** — Starfield, ringed alien planet, warp gate, asteroids, orbiting Blender satellites, **Low-G 3D ball arcs**, and a **central Gravity Well**.

## Special Bricks, Power-Ups & Boss Round
- **Difficulty Modes** — `Easy` (5 lives, wider paddle, calmer hazards, 1x score), `Medium` (3 lives, classic pace, 1.5x score), and `Hard` (2 lives, fast ball, 3-HP armor, 18-HP Boss, 2.5x score).
- **Explosive TNT Bricks** — Detonate with a 3D shockwave, hit-stop, and chain-reaction physics blasts.
- **6 Power-Ups** — `Multi-Ball`, `Wide Paddle`, `Fireball`, `Twin Lasers`, `Magnet Catch`, and `Slow-Mo`.
- **Level 3 Boss: Prism Overlord** — Rotating Blender Boss Core with orbiting armored shields, plasma hazards, and a live HUD health bar.

## Controls
- **Desktop**: `←` `→` `↑` `↓` (or `W` `A` `S` `D`) move paddle in 3D · `Space` launch/fire · `1`/`2`/`3` switch world · `Q`/`E` orbit camera · `C` camera presets · `P` pause · `M` mute · `R` restart
- **Mobile**: Drag anywhere on screen to slide the 3D paddle · Tap to launch · On-screen `◀`, `LAUNCH`, `▶` thumb controls

## Regenerating Blender 3D Assets
```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/generate_assets.py
```

## Deploying to Cloudflare
Pushes to `main` auto-deploy via Cloudflare Workers Builds (`wrangler.jsonc`), or run `npx wrangler deploy`.
