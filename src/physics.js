/**
 * Real 3D rigid-body physics module powered by cannon-es.
 * Handles shattering 3D brick shards (gravity, spin, floor & wall bounces)
 * so every brick destruction explodes with physical 3D debris.
 */

import * as THREE from "three";
import * as CANNON from "cannon-es";

export class DebrisPhysics {
  constructor(scene, arenaHalfW, arenaHalfD) {
    this.scene = scene;
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -24, 0),
    });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 5;

    const bounceMat = new CANNON.Material("debris");
    const contactMat = new CANNON.ContactMaterial(bounceMat, bounceMat, {
      friction: 0.35,
      restitution: 0.55,
    });
    this.world.addContactMaterial(contactMat);
    this.debrisMat = bounceMat;

    // Arena floor plane
    const floorBody = new CANNON.Body({
      mass: 0,
      material: bounceMat,
      shape: new CANNON.Plane(),
    });
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    floorBody.position.set(0, 0, 0);
    this.world.addBody(floorBody);

    // Side & back walls so shards ricochet inside the 3D court
    const addWall = (pos, euler) => {
      const b = new CANNON.Body({ mass: 0, material: bounceMat, shape: new CANNON.Plane() });
      b.position.set(...pos);
      b.quaternion.setFromEuler(...euler);
      this.world.addBody(b);
    };
    addWall([-arenaHalfW, 0, 0], [0, Math.PI / 2, 0]);
    addWall([arenaHalfW, 0, 0], [0, -Math.PI / 2, 0]);
    addWall([0, 0, -arenaHalfD], [0, 0, 0]);

    this.shards = [];
    this.shardGeo = new THREE.BoxGeometry(0.32, 0.24, 0.28);
  }

  spawnBrickShatter(position, colorHex, impactVel, count = 6) {
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3,
      metalness: 0.25,
      transparent: true,
      opacity: 1,
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.shardGeo, mat.clone());
      mesh.castShadow = true;

      const ox = (Math.random() - 0.5) * 0.8;
      const oy = (Math.random() - 0.5) * 0.3;
      const oz = (Math.random() - 0.5) * 0.4;

      const body = new CANNON.Body({
        mass: 0.4,
        material: this.debrisMat,
        shape: new CANNON.Box(new CANNON.Vec3(0.16, 0.12, 0.14)),
        position: new CANNON.Vec3(position.x + ox, Math.max(0.25, position.y + oy), position.z + oz),
      });

      body.velocity.set(
        impactVel.x * 0.35 + (Math.random() - 0.5) * 8,
        4 + Math.random() * 6,
        impactVel.z * 0.35 + (Math.random() - 0.5) * 8
      );
      body.angularVelocity.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14
      );

      this.world.addBody(body);
      this.scene.add(mesh);
      this.shards.push({ mesh, body, life: 1.5 + Math.random() * 0.7, maxLife: 2.2 });
    }

    // Cap active shards for silky 60fps performance
    while (this.shards.length > 90) {
      const oldest = this.shards.shift();
      this.world.removeBody(oldest.body);
      this.scene.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
  }

  update(dt) {
    this.world.step(1 / 60, Math.min(dt, 0.05), 2);
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.life -= dt;
      s.mesh.position.copy(s.body.position);
      s.mesh.quaternion.copy(s.body.quaternion);

      if (s.life < 0.45) {
        const alpha = Math.max(0, s.life / 0.45);
        s.mesh.material.opacity = alpha;
        s.mesh.scale.setScalar(0.4 + 0.6 * alpha);
      }

      if (s.life <= 0) {
        this.world.removeBody(s.body);
        this.scene.remove(s.mesh);
        s.mesh.material.dispose();
        this.shards.splice(i, 1);
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
  }
}
