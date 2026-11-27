/**
 * Realistic 3D fracture, debris, sparks, and dust-puff physics engine (cannon-es + Three.js).
 * Breaks bricks into varied jagged 3D chunks (halves, wedges, splinters, rubble) matching
 * the world's PBR surface material, accompanied by directional sparks and dust clouds.
 */

import * as THREE from "three";
import * as CANNON from "cannon-es";

function makeJaggedGeo(baseGeo, jitter = 0.05) {
  const geo = baseGeo.index ? baseGeo.toNonIndexed() : baseGeo.clone();
  const pos = geo.attributes.position;
  // Deterministic vertex-welded jitter so shared corners stay watertight
  const offsets = new Map();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(z * 100)}`;
    if (!offsets.has(key)) {
      offsets.set(key, [
        (Math.random() - 0.5) * jitter,
        (Math.random() - 0.5) * jitter,
        (Math.random() - 0.5) * jitter,
      ]);
    }
    const [ox, oy, oz] = offsets.get(key);
    pos.setXYZ(i, x + ox, y + oy, z + oz);
  }
  geo.computeVertexNormals();
  return geo;
}

export class DebrisPhysics {
  constructor(scene, arenaHalfW, arenaHalfD) {
    this.scene = scene;
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -26, 0),
    });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 6;

    const bounceMat = new CANNON.Material("debris");
    const floorPhysMat = new CANNON.Material("floor");
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(bounceMat, floorPhysMat, {
        friction: 0.42,
        restitution: 0.48,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(bounceMat, bounceMat, {
        friction: 0.35,
        restitution: 0.4,
      })
    );
    this.debrisMat = bounceMat;

    // Arena floor plane
    const floorBody = new CANNON.Body({
      mass: 0,
      material: floorPhysMat,
      shape: new CANNON.Plane(),
    });
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    floorBody.position.set(0, 0, 0);
    this.world.addBody(floorBody);

    // Side & back walls so shards ricochet inside the 3D court
    const addWall = (pos, euler) => {
      const b = new CANNON.Body({ mass: 0, material: floorPhysMat, shape: new CANNON.Plane() });
      b.position.set(...pos);
      b.quaternion.setFromEuler(...euler);
      this.world.addBody(b);
    };
    addWall([-arenaHalfW, 0, 0], [0, Math.PI / 2, 0]);
    addWall([arenaHalfW, 0, 0], [0, -Math.PI / 2, 0]);
    addWall([0, 0, -arenaHalfD], [0, 0, 0]);

    // Pre-build realistic fractured 3D chunk geometries (varied silhouettes)
    this.chunkTemplates = [
      {
        geo: makeJaggedGeo(new THREE.BoxGeometry(0.56, 0.38, 0.42, 2, 2, 2), 0.08),
        halfExtents: new CANNON.Vec3(0.28, 0.19, 0.21),
        mass: 0.7,
      },
      {
        geo: makeJaggedGeo(new THREE.BoxGeometry(0.42, 0.28, 0.34, 2, 1, 2), 0.07),
        halfExtents: new CANNON.Vec3(0.21, 0.14, 0.17),
        mass: 0.45,
      },
      {
        geo: makeJaggedGeo(new THREE.DodecahedronGeometry(0.22, 0), 0.06),
        halfExtents: new CANNON.Vec3(0.18, 0.18, 0.18),
        mass: 0.35,
      },
      {
        geo: makeJaggedGeo(new THREE.BoxGeometry(0.46, 0.14, 0.26, 2, 1, 1), 0.04),
        halfExtents: new CANNON.Vec3(0.23, 0.07, 0.13),
        mass: 0.25,
      },
      {
        geo: makeJaggedGeo(new THREE.TetrahedronGeometry(0.2, 0), 0.04),
        halfExtents: new CANNON.Vec3(0.14, 0.14, 0.14),
        mass: 0.18,
      },
    ];

    this.sparkGeo = new THREE.BoxGeometry(0.055, 0.055, 0.34);
    this.dustGeo = new THREE.IcosahedronGeometry(0.32, 1);

    this.shards = [];
    this.sparks = [];
    this.dustPuffs = [];
  }

  _makeShardMaterial(colorHex, opts = {}) {
    const { world = "nature", armored = false, tnt = false, brickPBR = null } = opts;

    if (tnt) {
      return new THREE.MeshStandardMaterial({
        color: 0x261816,
        emissive: 0xff5a1f,
        emissiveIntensity: 1.4,
        roughness: 0.65,
        metalness: 0.25,
        transparent: true,
        opacity: 1,
      });
    }

    if (armored) {
      return new THREE.MeshStandardMaterial({
        color: 0xb8c4d4,
        metalness: 0.88,
        roughness: 0.28,
        bumpMap: brickPBR?.armored?.bumpMap || null,
        bumpScale: 0.04,
        transparent: true,
        opacity: 1,
      });
    }

    if (world === "mall") {
      return new THREE.MeshPhysicalMaterial({
        color: colorHex,
        roughness: 0.14,
        metalness: 0.14,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        transparent: true,
        opacity: 1,
      });
    }

    if (world === "space") {
      return new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.26,
        metalness: 0.82,
        bumpMap: brickPBR?.space?.bumpMap || null,
        bumpScale: 0.03,
        emissive: colorHex,
        emissiveIntensity: 0.14,
        transparent: true,
        opacity: 1,
      });
    }

    // Nature Glade: rough chiseled stone / terracotta masonry
    return new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.84,
      metalness: 0.04,
      bumpMap: brickPBR?.nature?.bumpMap || null,
      bumpScale: 0.06,
      transparent: true,
      opacity: 1,
    });
  }

  spawnBrickShatter(position, colorHex, impactVel, count = 9, opts = {}) {
    const { world = "nature", armored = false, tnt = false } = opts;
    const baseMat = this._makeShardMaterial(colorHex, opts);

    // 1. Spawn fractured 3D rigid-body chunks distributed across the brick volume
    const totalChunks = tnt ? Math.max(12, count) : Math.max(9, count);
    for (let i = 0; i < totalChunks; i++) {
      // Mix of 2 larger broken halves + medium chunks + fast small splinters
      const tmplIdx =
        i < 2 ? 0 : i < 5 ? 1 : i < 7 ? 2 : i < 9 ? 3 : 4;
      const tmpl = this.chunkTemplates[tmplIdx];
      const mat = baseMat.clone();
      const mesh = new THREE.Mesh(tmpl.geo, mat);
      mesh.castShadow = i < 5;
      mesh.receiveShadow = true;

      // Distribute inside the actual brick footprint (1.5 x 0.6 x 0.8)
      const ox = (Math.random() - 0.5) * 1.35;
      const oy = (Math.random() - 0.5) * 0.45;
      const oz = (Math.random() - 0.5) * 0.68;

      const body = new CANNON.Body({
        mass: tmpl.mass,
        material: this.debrisMat,
        shape: new CANNON.Box(tmpl.halfExtents),
        position: new CANNON.Vec3(
          position.x + ox,
          Math.max(0.22, position.y + oy),
          position.z + oz
        ),
      });

      const burstMult = tnt ? 1.85 : tmplIdx >= 3 ? 1.35 : 0.9;
      body.velocity.set(
        impactVel.x * 0.32 + ox * 4.5 * burstMult + (Math.random() - 0.5) * 6.5 * burstMult,
        (3.5 + Math.random() * 6.2) * burstMult,
        impactVel.z * 0.32 + oz * 4.5 * burstMult + (Math.random() - 0.5) * 6.5 * burstMult
      );
      body.angularVelocity.set(
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18
      );

      this.world.addBody(body);
      this.scene.add(mesh);
      this.shards.push({
        mesh,
        body,
        life: 1.8 + Math.random() * 1.1,
      });
    }

    // 2. Spawn directional glowing sparks (welding sparks for Space/Armored, embers for TNT, neon for Mall)
    const sparkCount = tnt ? 18 : armored || world === "space" ? 12 : world === "mall" ? 9 : 5;
    const sparkColor = tnt
      ? 0xff8c2b
      : armored
        ? 0xfff3c4
        : world === "space"
          ? 0x7dd3fc
          : world === "mall"
            ? colorHex
            : 0xfde68a;

    for (let i = 0; i < sparkCount; i++) {
      const sMat = new THREE.MeshBasicMaterial({
        color: sparkColor,
        transparent: true,
        opacity: 1,
      });
      const sMesh = new THREE.Mesh(this.sparkGeo, sMat);
      const sx = position.x + (Math.random() - 0.5) * 0.9;
      const sy = Math.max(0.25, position.y + (Math.random() - 0.5) * 0.3);
      const sz = position.z + (Math.random() - 0.5) * 0.5;
      sMesh.position.set(sx, sy, sz);
      this.scene.add(sMesh);

      const speedBoost = tnt ? 1.7 : 1.15;
      this.sparks.push({
        mesh: sMesh,
        vx: (impactVel.x * 0.25 + (Math.random() - 0.5) * 13) * speedBoost,
        vy: (4.5 + Math.random() * 8.5) * speedBoost,
        vz: (impactVel.z * 0.25 + (Math.random() - 0.5) * 13) * speedBoost,
        life: 0.42 + Math.random() * 0.38,
        maxLife: 0.8,
      });
    }

    // 3. Spawn expanding dust / smoke puffs at fracture origin
    const dustCount = tnt ? 6 : world === "nature" ? 4 : 2;
    const dustColor = tnt
      ? 0x3b2c26
      : world === "nature"
        ? 0xd6c7ae
        : world === "mall"
          ? 0xf5d0fe
          : 0x93c5fd;

    for (let i = 0; i < dustCount; i++) {
      const dMat = new THREE.MeshStandardMaterial({
        color: dustColor,
        roughness: 0.95,
        metalness: 0,
        transparent: true,
        opacity: tnt ? 0.58 : 0.36,
        depthWrite: false,
      });
      const dMesh = new THREE.Mesh(this.dustGeo, dMat);
      dMesh.position.set(
        position.x + (Math.random() - 0.5) * 0.8,
        Math.max(0.3, position.y + (Math.random() - 0.5) * 0.25),
        position.z + (Math.random() - 0.5) * 0.5
      );
      dMesh.scale.setScalar(0.55 + Math.random() * 0.35);
      this.scene.add(dMesh);
      this.dustPuffs.push({
        mesh: dMesh,
        vx: (Math.random() - 0.5) * 2.2,
        vy: 1.2 + Math.random() * 1.6,
        vz: (Math.random() - 0.5) * 2.2,
        life: 0.55 + Math.random() * 0.35,
        maxLife: 0.9,
        baseOpacity: dMat.opacity,
      });
    }

    baseMat.dispose();

    // Performance caps for smooth 60fps on mobile & desktop
    while (this.shards.length > 125) {
      const oldest = this.shards.shift();
      this.world.removeBody(oldest.body);
      this.scene.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
    while (this.sparks.length > 140) {
      const oldest = this.sparks.shift();
      this.scene.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
    while (this.dustPuffs.length > 48) {
      const oldest = this.dustPuffs.shift();
      this.scene.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
  }

  update(dt) {
    const stepDt = Math.min(dt, 0.05);
    this.world.step(1 / 60, stepDt, 2);

    // Update rigid-body fractured chunks
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.life -= stepDt;
      s.mesh.position.copy(s.body.position);
      s.mesh.quaternion.copy(s.body.quaternion);

      if (s.life < 0.55) {
        const alpha = Math.max(0, s.life / 0.55);
        s.mesh.material.opacity = alpha;
        s.mesh.scale.setScalar(0.45 + 0.55 * alpha);
      }

      if (s.life <= 0) {
        this.world.removeBody(s.body);
        this.scene.remove(s.mesh);
        s.mesh.material.dispose();
        this.shards.splice(i, 1);
      }
    }

    // Update directional streaking sparks with floor bounce
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life -= stepDt;
      sp.vy -= 22 * stepDt;
      sp.mesh.position.x += sp.vx * stepDt;
      sp.mesh.position.y += sp.vy * stepDt;
      sp.mesh.position.z += sp.vz * stepDt;

      if (sp.mesh.position.y < 0.06) {
        sp.mesh.position.y = 0.06;
        sp.vy = Math.abs(sp.vy) * 0.52;
        sp.vx *= 0.78;
        sp.vz *= 0.78;
      }

      // Orient spark streak along its velocity vector
      sp.mesh.lookAt(
        sp.mesh.position.x + sp.vx,
        sp.mesh.position.y + sp.vy,
        sp.mesh.position.z + sp.vz
      );

      const alpha = Math.max(0, sp.life / sp.maxLife);
      sp.mesh.material.opacity = alpha;
      sp.mesh.scale.set(1, 1, 0.4 + alpha * 1.1);

      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.material.dispose();
        this.sparks.splice(i, 1);
      }
    }

    // Update rising expanding dust puffs
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const dp = this.dustPuffs[i];
      dp.life -= stepDt;
      dp.mesh.position.x += dp.vx * stepDt;
      dp.mesh.position.y += dp.vy * stepDt;
      dp.mesh.position.z += dp.vz * stepDt;
      dp.mesh.scale.multiplyScalar(1 + stepDt * 2.1);
      const ratio = Math.max(0, dp.life / dp.maxLife);
      dp.mesh.material.opacity = dp.baseOpacity * ratio;

      if (dp.life <= 0) {
        this.scene.remove(dp.mesh);
        dp.mesh.material.dispose();
        this.dustPuffs.splice(i, 1);
      }
    }
  }

  clear() {
    this.shards.forEach((s) => {
      this.world.removeBody(s.body);
      this.scene.remove(s.mesh);
      s.mesh.material.dispose();
    });
    this.shards = [];

    this.sparks.forEach((sp) => {
      this.scene.remove(sp.mesh);
      sp.mesh.material.dispose();
    });
    this.sparks = [];

    this.dustPuffs.forEach((dp) => {
      this.scene.remove(dp.mesh);
      dp.mesh.material.dispose();
    });
    this.dustPuffs = [];
  }
}
