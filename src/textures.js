/**
 * Procedural PBR texture generator (albedo, bump, roughness, planetary, and sky domes)
 * for realistic bricks, arena surfaces, architectural props, and atmospheric environments.
 */

import * as THREE from "three";

function createCanvas(width = 256, height = width) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { canvas: c, ctx: c.getContext("2d") };
}

function finalizeTexture(canvas, repeat = 1, isColor = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Fine organic mineral grain + sedimentary veining for Nature masonry bricks */
export function makeStoneBrickMaps() {
  const { canvas: bumpC, ctx: bCtx } = createCanvas(256);
  const { canvas: roughC, ctx: rCtx } = createCanvas(256);

  bCtx.fillStyle = "#848484";
  bCtx.fillRect(0, 0, 256, 256);
  rCtx.fillStyle = "#c8c8c8";
  rCtx.fillRect(0, 0, 256, 256);

  // Hand-dressed chiseled bevel border
  bCtx.strokeStyle = "#484848";
  bCtx.lineWidth = 10;
  bCtx.strokeRect(5, 5, 246, 246);
  bCtx.strokeStyle = "#a2a2a2";
  bCtx.lineWidth = 3;
  bCtx.strokeRect(13, 13, 230, 230);

  // Subtle horizontal sedimentary strata
  for (let i = 0; i < 28; i++) {
    const y = Math.random() * 256;
    const h = 3 + Math.random() * 8;
    const v = 110 + Math.floor(Math.random() * 35);
    bCtx.fillStyle = `rgba(${v},${v},${v},0.22)`;
    bCtx.fillRect(0, y, 256, h);
    const rv = 175 + Math.floor(Math.random() * 55);
    rCtx.fillStyle = `rgba(${rv},${rv},${rv},0.25)`;
    rCtx.fillRect(0, y, 256, h);
  }

  // Natural mineral grain speckles
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const s = 1 + Math.random() * 2.6;
    const v = 88 + Math.floor(Math.random() * 108);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(x, y, s, s);

    const rv = 165 + Math.floor(Math.random() * 75);
    rCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
    rCtx.fillRect(x, y, s, s);
  }

  // Fine weathered hairline micro-cracks
  bCtx.strokeStyle = "rgba(38,38,38,0.45)";
  bCtx.lineWidth = 1.1;
  for (let i = 0; i < 10; i++) {
    bCtx.beginPath();
    let cx = Math.random() * 256;
    let cy = Math.random() * 256;
    bCtx.moveTo(cx, cy);
    for (let seg = 0; seg < 4; seg++) {
      cx += (Math.random() - 0.5) * 30;
      cy += (Math.random() - 0.5) * 30;
      bCtx.lineTo(cx, cy);
    }
    bCtx.stroke();
  }

  return {
    bumpMap: finalizeTexture(bumpC, 1, false),
    roughnessMap: finalizeTexture(roughC, 1, false),
  };
}

/** Brushed anodized titanium / aerospace alloy panel maps for Space & Armored bricks */
export function makeBrushedMetalMaps() {
  const { canvas: bumpC, ctx: bCtx } = createCanvas(256);
  const { canvas: roughC, ctx: rCtx } = createCanvas(256);

  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, 256, 256);
  rCtx.fillStyle = "#4c4c4c";
  rCtx.fillRect(0, 0, 256, 256);

  // Fine anisotropic horizontal brushed micro-streaks
  for (let i = 0; i < 1100; i++) {
    const y = Math.random() * 256;
    const x = Math.random() * 256;
    const w = 28 + Math.random() * 110;
    const v = 108 + Math.floor(Math.random() * 44);
    bCtx.fillStyle = `rgba(${v},${v},${v},0.42)`;
    bCtx.fillRect(x, y, w, 1.1);

    const rv = 48 + Math.floor(Math.random() * 64);
    rCtx.fillStyle = `rgba(${rv},${rv},${rv},0.45)`;
    rCtx.fillRect(x, y, w, 1.1);
  }

  // Precision machined perimeter groove & recessed corner fasteners
  bCtx.strokeStyle = "#303030";
  bCtx.lineWidth = 4;
  bCtx.strokeRect(10, 10, 236, 236);
  bCtx.strokeStyle = "#a8a8a8";
  bCtx.lineWidth = 1.5;
  bCtx.strokeRect(14, 14, 228, 228);

  bCtx.fillStyle = "#3a3a3a";
  [[22, 22], [234, 22], [22, 234], [234, 234]].forEach(([rx, ry]) => {
    bCtx.beginPath();
    bCtx.arc(rx, ry, 4.2, 0, Math.PI * 2);
    bCtx.fill();
  });

  return {
    bumpMap: finalizeTexture(bumpC, 1, false),
    roughnessMap: finalizeTexture(roughC, 1, false),
  };
}

/** Luxury glossy lacquered ceramic / glass micro-bevel map for Neon Mall bricks */
export function makeCeramicBrickMaps() {
  const { canvas: bumpC, ctx: bCtx } = createCanvas(256);
  const { canvas: roughC, ctx: rCtx } = createCanvas(256);

  bCtx.fillStyle = "#929292";
  bCtx.fillRect(0, 0, 256, 256);
  bCtx.strokeStyle = "#525252";
  bCtx.lineWidth = 12;
  bCtx.strokeRect(6, 6, 244, 244);
  bCtx.strokeStyle = "#d0d0d0";
  bCtx.lineWidth = 4;
  bCtx.strokeRect(17, 17, 222, 222);

  // Subtle glaze micro-variation so specular highlights look hand-fired, not sterile CG
  rCtx.fillStyle = "#262626";
  rCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 450; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 4 + Math.random() * 14;
    const v = 30 + Math.floor(Math.random() * 26);
    rCtx.fillStyle = `rgba(${v},${v},${v},0.16)`;
    rCtx.beginPath();
    rCtx.arc(x, y, r, 0, Math.PI * 2);
    rCtx.fill();
  }

  return {
    bumpMap: finalizeTexture(bumpC, 1, false),
    roughnessMap: finalizeTexture(roughC, 1, false),
  };
}

/** Carved weathered mossy stone texture for Nature Glade archway & ruin masonry */
export function makeMossyStoneMaps(repeat = 2) {
  const { canvas: colC, ctx: cCtx } = createCanvas(512);
  const { canvas: bumpC, ctx: bCtx } = createCanvas(512);

  // Warm weathered limestone base
  cCtx.fillStyle = "#8a8579";
  cCtx.fillRect(0, 0, 512, 512);
  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, 512, 512);

  // Ashlar stone course blocks
  const rows = 4;
  const rowH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * 128;
    for (let c = -1; c < 3; c++) {
      const x = c * 256 + offset;
      const y = r * rowH;
      const shade = 122 + Math.floor(Math.random() * 28);
      cCtx.fillStyle = `rgb(${shade + 6}, ${shade + 2}, ${shade - 8})`;
      cCtx.fillRect(x + 3, y + 3, 250, rowH - 6);
    }
    // Mortar lines
    cCtx.strokeStyle = "rgba(44, 48, 36, 0.65)";
    cCtx.lineWidth = 6;
    cCtx.beginPath();
    cCtx.moveTo(0, r * rowH);
    cCtx.lineTo(512, r * rowH);
    cCtx.stroke();

    bCtx.strokeStyle = "#2b2b2b";
    bCtx.lineWidth = 7;
    bCtx.beginPath();
    bCtx.moveTo(0, r * rowH);
    bCtx.lineTo(512, r * rowH);
    bCtx.stroke();
  }

  // Stone grain & golden lichen flecks
  for (let i = 0; i < 4800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = 1.2 + Math.random() * 3.5;
    const v = 90 + Math.floor(Math.random() * 75);
    cCtx.fillStyle = `rgba(${v + 4},${v},${v - 8},0.34)`;
    cCtx.fillRect(x, y, s, s);
    bCtx.fillStyle = `rgba(${v},${v},${v},0.4)`;
    bCtx.fillRect(x, y, s, s);
  }

  // Organic creeping moss clusters clinging to crevices & top edges
  for (let i = 0; i < 95; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const rad = 10 + Math.random() * 28;
    const grad = cCtx.createRadialGradient(cx, cy, 2, cx, cy, rad);
    grad.addColorStop(0, "rgba(62, 102, 48, 0.72)");
    grad.addColorStop(0.6, "rgba(74, 112, 52, 0.38)");
    grad.addColorStop(1, "rgba(74, 112, 52, 0)");
    cCtx.fillStyle = grad;
    cCtx.beginPath();
    cCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    cCtx.fill();
  }

  return {
    map: finalizeTexture(colC, repeat, true),
    bumpMap: finalizeTexture(bumpC, repeat, false),
  };
}

/** Realistic sunlit mossy flagstone & meadow clearing floor texture */
export function makeNatureFloorMaps(repeat = 6) {
  const { canvas: colC, ctx: cCtx } = createCanvas(512);
  const { canvas: bumpC, ctx: bCtx } = createCanvas(512);

  cCtx.fillStyle = "#3f6334";
  cCtx.fillRect(0, 0, 512, 512);
  bCtx.fillStyle = "#787878";
  bCtx.fillRect(0, 0, 512, 512);

  // Warm sunlit mossy patches & earthy meadow mottling
  for (let i = 0; i < 55; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 24 + Math.random() * 54;
    const warm = i % 3 === 0;
    const grad = cCtx.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, warm ? "rgba(116, 134, 62, 0.34)" : "rgba(42, 82, 40, 0.36)");
    grad.addColorStop(1, "rgba(42, 82, 40, 0)");
    cCtx.fillStyle = grad;
    cCtx.beginPath();
    cCtx.arc(x, y, r, 0, Math.PI * 2);
    cCtx.fill();
  }

  // Fine blades, moss & earth micro-texture
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1 + Math.random() * 4.2;
    const g = 78 + Math.floor(Math.random() * 56);
    const rr = 46 + Math.floor(Math.random() * 42);
    const b = 28 + Math.floor(Math.random() * 24);
    cCtx.fillStyle = `rgba(${rr},${g},${b},0.46)`;
    cCtx.fillRect(x, y, r, r);

    const bv = 85 + Math.floor(Math.random() * 90);
    bCtx.fillStyle = `rgba(${bv},${bv},${bv},0.45)`;
    bCtx.fillRect(x, y, r, r);
  }

  // Weathered garden court flagstones
  cCtx.strokeStyle = "rgba(32, 48, 26, 0.34)";
  cCtx.lineWidth = 4;
  bCtx.strokeStyle = "#383838";
  bCtx.lineWidth = 5;
  for (let x = 0; x <= 512; x += 128) {
    cCtx.beginPath(); cCtx.moveTo(x, 0); cCtx.lineTo(x, 512); cCtx.stroke();
    bCtx.beginPath(); bCtx.moveTo(x, 0); bCtx.lineTo(x, 512); bCtx.stroke();
  }
  for (let y = 0; y <= 512; y += 128) {
    cCtx.beginPath(); cCtx.moveTo(0, y); cCtx.lineTo(512, y); cCtx.stroke();
    bCtx.beginPath(); bCtx.moveTo(0, y); bCtx.lineTo(512, y); bCtx.stroke();
  }

  return {
    map: finalizeTexture(colC, repeat, true),
    bumpMap: finalizeTexture(bumpC, repeat, false),
  };
}

/** Realistic polished speckled terrazzo marble floor with brass inlays for Neon Mall */
export function makeMallTerrazzoMaps(repeat = 6, darkPlaza = false) {
  const { canvas: colC, ctx: cCtx } = createCanvas(512);
  const { canvas: roughC, ctx: rCtx } = createCanvas(512);

  const tile = 256;
  const toneA = darkPlaza ? "#2b2042" : "#eee7f2";
  const toneB = darkPlaza ? "#221836" : "#d8cde4";
  for (let gx = 0; gx < 2; gx++) {
    for (let gy = 0; gy < 2; gy++) {
      cCtx.fillStyle = (gx + gy) % 2 === 0 ? toneA : toneB;
      cCtx.fillRect(gx * tile, gy * tile, tile, tile);
    }
  }
  rCtx.fillStyle = darkPlaza ? "#303030" : "#222222";
  rCtx.fillRect(0, 0, 512, 512);

  // Subtle marble veining inside tiles
  cCtx.strokeStyle = darkPlaza ? "rgba(180, 150, 220, 0.10)" : "rgba(130, 108, 156, 0.14)";
  cCtx.lineWidth = 2.2;
  for (let i = 0; i < 16; i++) {
    cCtx.beginPath();
    let vx = Math.random() * 512;
    let vy = Math.random() * 512;
    cCtx.moveTo(vx, vy);
    for (let s = 0; s < 5; s++) {
      vx += (Math.random() - 0.35) * 60;
      vy += (Math.random() - 0.5) * 45;
      cCtx.lineTo(vx, vy);
    }
    cCtx.stroke();
  }

  // Terrazzo mineral flecks (quartz, brass, rose-stone, amethyst)
  const flecks = darkPlaza
    ? ["#6c5a8f", "#c9a452", "#473966", "#9f7ec4", "#e8b4d2"]
    : ["#ffffff", "#9b8ab0", "#d4af37", "#7c6794", "#f8d4e8", "#c2e7f5"];
  for (let i = 0; i < 2800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = 1.4 + Math.random() * 3.6;
    cCtx.fillStyle = flecks[i % flecks.length];
    cCtx.globalAlpha = darkPlaza ? 0.34 : 0.44;
    cCtx.fillRect(x, y, s, s);
  }
  cCtx.globalAlpha = 1;

  // Luxury brushed-brass tile divider inlay lines
  cCtx.strokeStyle = darkPlaza ? "rgba(196, 158, 72, 0.38)" : "rgba(186, 150, 68, 0.55)";
  cCtx.lineWidth = 3.5;
  cCtx.strokeRect(2, 2, 508, 508);
  cCtx.beginPath();
  cCtx.moveTo(256, 0); cCtx.lineTo(256, 512);
  cCtx.moveTo(0, 256); cCtx.lineTo(512, 256);
  cCtx.stroke();

  rCtx.strokeStyle = "#989898";
  rCtx.lineWidth = 4;
  rCtx.beginPath();
  rCtx.moveTo(256, 0); rCtx.lineTo(256, 512);
  rCtx.moveTo(0, 256); rCtx.lineTo(512, 256);
  rCtx.stroke();

  return {
    map: finalizeTexture(colC, repeat, true),
    roughnessMap: finalizeTexture(roughC, repeat, false),
  };
}

/** Veined cream/ivory architectural marble for luxury Mall columns */
export function makeMarbleMaps(repeat = 2) {
  const { canvas: colC, ctx: cCtx } = createCanvas(256);
  cCtx.fillStyle = "#e7e0eb";
  cCtx.fillRect(0, 0, 256, 256);

  // Soft cloudy marble strata
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 24 + Math.random() * 50;
    const grad = cCtx.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, "rgba(192, 178, 206, 0.28)");
    grad.addColorStop(1, "rgba(231, 224, 235, 0)");
    cCtx.fillStyle = grad;
    cCtx.beginPath();
    cCtx.arc(x, y, r, 0, Math.PI * 2);
    cCtx.fill();
  }

  // Delicate warm-gold & slate veins
  for (let i = 0; i < 14; i++) {
    cCtx.strokeStyle = i % 3 === 0 ? "rgba(188, 154, 88, 0.32)" : "rgba(118, 104, 138, 0.28)";
    cCtx.lineWidth = 0.9 + Math.random() * 1.4;
    cCtx.beginPath();
    let vx = Math.random() * 256;
    let vy = 0;
    cCtx.moveTo(vx, vy);
    for (let s = 0; s < 8; s++) {
      vx += (Math.random() - 0.5) * 32;
      vy += 32;
      cCtx.lineTo(vx, vy);
    }
    cCtx.stroke();
  }

  return {
    map: finalizeTexture(colC, repeat, true),
  };
}

/** Realistic machined orbital deck plating for Space Station */
export function makeSpaceDeckMaps(repeat = 6) {
  const { canvas: colC, ctx: cCtx } = createCanvas(512);
  const { canvas: bumpC, ctx: bCtx } = createCanvas(512);
  const { canvas: roughC, ctx: rCtx } = createCanvas(512);

  cCtx.fillStyle = "#162133";
  cCtx.fillRect(0, 0, 512, 512);
  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, 512, 512);
  rCtx.fillStyle = "#484848";
  rCtx.fillRect(0, 0, 512, 512);

  // Subtle tonal variation per hull plate
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      const delta = ((gx * 7 + gy * 13) % 3) * 5;
      cCtx.fillStyle = `rgb(${20 + delta}, ${31 + delta}, ${49 + delta})`;
      cCtx.fillRect(gx * 128 + 3, gy * 128 + 3, 122, 122);
      const rShade = 64 + ((gx + gy) % 2) * 18;
      rCtx.fillStyle = `rgb(${rShade},${rShade},${rShade})`;
      rCtx.fillRect(gx * 128 + 3, gy * 128 + 3, 122, 122);
    }
  }

  // Brushed metal micro-grain across plates
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 18 + Math.random() * 50;
    cCtx.fillStyle = "rgba(120, 165, 215, 0.05)";
    cCtx.fillRect(x, y, w, 1.2);
  }

  // Machined panel seams & bevel highlights
  cCtx.strokeStyle = "#283c5c";
  cCtx.lineWidth = 4;
  bCtx.strokeStyle = "#282828";
  bCtx.lineWidth = 6;
  rCtx.strokeStyle = "#b0b0b0";
  rCtx.lineWidth = 5;
  for (let i = 0; i <= 512; i += 128) {
    cCtx.beginPath(); cCtx.moveTo(i, 0); cCtx.lineTo(i, 512); cCtx.stroke();
    cCtx.beginPath(); cCtx.moveTo(0, i); cCtx.lineTo(512, i); cCtx.stroke();
    bCtx.beginPath(); bCtx.moveTo(i, 0); bCtx.lineTo(i, 512); bCtx.stroke();
    bCtx.beginPath(); bCtx.moveTo(0, i); bCtx.lineTo(512, i); bCtx.stroke();
    rCtx.beginPath(); rCtx.moveTo(i, 0); rCtx.lineTo(i, 512); rCtx.stroke();
    rCtx.beginPath(); rCtx.moveTo(0, i); rCtx.lineTo(512, i); rCtx.stroke();
  }

  // Corner deck bolts
  cCtx.fillStyle = "#3a567c";
  bCtx.fillStyle = "#d4d4d4";
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      const ox = gx * 128;
      const oy = gy * 128;
      [[14, 14], [114, 14], [14, 114], [114, 114]].forEach(([rx, ry]) => {
        cCtx.beginPath(); cCtx.arc(ox + rx, oy + ry, 3.0, 0, Math.PI * 2); cCtx.fill();
        bCtx.beginPath(); bCtx.arc(ox + rx, oy + ry, 3.0, 0, Math.PI * 2); bCtx.fill();
      });
    }
  }

  return {
    map: finalizeTexture(colC, repeat, true),
    bumpMap: finalizeTexture(bumpC, repeat, false),
    roughnessMap: finalizeTexture(roughC, repeat, false),
  };
}

/** Procedural banded gas-giant planet texture (Saturn/Jupiter atmospheric cloud bands) */
export function makeGasGiantTexture() {
  const { canvas, ctx } = createCanvas(1024, 512);

  // Base atmospheric latitude gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, "#24344d");
  grad.addColorStop(0.12, "#455c78");
  grad.addColorStop(0.24, "#c9a882");
  grad.addColorStop(0.34, "#e6d2b5");
  grad.addColorStop(0.42, "#b56e4b");
  grad.addColorStop(0.50, "#e9dcc6");
  grad.addColorStop(0.58, "#9c563a");
  grad.addColorStop(0.68, "#d4b48c");
  grad.addColorStop(0.80, "#5c708a");
  grad.addColorStop(0.92, "#32445e");
  grad.addColorStop(1.0, "#1c283b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Flowing turbulent zonal jet-stream bands
  const bandPalette = [
    "rgba(245, 232, 206, 0.34)",
    "rgba(182, 104, 68, 0.32)",
    "rgba(218, 178, 132, 0.30)",
    "rgba(92, 120, 152, 0.28)",
    "rgba(138, 74, 48, 0.26)",
    "rgba(255, 246, 228, 0.24)",
  ];
  for (let b = 0; b < 58; b++) {
    const baseY = (b / 58) * 512;
    const amp = 2 + Math.random() * 5.5;
    const freq = 0.008 + Math.random() * 0.014;
    const phase = Math.random() * Math.PI * 2;
    ctx.strokeStyle = bandPalette[b % bandPalette.length];
    ctx.lineWidth = 4 + Math.random() * 14;
    ctx.beginPath();
    for (let x = 0; x <= 1024; x += 16) {
      const y = baseY + Math.sin(x * freq + phase) * amp + Math.cos(x * freq * 2.1) * (amp * 0.45);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Iconic anticyclonic storm oval (Great Spot style)
  const sx = 620;
  const sy = 296;
  const stormGrad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 52);
  stormGrad.addColorStop(0, "rgba(214, 114, 72, 0.92)");
  stormGrad.addColorStop(0.55, "rgba(168, 76, 46, 0.72)");
  stormGrad.addColorStop(0.82, "rgba(238, 214, 182, 0.42)");
  stormGrad.addColorStop(1, "rgba(238, 214, 182, 0)");
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(1.65, 0.78);
  ctx.translate(-sx, -sy);
  ctx.fillStyle = stormGrad;
  ctx.beginPath();
  ctx.arc(sx, sy, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Procedural multi-band translucent planetary ring texture with Cassini-like gaps */
export function makePlanetRingTexture() {
  const { canvas, ctx } = createCanvas(512, 32);
  ctx.clearRect(0, 0, 512, 32);

  // Horizontal coordinate u = 0 (inner edge) -> 512 (outer edge)
  for (let x = 0; x < 512; x++) {
    const t = x / 511;
    // Soft inner & outer radial fade
    const edgeFade = Math.min(1, t * 7.5) * Math.min(1, (1 - t) * 7.0);
    // Cassini division gap around t = 0.62..0.69 & Encke gap around t = 0.85..0.87
    const cassiniGap = t > 0.61 && t < 0.685 ? 0.08 : 1.0;
    const enckeGap = t > 0.84 && t < 0.865 ? 0.16 : 1.0;

    const ripple =
      0.55 +
      0.24 * Math.sin(t * 95) +
      0.14 * Math.sin(t * 230 + 1.2) +
      0.1 * Math.cos(t * 48);

    const alpha = Math.max(0, Math.min(0.88, edgeFade * cassiniGap * enckeGap * ripple));

    // Warm icy-cream inner bands transitioning to cool dusty cyan-slate outer bands
    const r = Math.floor(228 - t * 65 + Math.sin(t * 60) * 14);
    const g = Math.floor(216 - t * 32 + Math.cos(t * 75) * 12);
    const b = Math.floor(194 + t * 38);

    ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
    ctx.fillRect(x, 0, 1, 32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Smooth atmospheric sky-dome gradient texture with optional warm sun-horizon bloom */
export function makeSkyDomeTexture(topColor, midColor, horizonColor, bottomColor) {
  const { canvas, ctx } = createCanvas(64, 512);
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, topColor);
  grad.addColorStop(0.36, midColor);
  grad.addColorStop(0.53, horizonColor);
  grad.addColorStop(1.0, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Deep-space panoramic cosmic nebula & star-dust sky dome texture for Orbital Station */
export function makeSpaceNebulaSkyTexture() {
  const { canvas, ctx } = createCanvas(1024, 512);

  // Deep cosmic gradient base
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, "#01030a");
  grad.addColorStop(0.38, "#050b1d");
  grad.addColorStop(0.55, "#0b1630");
  grad.addColorStop(1.0, "#020510");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle volumetric-feeling cosmic nebula ribbons (teal, indigo, dusty violet-rose)
  const clouds = [
    { x: 260, y: 185, rx: 220, ry: 78, color: "rgba(32, 92, 168, 0.24)" },
    { x: 340, y: 205, rx: 165, ry: 56, color: "rgba(45, 184, 196, 0.16)" },
    { x: 540, y: 165, rx: 240, ry: 82, color: "rgba(96, 48, 152, 0.22)" },
    { x: 640, y: 195, rx: 155, ry: 52, color: "rgba(186, 68, 140, 0.13)" },
    { x: 820, y: 215, rx: 190, ry: 68, color: "rgba(38, 110, 192, 0.20)" },
    { x: 140, y: 230, rx: 170, ry: 60, color: "rgba(76, 52, 138, 0.18)" },
  ];
  clouds.forEach(({ x, y, rx, ry, color }) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 6, 0, 0, rx);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Distant faint background star-dust pinpoints
  for (let i = 0; i < 650; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 380;
    const a = 0.18 + Math.random() * 0.65;
    const r = Math.random() < 0.14 ? 1.4 : 0.8;
    const tint = i % 5 === 0 ? `rgba(180,225,255,${a})` : i % 7 === 0 ? `rgba(255,220,185,${a})` : `rgba(235,244,255,${a})`;
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft radial golden-hour sun glow sprite texture */
export function makeSunGlowTexture() {
  const { canvas, ctx } = createCanvas(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 126);
  grad.addColorStop(0.0, "rgba(255, 252, 232, 1.0)");
  grad.addColorStop(0.18, "rgba(255, 230, 158, 0.92)");
  grad.addColorStop(0.42, "rgba(255, 184, 92, 0.42)");
  grad.addColorStop(0.72, "rgba(248, 146, 68, 0.12)");
  grad.addColorStop(1.0, "rgba(248, 146, 68, 0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
