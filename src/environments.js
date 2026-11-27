/**
 * Manages the 3 toggleable, deeply 3D environments for Bricks 3D:
 *   1. Nature Glade (Golden-hour sunlit glade, organic sculpted hills, carved mossy stone archway, Blender trees, fireflies, mushroom bumpers)
 *   2. Neon Retro Mall (Luxury twilight mall atrium, vaulted glass skylight, veined marble columns with brass capitals, dual warm/cool lighting, warp portals)
 *   3. Orbital Station (Cosmic nebula backdrop, procedural banded gas-giant with multi-band rings, structural hull trusses, satellites, gravity well)
 */

import * as THREE from "three";
import {
  makeNatureFloorMaps,
  makeMossyStoneMaps,
  makeMallTerrazzoMaps,
  makeMarbleMaps,
  makeSpaceDeckMaps,
  makeGasGiantTexture,
  makePlanetRingTexture,
  makeSkyDomeTexture,
  makeSpaceNebulaSkyTexture,
  makeSunGlowTexture,
} from "./textures.js";

export const WORLD_CONFIGS = {
  nature: {
    id: "nature",
    label: "NATURE GLADE",
    skyColor: 0x8ec2e6,
    fogColor: 0xf1cfa0,
    fogDensity: 0.0095,
    ambientColor: 0xfde8c8,
    ambientIntensity: 0.85,
    sunColor: 0xffcf87,
    sunIntensity: 2.25,
    sunPos: [20, 18, 12],
    rimColor: 0xffb347,
    rimIntensity: 1.75,
    fillColor: 0x9bd69e,
    fillIntensity: 0.65,
    hemiSky: 0xffe2b0,
    hemiGround: 0x3b4f2b,
    hemiIntensity: 0.95,
    envIntensity: 0.52,
    floorColor: 0x62804a,
    floorRoughness: 0.86,
    floorMetalness: 0.04,
    railColor: 0x6e4e34,
    railEmissive: 0x1c1208,
    paddleGlow: 0x84cc16,
    ballColor: 0xfde68a,
    mechanicLabel: "MUSHROOM BUMPERS · WIND GUSTS",
    gravity: 14.5,
    // Natural earthy-mineral masonry: terracotta, carved sandstone, moss jade, river slate, warm amber, river-blue
    brickPalette: [0xc95a3c, 0xd49a47, 0x4c8559, 0x566c7a, 0xc27732, 0x447c87],
  },
  mall: {
    id: "mall",
    label: "NEON MALL",
    skyColor: 0x18102e,
    fogColor: 0x22153d,
    fogDensity: 0.0115,
    ambientColor: 0xf3e4ff,
    ambientIntensity: 0.78,
    sunColor: 0xffe6c7,
    sunIntensity: 1.55,
    sunPos: [10, 26, 14],
    rimColor: 0x06b6d4,
    rimIntensity: 2.1,
    fillColor: 0xf472b6,
    fillIntensity: 1.4,
    hemiSky: 0x8b6bb8,
    hemiGround: 0x46325e,
    hemiIntensity: 0.78,
    envIntensity: 0.92,
    floorColor: 0xffffff,
    floorRoughness: 0.14,
    floorMetalness: 0.24,
    railColor: 0xd4af37,
    railEmissive: 0x3d1832,
    paddleGlow: 0xf472b6,
    ballColor: 0x67e8f9,
    mechanicLabel: "NEON WARP PORTALS",
    gravity: 14.5,
    // Refined glossy lacquered ceramic & glass palette
    brickPalette: [0xe83b84, 0x9b5de5, 0x00bbf9, 0xf4c44e, 0xfb6f92, 0x2ec4b6],
  },
  space: {
    id: "space",
    label: "ORBITAL STATION",
    skyColor: 0x020611,
    fogColor: 0x060f24,
    fogDensity: 0.0072,
    ambientColor: 0x93c5fd,
    ambientIntensity: 0.68,
    sunColor: 0xe8f4ff,
    sunIntensity: 1.95,
    sunPos: [18, 22, 12],
    rimColor: 0x38bdf8,
    rimIntensity: 2.4,
    fillColor: 0x818cf8,
    fillIntensity: 1.05,
    hemiSky: 0x60a5fa,
    hemiGround: 0x0f172a,
    hemiIntensity: 0.52,
    envIntensity: 1.05,
    floorColor: 0x9fb3cc,
    floorRoughness: 0.3,
    floorMetalness: 0.8,
    railColor: 0x475569,
    railEmissive: 0x0369a1,
    paddleGlow: 0x38bdf8,
    ballColor: 0xf0f9ff,
    mechanicLabel: "LOW-G ARCS · GRAVITY WELL",
    gravity: 7.4,
    // Brushed anodized titanium aerospace alloys
    brickPalette: [0x4cc9f0, 0x6366f1, 0xa78bfa, 0x2dd4bf, 0xf43f5e, 0xf59e0b],
  },
};

/** Build a smooth, organically sculpted rolling hill mesh (replaces pointy cones) */
function createOrganicHill(radiusX, height, radiusZ, seed, material) {
  const geo = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.54);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Smooth organic ridgeline undulation strongest near the crown, tapering to ground
    const crownMask = Math.max(0, y);
    const undulation =
      1.0 +
      0.16 * Math.sin(x * 3.1 + seed) * Math.cos(z * 2.7 - seed * 0.7) * crownMask +
      0.09 * Math.sin((x + z) * 5.2 + seed * 1.3) * crownMask;
    pos.setXYZ(i, x * radiusX * undulation, y * height * undulation, z * radiusZ * undulation);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return mesh;
}

/** Build a radial-UV planetary ring geometry so concentric bands map accurately */
function createPlanetaryRingGeometry(innerR, outerR, segments = 72) {
  const geo = new THREE.RingGeometry(innerR, outerR, segments, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const span = outerR - innerR;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.hypot(x, y);
    const u = THREE.MathUtils.clamp((r - innerR) / span, 0, 1);
    uv.setXY(i, u, 0.5);
  }
  return geo;
}

export class EnvironmentManager {
  constructor(scene, arena, models) {
    this.scene = scene;
    this.arena = arena;
    this.models = models;
    this.currentWorld = "nature";

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(this.ambientLight);

    // Realistic sky-to-ground hemisphere bounce lighting
    this.hemiLight = new THREE.HemisphereLight(0xffe2b0, 0x3b4f2b, 0.95);
    this.scene.add(this.hemiLight);

    // Primary key directional light with crisp soft shadows
    this.sunLight = new THREE.DirectionalLight(0xffcf87, 2.25);
    this.sunLight.position.set(20, 18, 12);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.022;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 80;
    const d = 26;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Back-horizon rim light for silhouette separation & world mood
    this.rimLight = new THREE.PointLight(0xffb347, 1.75, 68);
    this.rimLight.position.set(6, 10, -17);
    this.scene.add(this.rimLight);

    // Secondary cross-fill / dappled bounce light for true 3-point illumination
    this.fillLight = new THREE.PointLight(0x9bd69e, 0.65, 58);
    this.fillLight.position.set(-14, 9, 10);
    this.scene.add(this.fillLight);

    // Atmospheric gradient & cosmic nebula sky domes
    this.skyTextures = {
      nature: makeSkyDomeTexture("#2b6cb0", "#7eb0da", "#f6cb8d", "#3b4f2b"),
      mall: makeSkyDomeTexture("#0b071c", "#1d123d", "#432266", "#140b26"),
      space: makeSpaceNebulaSkyTexture(),
    };
    this.skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(125, 36, 24),
      new THREE.MeshBasicMaterial({ map: this.skyTextures.nature, side: THREE.BackSide, fog: false })
    );
    this.scene.add(this.skyDome);

    this.floorMaps = {
      nature: makeNatureFloorMaps(5),
      mall: makeMallTerrazzoMaps(6, false),
      space: makeSpaceDeckMaps(6),
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
    const groundMaps = makeNatureFloorMaps(22);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(210, 210),
      new THREE.MeshStandardMaterial({
        map: groundMaps.map,
        bumpMap: groundMaps.bumpMap,
        bumpScale: 0.14,
        roughness: 0.92,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.35;
    ground.receiveShadow = true;
    group.add(ground);

    // Golden-hour glowing sun disc & warm atmospheric corona low on the horizon
    const sunGroup = new THREE.Group();
    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff7dc, fog: false })
    );
    const sunHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeSunGlowTexture(),
        color: 0xffd584,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    sunHalo.scale.set(34, 34, 1);
    sunGroup.add(sunDisc, sunHalo);
    sunGroup.position.set(28, 17, -68);
    group.add(sunGroup);
    this.natureSun = sunGroup;

    // Soft drifting golden-hour backlit clouds
    this.natureClouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xfff3de,
      emissive: 0x5c3618,
      emissiveIntensity: 0.18,
      roughness: 0.96,
      metalness: 0.0,
      transparent: true,
      opacity: 0.86,
    });
    [[-26, 22, -44], [14, 24, -52], [-8, 27, -60], [36, 20, -40]].forEach(([x, y, z], idx) => {
      const cGroup = new THREE.Group();
      [[0, 0, 0, 4.4], [-3.4, -0.5, 0.5, 3.1], [3.6, -0.4, -0.3, 3.3], [0.9, 1.0, -0.6, 2.9]].forEach(([ox, oy, oz, r]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), cloudMat);
        puff.position.set(ox, oy, oz);
        puff.scale.set(1.3, 0.58, 0.9);
        cGroup.add(puff);
      });
      cGroup.position.set(x, y, z);
      group.add(cGroup);
      this.natureClouds.push({ obj: cGroup, baseX: x, speed: 0.35 + idx * 0.1 });
    });

    // Smooth organic sculpted rolling hills & misty distant mountain ridges
    const nearHillMat = new THREE.MeshStandardMaterial({ color: 0x3b6334, roughness: 0.92, metalness: 0.02 });
    const midHillMat = new THREE.MeshStandardMaterial({ color: 0x4d7042, roughness: 0.9, metalness: 0.02 });
    const farRidgeMat = new THREE.MeshStandardMaterial({ color: 0x6d8270, roughness: 0.88, metalness: 0.02 });
    const hillSpecs = [
      [-28, -24, 18, 7.2, 15, 1.1, nearHillMat],
      [27, -26, 19, 8.2, 16, 2.4, nearHillMat],
      [-37, -3, 15, 5.8, 16, 3.7, nearHillMat],
      [37, -1, 16, 6.2, 15, 4.9, nearHillMat],
      [-12, -38, 24, 11.5, 18, 5.5, midHillMat],
      [18, -42, 26, 12.2, 19, 6.8, midHillMat],
      [0, -56, 38, 16.5, 22, 8.1, farRidgeMat],
    ];
    hillSpecs.forEach(([x, z, rx, h, rz, seed, mat]) => {
      const hill = createOrganicHill(rx, h, rz, seed, mat);
      hill.position.set(x, -0.5, z);
      group.add(hill);
    });

    // Carved ancient mossy stone ruin archway framing the back of the 3D court
    const mossyMaps = makeMossyStoneMaps(2);
    const stoneMat = new THREE.MeshStandardMaterial({
      map: mossyMaps.map,
      bumpMap: mossyMaps.bumpMap,
      bumpScale: 0.12,
      roughness: 0.88,
      metalness: 0.04,
    });
    const mossAccentMat = new THREE.MeshStandardMaterial({
      color: 0x457038,
      roughness: 0.94,
    });

    const archGroup = new THREE.Group();
    [-10.8, 10.8].forEach((px) => {
      // Stepped stone plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.1, 2.5), stoneMat);
      plinth.position.set(px, 0.2, -13.5);
      plinth.castShadow = true;
      plinth.receiveShadow = true;

      // Tapered carved pillar shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.02, 7.2, 8), stoneMat);
      shaft.position.set(px, 4.3, -13.5);
      shaft.rotation.y = Math.PI / 8;
      shaft.castShadow = true;
      shaft.receiveShadow = true;

      // Carved stone capital
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.85, 2.35), stoneMat);
      cap.position.set(px, 8.1, -13.5);
      cap.castShadow = true;

      archGroup.add(plinth, shaft, cap);
    });

    // Segmented carved stone lintel & central raised keystone
    const lintelMain = new THREE.Mesh(new THREE.BoxGeometry(24.6, 1.35, 2.05), stoneMat);
    lintelMain.position.set(0, 9.1, -13.5);
    lintelMain.castShadow = true;
    const lintelCrown = new THREE.Mesh(new THREE.BoxGeometry(25.4, 0.45, 2.35), stoneMat);
    lintelCrown.position.set(0, 9.95, -13.5);
    lintelCrown.castShadow = true;
    const keystone = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.85, 2.45), stoneMat);
    keystone.position.set(0, 9.25, -13.5);
    keystone.castShadow = true;
    archGroup.add(lintelMain, lintelCrown, keystone);

    // Organic creeping moss cushions along the top of the ruin lintel
    [[-8.5, 10.22, -13.4, 1.4], [-3.2, 10.2, -13.6, 1.1], [4.6, 10.22, -13.5, 1.3], [9.4, 10.18, -13.4, 1.0]].forEach(
      ([mx, my, mz, r]) => {
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mossAccentMat);
        tuft.scale.set(1.4, 0.35, 0.85);
        tuft.position.set(mx, my, mz);
        archGroup.add(tuft);
      }
    );
    group.add(archGroup);

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
          new THREE.MeshStandardMaterial({ color: 0x2c5c33, roughness: 0.9 })
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

    // Floating sunlit 3D mossy stones & golden fireflies
    this.floatingNatureRocks = [];
    const rockCoords = [[-16, 7.5, -14], [16, 8.2, -12], [-15, 6.2, 4], [15, 6.8, 3]];
    rockCoords.forEach(([x, y, z], idx) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), stoneMat);
      rock.scale.set(1.15, 0.85, 1.0);
      rock.position.set(x, y, z);
      rock.castShadow = true;
      group.add(rock);
      this.floatingNatureRocks.push({ obj: rock, baseY: y, phase: idx * 1.5 });
    });

    const count = 115;
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
      new THREE.PointsMaterial({ color: 0xfde047, size: 0.25, transparent: true, opacity: 0.92 })
    );
    group.add(this.fireflies);

    // Interactive 3D Mushroom Bumpers on the Nature Glade court
    this.natureBumpers = [];
    [[-4.4, 0.2], [4.4, 0.2]].forEach(([x, z]) => {
      const bumper = this._cloneProp("mushroom_bumper", () => {
        const g = new THREE.Group();
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.8, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xc95a3c, roughness: 0.65 })
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

    // Luxury dark-plaza speckled terrazzo atrium floor surrounding the main court
    const outerTerrazzo = makeMallTerrazzoMaps(22, true);
    const atriumFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshStandardMaterial({
        map: outerTerrazzo.map,
        roughnessMap: outerTerrazzo.roughnessMap,
        roughness: 0.2,
        metalness: 0.24,
      })
    );
    atriumFloor.rotation.x = -Math.PI / 2;
    atriumFloor.position.y = -0.35;
    atriumFloor.receiveShadow = true;
    group.add(atriumFloor);

    // Architectural materials: veined marble, brushed luxury brass, twilight skylight glass, warm sconces
    const marbleMaps = makeMarbleMaps(2);
    const marbleMat = new THREE.MeshStandardMaterial({
      map: marbleMaps.map,
      roughness: 0.26,
      metalness: 0.08,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd9b35c,
      roughness: 0.22,
      metalness: 0.88,
    });
    const balconyMat = new THREE.MeshStandardMaterial({
      color: 0x24173c,
      roughness: 0.36,
      metalness: 0.28,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: 0.34,
      roughness: 0.08,
      metalness: 0.1,
    });
    const neonTrimMat = new THREE.MeshStandardMaterial({
      color: 0xff2e93,
      emissive: 0xff2e93,
      emissiveIntensity: 1.75,
    });
    const sconceMat = new THREE.MeshStandardMaterial({
      color: 0xfff1d6,
      emissive: 0xffc978,
      emissiveIntensity: 2.2,
      roughness: 0.15,
    });

    // 2-story Luxury Mall Atrium Balconies with veined marble columns & brass capitals
    [-15.2, 15.2].forEach((x) => {
      const innerSign = x < 0 ? 1 : -1;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.72, 38), balconyMat);
      deck.position.set(x, 4.8, -2);
      deck.castShadow = true;
      deck.receiveShadow = true;
      group.add(deck);

      // Glass balustrade + brushed brass top handrail
      const glassRail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.35, 38), glassMat);
      glassRail.position.set(x + innerSign * 2.1, 5.82, -2);
      group.add(glassRail);

      const brassRail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 38), brassMat);
      brassRail.position.set(x + innerSign * 2.1, 6.54, -2);
      group.add(brassRail);

      // Crisp magenta neon fascia trim
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 38), neonTrimMat);
      trim.position.set(x + innerSign * 2.22, 4.55, -2);
      group.add(trim);

      // Fluted marble columns with brushed brass plinths, capitals & warm atrium sconces
      [-14, -4, 6].forEach((z) => {
        const colX = x + innerSign * 1.45;
        const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 11.4, 16), marbleMat);
        colShaft.position.set(colX, 5.4, z);
        colShaft.castShadow = true;
        colShaft.receiveShadow = true;
        group.add(colShaft);

        const colBase = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.55, 16), brassMat);
        colBase.position.set(colX, -0.05, z);
        group.add(colBase);

        const colCap = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.52, 0.55, 16), brassMat);
        colCap.position.set(colX, 11.2, z);
        group.add(colCap);

        // Warm golden architectural sconce fixture on each column
        const sconce = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), sconceMat);
        sconce.scale.set(0.85, 1.3, 0.85);
        sconce.position.set(colX + innerSign * 0.56, 3.6, z);
        group.add(sconce);
      });
    });

    // Grand Vaulted Twilight Skylight Canopy overhead (mullion ribs + glowing skylight glass panes)
    const skylightGlassMat = new THREE.MeshBasicMaterial({
      color: 0x3b2a66,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
    });
    const mullionMat = new THREE.MeshStandardMaterial({
      color: 0x2c223f,
      roughness: 0.32,
      metalness: 0.8,
    });
    const skylightVault = new THREE.Mesh(
      new THREE.CylinderGeometry(16.2, 16.2, 40, 20, 1, true, -Math.PI * 0.42, Math.PI * 0.84),
      skylightGlassMat
    );
    skylightVault.rotation.z = Math.PI / 2;
    skylightVault.rotation.y = Math.PI / 2;
    skylightVault.position.set(0, 11.4, -2);
    group.add(skylightVault);

    // Longitudinal skylight ridge beam + glowing warm twilight skylight strips
    [-5.5, 0, 5.5].forEach((rx) => {
      const yOff = Math.sqrt(Math.max(0, 16.2 * 16.2 - rx * rx));
      const purlin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 40), mullionMat);
      purlin.position.set(rx, 11.4 + yOff - 0.15, -2);
      group.add(purlin);
    });
    // Subtle warm atrium skylight bounce strip along crown
    const crownGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 38),
      new THREE.MeshBasicMaterial({ color: 0xffd7a8, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
    );
    crownGlow.rotation.x = Math.PI / 2;
    crownGlow.position.set(0, 27.1, -2);
    group.add(crownGlow);

    // Dual warm/cool atrium accent lights (warm sconce bounce + crisp neon reflections on terrazzo)
    const warmSconceLeft = new THREE.PointLight(0xffcb85, 2.2, 34);
    warmSconceLeft.position.set(-12.5, 4.2, -2);
    const warmSconceRight = new THREE.PointLight(0xffcb85, 2.2, 34);
    warmSconceRight.position.set(12.5, 4.2, -2);
    group.add(warmSconceLeft, warmSconceRight);

    // Blender mall palm planters flanking the court
    const planterPositions = [
      [-11.8, -10], [-11.8, -3], [-11.8, 4], [-11.8, 10],
      [11.8, -10], [11.8, -3], [11.8, 4], [11.8, 10],
    ];
    planterPositions.forEach(([x, z], idx) => {
      const planter = this._cloneProp("planter_mall", () => {
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 0.8, 1.2, 12),
          marbleMat
        );
        mesh.position.y = 0.6;
        return mesh;
      });
      planter.scale.setScalar(1.15);
      planter.position.set(x, -0.35, z);
      planter.rotation.y = idx * 0.6;
      group.add(planter);
    });

    // Overhead glowing retro neon arches framed with subtle brass rings
    this.mallArches = [];
    const archColors = [0xff2e93, 0x06b6d4, 0xa855f7, 0xff2e93];
    [-12, -5, 2, 9].forEach((z, idx) => {
      const archGeo = new THREE.TorusGeometry(14.0, 0.18, 12, 48, Math.PI);
      const archMat = new THREE.MeshStandardMaterial({
        color: archColors[idx],
        emissive: archColors[idx],
        emissiveIntensity: 1.85,
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
        new THREE.OctahedronGeometry(1.1),
        new THREE.MeshStandardMaterial({
          color: idx % 2 === 0 ? 0x06b6d4 : 0xff2e93,
          emissive: idx % 2 === 0 ? 0x06b6d4 : 0xff2e93,
          emissiveIntensity: 1.25,
          wireframe: true,
        })
      );
      cube.position.set(x, y, z);
      group.add(cube);
      this.mallCubes.push({ obj: cube, baseY: y, phase: idx * 1.4 });
    });

    // Back luxury arcade storefront facade with marble pilasters & warm/cyan cornice
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(34, 11.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x1b1230, roughness: 0.42, metalness: 0.18 })
    );
    backWall.position.set(0, 5.2, -17.5);
    group.add(backWall);

    const brassCornice = new THREE.Mesh(new THREE.BoxGeometry(34.4, 0.45, 1.2), brassMat);
    brassCornice.position.set(0, 10.8, -17.3);
    group.add(brassCornice);

    const neonStrip = new THREE.Mesh(
      new THREE.BoxGeometry(26, 0.34, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.9 })
    );
    neonStrip.position.set(0, 7.6, -17.0);
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

    // Deep multi-layered starfield
    const starCount = 950;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 42 + Math.random() * 58;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xe2f1ff, size: 0.36, transparent: true, opacity: 0.92 })
    );
    group.add(this.stars);

    // Structural Orbital Station Hull Trusses framing the arena deck
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.84,
      roughness: 0.34,
    });
    const beaconCyanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.2,
    });
    const beaconAmberMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.9,
    });

    [-12.2, 12.2].forEach((sideX) => {
      const sideSign = sideX < 0 ? -1 : 1;
      // Main longitudinal hull girder
      const lowerBeam = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 28), trussMat);
      lowerBeam.position.set(sideX, -0.1, -1);
      const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 26), trussMat);
      upperBeam.position.set(sideX + sideSign * 1.4, 5.2, -1);
      group.add(lowerBeam, upperBeam);

      // Angled structural station ribs & diagonal cross-bracing
      [-11, -5, 1, 7].forEach((z, i) => {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.36, 5.9, 0.36), trussMat);
        rib.position.set(sideX + sideSign * 0.7, 2.55, z);
        rib.rotation.z = -sideSign * 0.24;
        group.add(rib);

        // Diagonal cross-brace connecting adjacent bays
        if (i < 3) {
          const brace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 7.6), trussMat);
          brace.position.set(sideX + sideSign * 0.7, 2.6, z + 3);
          brace.rotation.x = i % 2 === 0 ? 0.65 : -0.65;
          group.add(brace);
        }

        // Navigation beacon light on each rib node
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 8, 8),
          i % 2 === 0 ? beaconCyanMat : beaconAmberMat
        );
        beacon.position.set(sideX + sideSign * 1.15, 5.2, z);
        group.add(beacon);
      });
    });

    // Rear orbital bay gantry header bridging the station deck
    const rearHeader = new THREE.Mesh(new THREE.BoxGeometry(28.2, 0.52, 0.65), trussMat);
    rearHeader.position.set(0, 10.6, -15.5);
    group.add(rearHeader);

    // 3D Glowing Warp Gate behind the court
    this.warpGate = new THREE.Mesh(
      new THREE.TorusGeometry(6.8, 0.3, 16, 56),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 2.0,
        metalness: 0.82,
        roughness: 0.2,
      })
    );
    this.warpGate.position.set(0, 6.2, -18.5);
    group.add(this.warpGate);

    // Procedural Banded Gas-Giant Planet with Atmospheric Rim & Multi-Band Translucent Rings
    const planetGroup = new THREE.Group();
    const gasGiantTex = makeGasGiantTexture();
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(8.4, 48, 36),
      new THREE.MeshStandardMaterial({
        map: gasGiantTex,
        roughness: 0.72,
        metalness: 0.05,
        emissive: 0x1c2b45,
        emissiveIntensity: 0.16,
      })
    );
    // Subtle atmospheric scattering halo shell
    const atmoHalo = new THREE.Mesh(
      new THREE.SphereGeometry(8.85, 36, 28),
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    const ringGeo = createPlanetaryRingGeometry(10.6, 16.8, 72);
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshStandardMaterial({
        map: makePlanetRingTexture(),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        roughness: 0.65,
        metalness: 0.1,
        emissive: 0x38587a,
        emissiveIntensity: 0.22,
        depthWrite: false,
      })
    );
    ring.rotation.x = Math.PI / 2.45;
    ring.rotation.y = 0.28;

    planetGroup.add(planet, atmoHalo, ring);
    planetGroup.position.set(-16.5, 11.5, -38);
    planetGroup.rotation.z = -0.18;
    group.add(planetGroup);
    this.planetGroup = planetGroup;

    // Blender orbital satellites floating at varied 3D heights
    this.satellites = [];
    const satCoords = [
      [-13.5, 5.6, -8],
      [13.5, 6.6, -5],
      [12.8, 4.4, 6],
      [-12.8, 4.0, 5],
      [0, 11.6, -10],
    ];
    satCoords.forEach(([x, y, z], idx) => {
      const sat = this._cloneProp("satellite_space", () => {
        return new THREE.Mesh(
          new THREE.OctahedronGeometry(0.9),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.85, roughness: 0.25 })
        );
      });
      sat.scale.setScalar(1.3);
      sat.position.set(x, y, z);
      group.add(sat);
      this.satellites.push({ obj: sat, baseY: y, phase: idx * 1.4 });
    });

    // Tumbling 3D metallic-silicate asteroids
    this.asteroids = [];
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.84, metalness: 0.35 });
    [[-19, 9.5, -18], [20, 8.2, -16], [-18, 2.8, -14], [19, 3.8, 2]].forEach(([x, y, z], idx) => {
      const ast = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), rockMat);
      ast.scale.set(1.15, 0.82, 0.95);
      ast.position.set(x, y, z);
      group.add(ast);
      this.asteroids.push({ obj: ast, speed: 0.4 + idx * 0.15 });
    });

    // Interactive Central 3D Gravity Well on the Orbital Station court
    const wellGroup = new THREE.Group();
    const wellCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 20, 20),
      new THREE.MeshStandardMaterial({
        color: 0x818cf8,
        emissive: 0x6366f1,
        emissiveIntensity: 2.2,
        transparent: true,
        opacity: 0.85,
      })
    );
    const wellRingA = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.06, 10, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
    );
    wellRingA.rotation.x = Math.PI / 2;
    const wellRingB = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.04, 10, 36),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.4 })
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
    this.scene.environmentIntensity = cfg.envIntensity ?? 0.72;

    if (this.skyDome && this.skyTextures[cfg.id]) {
      this.skyDome.material.map = this.skyTextures[cfg.id];
      this.skyDome.material.needsUpdate = true;
    }

    this.ambientLight.color.setHex(cfg.ambientColor);
    this.ambientLight.intensity = cfg.ambientIntensity * 0.5;
    if (this.hemiLight) {
      this.hemiLight.color.setHex(cfg.hemiSky ?? cfg.skyColor);
      this.hemiLight.groundColor.setHex(cfg.hemiGround ?? cfg.floorColor);
      this.hemiLight.intensity = cfg.hemiIntensity ?? 0.8;
    }
    this.sunLight.color.setHex(cfg.sunColor);
    this.sunLight.intensity = cfg.sunIntensity;
    if (cfg.sunPos) {
      this.sunLight.position.set(cfg.sunPos[0], cfg.sunPos[1], cfg.sunPos[2]);
    }
    this.rimLight.color.setHex(cfg.rimColor);
    this.rimLight.intensity = cfg.rimIntensity;
    if (this.fillLight) {
      this.fillLight.color.setHex(cfg.fillColor ?? cfg.ambientColor);
      this.fillLight.intensity = cfg.fillIntensity ?? 0.6;
    }

    Object.entries(this.worldGroups).forEach(([k, g]) => {
      g.visible = k === cfg.id;
    });

    if (arenaMeshes) {
      const fMaps = this.floorMaps[cfg.id];
      arenaMeshes.floor.material.color.setHex(cfg.floorColor);
      arenaMeshes.floor.material.map = fMaps.map;
      arenaMeshes.floor.material.bumpMap = fMaps.bumpMap || null;
      arenaMeshes.floor.material.bumpScale = fMaps.bumpMap ? 0.09 : 0;
      arenaMeshes.floor.material.roughnessMap = fMaps.roughnessMap || null;
      arenaMeshes.floor.material.roughness = cfg.floorRoughness;
      arenaMeshes.floor.material.metalness = cfg.floorMetalness;
      arenaMeshes.floor.material.needsUpdate = true;

      arenaMeshes.rails.forEach((rail) => {
        rail.material.color.setHex(cfg.railColor);
        rail.material.emissive.setHex(cfg.railEmissive);
        rail.material.roughness = cfg.id === "nature" ? 0.72 : cfg.id === "mall" ? 0.2 : 0.26;
        rail.material.metalness = cfg.id === "nature" ? 0.08 : cfg.id === "mall" ? 0.84 : 0.78;
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
      if (this.natureClouds) {
        this.natureClouds.forEach((c) => {
          c.obj.position.x = c.baseX + Math.sin(time * 0.08 * c.speed) * 8;
        });
      }
    } else if (this.currentWorld === "mall") {
      this.mallArches.forEach((arch, idx) => {
        arch.material.emissiveIntensity = 1.4 + Math.sin(time * 3.0 + idx) * 0.45;
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
      if (this.stars) this.stars.rotation.y = time * 0.01;
      if (this.planetGroup) this.planetGroup.rotation.y = time * 0.045;
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
