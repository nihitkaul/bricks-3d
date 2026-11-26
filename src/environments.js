/**
 * Manages the 3 toggleable 3D environments for Bricks 3D:
 *   1. Nature Glade (uses Blender tree_nature.glb + fireflies + warm forest sun)
 *   2. Neon Retro Mall (uses Blender planter_mall.glb + checkered terrazzo + neon arches)
 *   3. Orbital Station (uses Blender satellite_space.glb + starfield + ringed planet)
 */

import * as THREE from "three";

export const WORLD_CONFIGS = {
  nature: {
    id: "nature",
    label: "NATURE GLADE",
    skyColor: 0x7cc4fa,
    fogColor: 0x89ccf5,
    fogDensity: 0.015,
    ambientColor: 0xdff5df,
    ambientIntensity: 0.9,
    sunColor: 0xfff3d1,
    sunIntensity: 1.8,
    rimColor: 0x4ade80,
    rimIntensity: 0.65,
    floorColor: 0x2f5e35,
    floorRoughness: 0.85,
    floorMetalness: 0.05,
    railColor: 0x7c4a26,
    railEmissive: 0x1a2e12,
    paddleGlow: 0x4ade80,
    ballColor: 0xfef08a,
    brickPalette: [0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x14b8a6, 0x38bdf8],
  },
  mall: {
    id: "mall",
    label: "NEON MALL",
    skyColor: 0x1a1033,
    fogColor: 0x211340,
    fogDensity: 0.017,
    ambientColor: 0xf5d0fe,
    ambientIntensity: 0.85,
    sunColor: 0xffe4f3,
    sunIntensity: 1.5,
    rimColor: 0xf472b6,
    rimIntensity: 1.4,
    floorColor: 0xe2dce8,
    floorRoughness: 0.18,
    floorMetalness: 0.25,
    railColor: 0xd4af37,
    railEmissive: 0x5c1042,
    paddleGlow: 0xf472b6,
    ballColor: 0x67e8f9,
    brickPalette: [0xff2e93, 0xa855f7, 0x06b6d4, 0xfacc15, 0xfb7185, 0x34d399],
  },
  space: {
    id: "space",
    label: "ORBITAL STATION",
    skyColor: 0x030712,
    fogColor: 0x050b18,
    fogDensity: 0.012,
    ambientColor: 0x93c5fd,
    ambientIntensity: 0.7,
    sunColor: 0xe0f2fe,
    sunIntensity: 1.6,
    rimColor: 0x38bdf8,
    rimIntensity: 1.8,
    floorColor: 0x111827,
    floorRoughness: 0.32,
    floorMetalness: 0.72,
    railColor: 0x38bdf8,
    railEmissive: 0x0ea5e9,
    paddleGlow: 0x38bdf8,
    ballColor: 0xffffff,
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

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sunLight.position.set(10, 22, 12);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 60;
    const d = 22;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.PointLight(0x4ade80, 1.0, 48);
    this.rimLight.position.set(0, 7, -14);
    this.scene.add(this.rimLight);

    this.floorTextures = {
      nature: makeGridTexture("#2e5c33", "#386e3e", 8),
      mall: makeCheckerTexture("#efe7f5", "#c8b6db", 9),
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
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({ color: 0x3b7a3e, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.35;
    ground.receiveShadow = true;
    group.add(ground);

    // Stylized pine trees from Blender around the arena
    const treePositions = [
      [-12.5, -10], [-14.5, -4], [-13, 2], [-15, 8], [-11, -15],
      [12.5, -10], [14.5, -4], [13, 2], [15, 8], [11, -15],
      [-6, -16.5], [0, -17.5], [6, -16.5], [-18, -12], [18, -12],
    ];
    this.natureTrees = [];
    treePositions.forEach(([x, z], idx) => {
      const tree = this._cloneProp("tree_nature", () => {
        const g = new THREE.Group();
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(1.1, 3.2, 8),
          new THREE.MeshStandardMaterial({ color: 0x226633 })
        );
        cone.position.y = 1.6;
        g.add(cone);
        return g;
      });
      const scale = 1.15 + (idx % 4) * 0.25;
      tree.scale.setScalar(scale);
      tree.position.set(x, -0.35, z);
      tree.rotation.y = idx * 1.1;
      group.add(tree);
      this.natureTrees.push({ obj: tree, phase: idx * 0.7 });
    });

    // Floating sunlit fireflies
    const count = 80;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 34;
      positions[i * 3 + 1] = 0.8 + Math.random() * 6.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const fireflyGeo = new THREE.BufferGeometry();
    fireflyGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const fireflyMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.22,
      transparent: true,
      opacity: 0.85,
    });
    this.fireflies = new THREE.Points(fireflyGeo, fireflyMat);
    group.add(this.fireflies);

    return group;
  }

  _buildMallGroup() {
    const group = new THREE.Group();
    const atriumFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({
        map: makeCheckerTexture("#2b1c47", "#1e1233", 28),
        roughness: 0.25,
        metalness: 0.2,
      })
    );
    atriumFloor.rotation.x = -Math.PI / 2;
    atriumFloor.position.y = -0.35;
    atriumFloor.receiveShadow = true;
    group.add(atriumFloor);

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
      planter.scale.setScalar(1.1);
      planter.position.set(x, -0.35, z);
      planter.rotation.y = idx * 0.6;
      group.add(planter);
    });

    // Overhead glowing retro neon arches
    this.mallArches = [];
    const archColors = [0xff2e93, 0x06b6d4, 0xa855f7, 0xff2e93];
    [-12, -5, 2, 9].forEach((z, idx) => {
      const archGeo = new THREE.TorusGeometry(13.5, 0.16, 12, 48, Math.PI);
      const archMat = new THREE.MeshStandardMaterial({
        color: archColors[idx],
        emissive: archColors[idx],
        emissiveIntensity: 1.8,
        roughness: 0.2,
      });
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.set(0, -0.35, z);
      group.add(arch);
      this.mallArches.push(arch);
    });

    // Storefront neon billboards in the back
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(28, 7, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x1c1230, roughness: 0.5 })
    );
    backWall.position.set(0, 3.1, -17);
    group.add(backWall);

    const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(22, 0.35, 0.25), signMat);
    neonStrip.position.set(0, 5.2, -16.6);
    group.add(neonStrip);

    return group;
  }

  _buildSpaceGroup() {
    const group = new THREE.Group();

    // Deep starfield
    const starCount = 700;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 38 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.35 });
    this.stars = new THREE.Points(starGeo, starMat);
    group.add(this.stars);

    // Ringed alien planet in backdrop
    const planetGroup = new THREE.Group();
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(6.5, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.35,
        roughness: 0.55,
      })
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(8.5, 11.8, 48),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      })
    );
    ring.rotation.x = Math.PI / 2.6;
    ring.rotation.y = 0.3;
    planetGroup.add(planet, ring);
    planetGroup.position.set(-14, 9, -32);
    group.add(planetGroup);
    this.planetGroup = planetGroup;

    // Blender orbital satellites floating around the deck
    this.satellites = [];
    const satCoords = [
      [-13.5, 4.5, -8],
      [13.5, 5.2, -5],
      [12.5, 3.8, 6],
      [-12.5, 3.5, 5],
    ];
    satCoords.forEach(([x, y, z], idx) => {
      const sat = this._cloneProp("satellite_space", () => {
        return new THREE.Mesh(
          new THREE.OctahedronGeometry(0.9),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8 })
        );
      });
      sat.scale.setScalar(1.25);
      sat.position.set(x, y, z);
      group.add(sat);
      this.satellites.push({ obj: sat, baseY: y, phase: idx * 1.4 });
    });

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

  update(time) {
    if (this.currentWorld === "nature") {
      this.natureTrees.forEach(({ obj, phase }) => {
        obj.rotation.z = Math.sin(time * 1.3 + phase) * 0.03;
      });
      if (this.fireflies) {
        this.fireflies.position.y = Math.sin(time * 1.4) * 0.35;
      }
    } else if (this.currentWorld === "mall") {
      this.mallArches.forEach((arch, idx) => {
        arch.material.emissiveIntensity = 1.4 + Math.sin(time * 3.0 + idx) * 0.45;
      });
    } else if (this.currentWorld === "space") {
      if (this.stars) this.stars.rotation.y = time * 0.012;
      if (this.planetGroup) this.planetGroup.rotation.y = time * 0.08;
      this.satellites.forEach(({ obj, baseY, phase }) => {
        obj.position.y = baseY + Math.sin(time * 1.6 + phase) * 0.55;
        obj.rotation.y = time * 0.5 + phase;
        obj.rotation.z = Math.sin(time * 0.9 + phase) * 0.2;
      });
    }
  }
}
