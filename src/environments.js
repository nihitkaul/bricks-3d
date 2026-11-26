/**
 * Manages the 3 toggleable, deeply 3D environments for Bricks 3D:
 *   1. Nature Glade (Blender tree_nature.glb + 3D hills, stone archway, floating mossy islands, fireflies)
 *   2. Neon Retro Mall (Blender planter_mall.glb + 2-story balconies, glass rails, neon arches, floating holo-cubes)
 *   3. Orbital Station (Blender satellite_space.glb + 3D dome ribs, asteroid belt, ringed planet, warp gate)
 */

import * as THREE from "three";

export const WORLD_CONFIGS = {
  nature: {
    id: "nature",
    label: "NATURE GLADE",
    skyColor: 0x6cbcf7,
    fogColor: 0x8ad0fa,
    fogDensity: 0.011,
    ambientColor: 0xdff7df,
    ambientIntensity: 0.95,
    sunColor: 0xfff1c9,
    sunIntensity: 2.0,
    rimColor: 0x4ade80,
    rimIntensity: 0.9,
    floorColor: 0x2f6336,
    floorRoughness: 0.82,
    floorMetalness: 0.06,
    railColor: 0x7c4a26,
    railEmissive: 0x1e3514,
    paddleGlow: 0x4ade80,
    ballColor: 0xfef08a,
    mechanicLabel: "MUSHROOM BUMPERS · WIND GUSTS",
    gravity: 14.5,
    brickPalette: [0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x14b8a6, 0x38bdf8],
  },
  mall: {
    id: "mall",
    label: "NEON MALL",
    skyColor: 0x140b29,
    fogColor: 0x1d103a,
    fogDensity: 0.013,
    ambientColor: 0xf5d0fe,
    ambientIntensity: 0.9,
    sunColor: 0xffe4f3,
    sunIntensity: 1.65,
    rimColor: 0xf472b6,
    rimIntensity: 1.8,
    floorColor: 0xe6dff0,
    floorRoughness: 0.14,
    floorMetalness: 0.3,
    railColor: 0xd4af37,
    railEmissive: 0x6b124d,
    paddleGlow: 0xf472b6,
    ballColor: 0x67e8f9,
    mechanicLabel: "NEON WARP PORTALS",
    gravity: 14.5,
    brickPalette: [0xff2e93, 0xa855f7, 0x06b6d4, 0xfacc15, 0xfb7185, 0x34d399],
  },
  space: {
    id: "space",
    label: "ORBITAL STATION",
    skyColor: 0x020611,
    fogColor: 0x040a18,
    fogDensity: 0.009,
    ambientColor: 0x93c5fd,
    ambientIntensity: 0.78,
    sunColor: 0xe0f2fe,
    sunIntensity: 1.75,
    rimColor: 0x38bdf8,
    rimIntensity: 2.1,
    floorColor: 0x0f172a,
    floorRoughness: 0.28,
    floorMetalness: 0.78,
    railColor: 0x38bdf8,
    railEmissive: 0x0284c7,
    paddleGlow: 0x38bdf8,
    ballColor: 0xffffff,
    mechanicLabel: "LOW-G ARCS · GRAVITY WELL",
    gravity: 7.4,
    brickPalette: [0x38bdf8, 0x818cf8, 0xc084fc, 0x2dd4bf, 0xf43f5e, 0xfbbf24],
  },
};

function makeCheckerTexture(c1, c2, repeat = 10) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = c2;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillRect(128, 128, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGridTexture(bg, line, repeat = 12) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = line;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 250);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class EnvironmentManager {
  constructor(scene, arena, models) {
    this.scene = scene;
    this.arena = arena;
    this.models = models;
    this.currentWorld = "nature";

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    this.sunLight.position.set(12, 26, 14);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 70;
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.PointLight(0x4ade80, 1.2, 55);
    this.rimLight.position.set(0, 9, -15);
    this.scene.add(this.rimLight);

    this.floorTextures = {
      nature: makeGridTexture("#2e6134", "#3b7842", 8),
      mall: makeCheckerTexture("#f0e8f7", "#cbb7df", 9),
      space: makeGridTexture("#0f172a", "#1e3a5f", 10),
    };

    this.worldGroups = {
      nature: this._buildNatureGroup(),
      mall: this._buildMallGroup(),
      space: this._buildSpaceGroup(),
    };

    Object.values(this.worldGroups).forEach((g) => {
      g.visible = false;
      this.scene.add(g);
    });
  }

  _cloneProp(key, fallbackBuilder) {
    if (this.models[key]) {
      const clone = this.models[key].clone(true);
      clone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      return clone;
    }
    return fallbackBuilder();
  }

  _buildNatureGroup() {
    const group = new THREE.Group();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: 0x3b7d3e, roughness: 0.94 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.35;
    ground.receiveShadow = true;
    group.add(ground);

    // 3D rolling hills & distant mountain ridges
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x2c6633, roughness: 0.9 });
    const peakMat = new THREE.MeshStandardMaterial({ color: 0x4b6e58, roughness: 0.85 });
    const hills = [
      [-26, -24, 14, 9, hillMat],
      [26, -26, 15, 10, hillMat],
      [0, -38, 22, 14, peakMat],
      [-34, -4, 12, 7, hillMat],
      [34, -2, 13, 8, hillMat],
    ];
    hills.forEach(([x, z, r, h, mat]) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat);
      m.position.set(x, h / 2 - 0.5, z);
      m.receiveShadow = true;
      group.add(m);
    });

    // Ancient stone archway framing the back of the 3D court
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8b959e, roughness: 0.85 });
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 8.5, 1.8), stoneMat);
    leftPillar.position.set(-10.8, 3.9, -13.5);
    leftPillar.castShadow = true;
    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 10.8;
    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(24.5, 1.6, 2.1), stoneMat);
    archBeam.position.set(0, 8.4, -13.5);
    archBeam.castShadow = true;
    group.add(leftPillar, rightPillar, archBeam);

    // Stylized Blender pine trees surrounding the clearing
    const treePositions = [
      [-12.5, -10], [-14.8, -4], [-13.2, 2], [-15.2, 8], [-11.5, -16],
      [12.5, -10], [14.8, -4], [13.2, 2], [15.2, 8], [11.5, -16],
      [-6.5, -18.5], [0, -20], [6.5, -18.5], [-19, -13], [19, -13],
      [-20, 4], [20, 4],
    ];
    this.natureTrees = [];
    treePositions.forEach(([x, z], idx) => {
      const tree = this._cloneProp("tree_nature", () => {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(1.1, 3.4, 8),
          new THREE.MeshStandardMaterial({ color: 0x226633 })
        );
        cone.position.y = 1.7;
        return cone;
      });
      const scale = 1.25 + (idx % 4) * 0.32;
      tree.scale.setScalar(scale);
      tree.position.set(x, -0.35, z);
      tree.rotation.y = idx * 1.1;
      group.add(tree);
      this.natureTrees.push({ obj: tree, phase: idx * 0.7 });
    });

    // Floating sunlit 3D mossy stones & fireflies
    this.floatingNatureRocks = [];
    const rockCoords = [[-16, 7.5, -14], [16, 8.2, -12], [-15, 6.2, 4], [15, 6.8, 3]];
    rockCoords.forEach(([x, y, z], idx) => {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.15, 0),
        new THREE.MeshStandardMaterial({ color: 0x5c7a5e, roughness: 0.85 })
      );
      rock.position.set(x, y, z);
      rock.castShadow = true;
      group.add(rock);
      this.floatingNatureRocks.push({ obj: rock, baseY: y, phase: idx * 1.5 });
    });

    const count = 110;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 38;
      positions[i * 3 + 1] = 1.0 + Math.random() * 9.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 34;
    }
    const fireflyGeo = new THREE.BufferGeometry();
    fireflyGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.fireflies = new THREE.Points(
      fireflyGeo,
      new THREE.PointsMaterial({ color: 0xfef08a, size: 0.24, transparent: true, opacity: 0.9 })
    );
    group.add(this.fireflies);

    // Interactive 3D Mushroom Bumpers on the Nature Glade court
    this.natureBumpers = [];
    [[-4.4, 0.2], [4.4, 0.2]].forEach(([x, z]) => {
      const bumper = this._cloneProp("mushroom_bumper", () => {
        const g = new THREE.Group();
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.8, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xef4444 })
        );
        cap.position.y = 0.85;
        g.add(cap);
        return g;
      });
      bumper.position.set(x, 0, z);
      group.add(bumper);
      this.natureBumpers.push({ obj: bumper, x, z, radius: 0.88, pop: 0 });
    });

    return group;
  }

  _buildMallGroup() {
    const group = new THREE.Group();
    const atriumFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshStandardMaterial({
        map: makeCheckerTexture("#2b1c47", "#1e1233", 30),
        roughness: 0.2,
        metalness: 0.25,
      })
    );
    atriumFloor.rotation.x = -Math.PI / 2;
    atriumFloor.position.y = -0.35;
    atriumFloor.receiveShadow = true;
    group.add(atriumFloor);

    // 2-story 3D Mall Atrium Balconies on left & right sides
    const balconyMat = new THREE.MeshStandardMaterial({ color: 0x261742, roughness: 0.4, metalness: 0.25 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
    });
    const neonTrimMat = new THREE.MeshStandardMaterial({
      color: 0xff2e93,
      emissive: 0xff2e93,
      emissiveIntensity: 1.8,
    });

    [-15.2, 15.2].forEach((x) => {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.7, 36), balconyMat);
      deck.position.set(x, 4.8, -2);
      deck.castShadow = true;
      group.add(deck);

      const glassRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.4, 36), glassMat);
      glassRail.position.set(x + (x < 0 ? 2.1 : -2.1), 5.85, -2);
      group.add(glassRail);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 36), neonTrimMat);
      trim.position.set(x + (x < 0 ? 2.2 : -2.2), 4.8, -2);
      group.add(trim);

      // Vertical mall columns
      [-14, -4, 6].forEach((z) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 11, 12), balconyMat);
        col.position.set(x + (x < 0 ? 1.5 : -1.5), 5.2, z);
        col.castShadow = true;
        group.add(col);
      });
    });

    // Blender mall palm planters flanking the court
    const planterPositions = [
      [-11.8, -10], [-11.8, -3], [-11.8, 4], [-11.8, 10],
      [11.8, -10], [11.8, -3], [11.8, 4], [11.8, 10],
    ];
    planterPositions.forEach(([x, z], idx) => {
      const planter = this._cloneProp("planter_mall", () => {
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 0.8, 1.2, 8),
          new THREE.MeshStandardMaterial({ color: 0xf472b6 })
        );
        mesh.position.y = 0.6;
        return mesh;
      });
      planter.scale.setScalar(1.15);
      planter.position.set(x, -0.35, z);
      planter.rotation.y = idx * 0.6;
      group.add(planter);
    });

    // Overhead glowing retro neon arches
    this.mallArches = [];
    const archColors = [0xff2e93, 0x06b6d4, 0xa855f7, 0xff2e93];
    [-12, -5, 2, 9].forEach((z, idx) => {
      const archGeo = new THREE.TorusGeometry(14.0, 0.2, 12, 48, Math.PI);
      const archMat = new THREE.MeshStandardMaterial({
        color: archColors[idx],
        emissive: archColors[idx],
        emissiveIntensity: 1.9,
        roughness: 0.2,
      });
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.set(0, -0.35, z);
      group.add(arch);
      this.mallArches.push(arch);
    });

    // Floating rotating 3D neon mall holo-cubes
    this.mallCubes = [];
    [[-11.5, 8.2, -9], [11.5, 8.2, -9], [0, 10.5, -14]].forEach(([x, y, z], idx) => {
      const cube = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.15),
        new THREE.MeshStandardMaterial({
          color: idx % 2 === 0 ? 0x06b6d4 : 0xff2e93,
          emissive: idx % 2 === 0 ? 0x06b6d4 : 0xff2e93,
          emissiveIntensity: 1.2,
          wireframe: true,
        })
      );
      cube.position.set(x, y, z);
      group.add(cube);
      this.mallCubes.push({ obj: cube, baseY: y, phase: idx * 1.4 });
    });

    // Back arcade storefront wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(34, 9.5, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x1c1230, roughness: 0.45 })
    );
    backWall.position.set(0, 4.4, -17.5);
    group.add(backWall);

    const neonStrip = new THREE.Mesh(
      new THREE.BoxGeometry(26, 0.4, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.8 })
    );
    neonStrip.position.set(0, 7.2, -17.0);
    group.add(neonStrip);

    // Interactive Paired Neon Warp Portals on the Mall court
    this.mallPortals = [];
    const portalSpecs = [
      { x: -6.3, z: -0.2, color: 0x06b6d4 },
      { x: 6.3, z: -0.2, color: 0xff2e93 },
    ];
    portalSpecs.forEach(({ x, z, color }) => {
      const pGroup = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.14, 12, 32),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2, roughness: 0.15 })
      );
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.84, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
      );
      pGroup.add(ring, disc);
      pGroup.position.set(x, 1.05, z);
      pGroup.rotation.y = x < 0 ? 0.55 : -0.55;
      group.add(pGroup);
      this.mallPortals.push({ obj: pGroup, x, z, radius: 1.0, flash: 0 });
    });

    return group;
  }

  _buildSpaceGroup() {
    const group = new THREE.Group();

    // Deep starfield
    const starCount = 900;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 40 + Math.random() * 55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.38 }));
    group.add(this.stars);

    // 3D Glowing Warp Gate behind the court
    this.warpGate = new THREE.Mesh(
      new THREE.TorusGeometry(6.8, 0.32, 16, 48),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 2.0,
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    this.warpGate.position.set(0, 6.2, -18.5);
    group.add(this.warpGate);

    // Ringed alien planet in backdrop
    const planetGroup = new THREE.Group();
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(7.2, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.4,
        roughness: 0.5,
      })
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(9.4, 13.0, 48),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      })
    );
    ring.rotation.x = Math.PI / 2.6;
    ring.rotation.y = 0.3;
    planetGroup.add(planet, ring);
    planetGroup.position.set(-16, 11, -35);
    group.add(planetGroup);
    this.planetGroup = planetGroup;

    // Blender orbital satellites floating at varied 3D heights
    this.satellites = [];
    const satCoords = [
      [-13.5, 5.0, -8],
      [13.5, 6.4, -5],
      [12.8, 4.2, 6],
      [-12.8, 3.8, 5],
      [0, 11.2, -10],
    ];
    satCoords.forEach(([x, y, z], idx) => {
      const sat = this._cloneProp("satellite_space", () => {
        return new THREE.Mesh(
          new THREE.OctahedronGeometry(0.9),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8 })
        );
      });
      sat.scale.setScalar(1.3);
      sat.position.set(x, y, z);
      group.add(sat);
      this.satellites.push({ obj: sat, baseY: y, phase: idx * 1.4 });
    });

    // Tumbling 3D asteroids
    this.asteroids = [];
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, metalness: 0.25 });
    [[-18, 9, -18], [19, 8, -16], [-17, 2.5, -14], [18, 3.5, 2]].forEach(([x, y, z], idx) => {
      const ast = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), rockMat);
      ast.position.set(x, y, z);
      group.add(ast);
      this.asteroids.push({ obj: ast, speed: 0.4 + idx * 0.15 });
    });

    // Interactive Central 3D Gravity Well on the Orbital Station court
    const wellGroup = new THREE.Group();
    const wellCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x6366f1, emissiveIntensity: 2.2, transparent: true, opacity: 0.8 })
    );
    const wellRingA = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.06, 10, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
    );
    wellRingA.rotation.x = Math.PI / 2;
    const wellRingB = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.04, 10, 36),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.35 })
    );
    wellRingB.rotation.x = Math.PI / 2;
    wellGroup.add(wellCore, wellRingA, wellRingB);
    wellGroup.position.set(0, 0.9, 0.2);
    group.add(wellGroup);
    this.spaceGravityWell = { obj: wellGroup, ringA: wellRingA, ringB: wellRingB, x: 0, z: 0.2, radius: 4.6 };

    return group;
  }

  setWorld(worldKey, arenaMeshes) {
    const cfg = WORLD_CONFIGS[worldKey] || WORLD_CONFIGS.nature;
    this.currentWorld = cfg.id;

    document.documentElement.setAttribute("data-world", cfg.id);
    this.scene.background = new THREE.Color(cfg.skyColor);
    this.scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity);

    this.ambientLight.color.setHex(cfg.ambientColor);
    this.ambientLight.intensity = cfg.ambientIntensity;
    this.sunLight.color.setHex(cfg.sunColor);
    this.sunLight.intensity = cfg.sunIntensity;
    this.rimLight.color.setHex(cfg.rimColor);
    this.rimLight.intensity = cfg.rimIntensity;

    Object.entries(this.worldGroups).forEach(([k, g]) => {
      g.visible = k === cfg.id;
    });

    if (arenaMeshes) {
      arenaMeshes.floor.material.color.setHex(cfg.floorColor);
      arenaMeshes.floor.material.map = this.floorTextures[cfg.id];
      arenaMeshes.floor.material.roughness = cfg.floorRoughness;
      arenaMeshes.floor.material.metalness = cfg.floorMetalness;
      arenaMeshes.floor.material.needsUpdate = true;

      arenaMeshes.rails.forEach((rail) => {
        rail.material.color.setHex(cfg.railColor);
        rail.material.emissive.setHex(cfg.railEmissive);
      });
    }

    return cfg;
  }

  popBumper(idx) {
    if (this.natureBumpers && this.natureBumpers[idx]) {
      this.natureBumpers[idx].pop = 1.0;
    }
  }

  flashPortals() {
    if (this.mallPortals) {
      this.mallPortals.forEach((p) => { p.flash = 1.0; });
    }
  }

  update(time, dt = 0.016) {
    if (this.currentWorld === "nature") {
      this.natureTrees.forEach(({ obj, phase }) => {
        obj.rotation.z = Math.sin(time * 1.3 + phase) * 0.035;
      });
      this.floatingNatureRocks.forEach(({ obj, baseY, phase }) => {
        obj.position.y = baseY + Math.sin(time * 1.1 + phase) * 0.5;
        obj.rotation.y = time * 0.25 + phase;
      });
      this.natureBumpers.forEach((b) => {
        if (b.pop > 0) {
          b.pop = Math.max(0, b.pop - dt * 5.0);
          const s = 1 + Math.sin(b.pop * Math.PI) * 0.35;
          b.obj.scale.set(s, 1 / Math.sqrt(s), s);
        } else {
          b.obj.scale.set(1, 1, 1);
        }
      });
      if (this.fireflies) {
        this.fireflies.position.y = Math.sin(time * 1.4) * 0.4;
        this.fireflies.position.x = Math.sin(time * 0.9) * 1.8;
      }
    } else if (this.currentWorld === "mall") {
      this.mallArches.forEach((arch, idx) => {
        arch.material.emissiveIntensity = 1.4 + Math.sin(time * 3.0 + idx) * 0.5;
      });
      this.mallCubes.forEach(({ obj, baseY, phase }) => {
        obj.position.y = baseY + Math.sin(time * 1.8 + phase) * 0.6;
        obj.rotation.x = time * 0.7 + phase;
        obj.rotation.y = time * 0.9;
      });
      this.mallPortals.forEach((p) => {
        p.obj.rotation.z = time * 2.4;
        if (p.flash > 0) {
          p.flash = Math.max(0, p.flash - dt * 4.0);
          p.obj.scale.setScalar(1 + p.flash * 0.35);
        } else {
          p.obj.scale.setScalar(1);
        }
      });
    } else if (this.currentWorld === "space") {
      if (this.stars) this.stars.rotation.y = time * 0.012;
      if (this.planetGroup) this.planetGroup.rotation.y = time * 0.08;
      if (this.warpGate) this.warpGate.rotation.z = time * 0.55;
      this.satellites.forEach(({ obj, baseY, phase }) => {
        obj.position.y = baseY + Math.sin(time * 1.6 + phase) * 0.6;
        obj.rotation.y = time * 0.5 + phase;
        obj.rotation.z = Math.sin(time * 0.9 + phase) * 0.2;
      });
      this.asteroids.forEach(({ obj, speed }) => {
        obj.rotation.x += 0.008 * speed;
        obj.rotation.y += 0.012 * speed;
      });
      if (this.spaceGravityWell) {
        this.spaceGravityWell.ringA.rotation.z = time * 1.8;
        this.spaceGravityWell.ringB.rotation.z = -time * 1.2;
        const pulse = 1 + Math.sin(time * 3.5) * 0.08;
        this.spaceGravityWell.obj.scale.setScalar(pulse);
      }
    }
  }
}
