/**
 * Bricks 3D v3 — Multi-World 3D Arcade with World Mechanics, Special Bricks,
 * Expanded Power-Ups (Laser, Magnet, Slow-Mo, Multi-Ball, Wide, Fireball),
 * and Level 3 3D Boss Core ("Prism Overlord").
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ArcadeAudio } from "./audio.js";
import { EnvironmentManager, WORLD_CONFIGS } from "./environments.js";
import { DebrisPhysics } from "./physics.js";

const ARENA = {
  halfW: 9.0,
  halfD: 11.5,
  paddleZDefault: 9.4,
  paddleZMin: 7.4,
  paddleZMax: 10.2,
  paddleBaseWidth: 3.2,
  paddleDepth: 0.78,
  ballRadius: 0.36,
  baseBallSpeed: 13.8,
  brickLayerH: 0.78,
};

const DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "EASY",
    short: "EASY",
    lives: 5,
    ballSpeed: 10.8,
    maxBallSpeed: 15.5,
    paddleWidth: 3.9,
    powerUpChance: 0.32,
    armoredHp: 2,
    bossHp: 8,
    bossFireInterval: 4.2,
    bossPlasmaSpeed: 5.4,
    bossShieldSpeed: 0.9,
    hazardScale: 0.6,
    scoreMult: 1.0,
  },
  medium: {
    id: "medium",
    label: "MEDIUM",
    short: "MED",
    lives: 3,
    ballSpeed: 13.8,
    maxBallSpeed: 20.5,
    paddleWidth: 3.2,
    powerUpChance: 0.22,
    armoredHp: 2,
    bossHp: 12,
    bossFireInterval: 3.0,
    bossPlasmaSpeed: 7.4,
    bossShieldSpeed: 1.35,
    hazardScale: 1.0,
    scoreMult: 1.5,
  },
  hard: {
    id: "hard",
    label: "HARD",
    short: "HARD",
    lives: 2,
    ballSpeed: 17.2,
    maxBallSpeed: 25.5,
    paddleWidth: 2.55,
    powerUpChance: 0.14,
    armoredHp: 3,
    bossHp: 18,
    bossFireInterval: 1.95,
    bossPlasmaSpeed: 10.2,
    bossShieldSpeed: 2.05,
    hazardScale: 1.45,
    scoreMult: 2.5,
  },
};

// Multi-story 3D levels: '1'-'5' standard, 'A' armored (2 HP), 'T' Explosive TNT!
const LEVELS = [
  {
    name: "3D Stepped Citadel",
    layers: [
      [
        "111T1T111",
        "222222222",
        "111A1A111",
        "333T3T333",
        "444444444",
      ],
      [
        "0111A1110",
        "002T2T200",
        "0003A3000",
        "004404400",
        "000000000",
      ],
      [
        "000ATA000",
        "000050000",
        "000000000",
        "000000000",
        "000000000",
      ],
    ],
  },
  {
    name: "Twin TNT Towers",
    layers: [
      [
        "A110A011A",
        "2T21212T2",
        "3A33T33A3",
        "444040444",
        "555555555",
      ],
      [
        "110000011",
        "2T00A00T2",
        "330000033",
        "000000000",
        "000000000",
      ],
      [
        "A0000000A",
        "500000005",
        "000000000",
        "000000000",
        "000000000",
      ],
    ],
  },
  {
    name: "Boss: Prism Overlord",
    isBoss: true,
    layers: [
      [
        "A0000000A",
        "T1000001T",
        "000000000",
        "330000033",
        "000000000",
      ],
      [
        "000000000",
        "0T00000T0",
        "000000000",
        "000000000",
        "000000000",
      ],
    ],
  },
];

const CAMERA_MODES = [
  { name: "3D Chase", pos: new THREE.Vector3(0, 9.2, 18.6), look: new THREE.Vector3(0, 1.1, -1.8), parallax: 0.28 },
  { name: "Low Hero 3D", pos: new THREE.Vector3(0, 6.2, 17.4), look: new THREE.Vector3(0, 1.5, -3.2), parallax: 0.36 },
  { name: "Arcade Tilt", pos: new THREE.Vector3(0, 14.5, 18.5), look: new THREE.Vector3(0, 0.5, 0.2), parallax: 0.14 },
  { name: "Overhead", pos: new THREE.Vector3(0, 22.8, 10.2), look: new THREE.Vector3(0, 0, 0.4), parallax: 0.05 },
];

const POWERUPS = [
  { type: "MULTIBALL", label: "MULTI-BALL!", color: 0x38bdf8 },
  { type: "WIDE", label: "WIDE PADDLE!", color: 0x4ade80 },
  { type: "FIREBALL", label: "FIREBALL!", color: 0xf97316 },
  { type: "LASER", label: "TWIN LASERS!", color: 0xf43f5e },
  { type: "MAGNET", label: "MAGNET CATCH!", color: 0xa855f7 },
  { type: "SLOWMO", label: "SLOW-MO!", color: 0x2dd4bf },
];

class Bricks3DGame {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.audio = new ArcadeAudio();
    this.models = {};
    this.keys = new Set();

    this.state = "start";
    this.difficultyKey = "medium";
    this.diff = DIFFICULTIES.medium;
    this.score = 0;
    this.lives = this.diff.lives;
    this.levelIdx = 0;
    this.combo = 0;
    this.cameraModeIdx = 0;
    this.cameraOrbitAngle = 0;
    this.currentWorld = "nature";

    this.paddleX = 0;
    this.paddleZ = ARENA.paddleZDefault;
    this.paddleVelX = 0;
    this.paddleWidth = this.diff.paddleWidth;

    // Power-up timers
    this.wideTimer = 0;
    this.fireballTimer = 0;
    this.laserTimer = 0;
    this.laserCooldown = 0;
    this.magnetTimer = 0;
    this.slowMoTimer = 0;

    this.shakeTime = 0;
    this.hitStopTime = 0;

    this.touchInput = {
      left: false,
      right: false,
      dragging: false,
      pointerId: null,
      lastClientX: 0,
      lastClientY: 0,
      movedDist: 0,
    };

    this.bricks = [];
    this.balls = [];
    this.powerUps = [];
    this.lasers = [];
    this.shockwaves = [];
    this.boss = null;
    this.bossProjectiles = [];

    this._bindDOM();
    this._initThree();
    this._boot();
  }

  _bindDOM() {
    this.ui = {
      score: document.getElementById("score-val"),
      level: document.getElementById("level-val"),
      lives: document.getElementById("lives-val"),
      comboPill: document.getElementById("combo-pill"),
      comboVal: document.getElementById("combo-val"),
      worldLabel: document.getElementById("world-label"),
      mechanicBadge: document.getElementById("mechanic-badge"),
      bossHud: document.getElementById("boss-hud"),
      bossBarFill: document.getElementById("boss-bar-fill"),
      toast: document.getElementById("toast-banner"),
      overlay: document.getElementById("overlay"),
      overlayTitle: document.getElementById("overlay-title"),
      overlaySubtitle: document.getElementById("overlay-subtitle"),
      overlayCta: document.getElementById("overlay-cta"),
      worldBtns: Array.from(document.querySelectorAll(".world-btn")),
      diffBtns: Array.from(document.querySelectorAll(".diff-btn")),
      btnDiff: document.getElementById("btn-diff"),
      btnCamera: document.getElementById("btn-camera"),
      btnAudio: document.getElementById("btn-audio"),
      btnPause: document.getElementById("btn-pause"),
      touchLeft: document.getElementById("touch-left"),
      touchRight: document.getElementById("touch-right"),
      touchLaunch: document.getElementById("touch-launch"),
    };

    this.ui.overlayCta.addEventListener("click", () => this._handlePrimaryAction());
    this.ui.btnDiff.addEventListener("click", () => this.cycleDifficulty());
    this.ui.btnCamera.addEventListener("click", () => this.cycleCamera());
    this.ui.btnAudio.addEventListener("click", () => this.toggleAudio());
    this.ui.btnPause.addEventListener("click", () => this.togglePause());

    this.ui.worldBtns.forEach((btn) => {
      btn.addEventListener("click", () => this.switchWorld(btn.dataset.worldTarget));
    });

    this.ui.diffBtns.forEach((btn) => {
      btn.addEventListener("click", () => this.setDifficulty(btn.dataset.diff));
    });

    this._bindTouchControls();

    window.addEventListener("keydown", (e) => this._onKeyDown(e));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("resize", () => this._onResize());
  }

  _bindTouchControls() {
    const bindHoldBtn = (el, side) => {
      if (!el) return;
      const start = (e) => {
        e.preventDefault();
        this.audio.unlock();
        this.touchInput[side] = true;
        el.classList.add("pressed");
      };
      const end = (e) => {
        e.preventDefault();
        this.touchInput[side] = false;
        el.classList.remove("pressed");
      };
      el.addEventListener("pointerdown", start);
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("pointerleave", end);
    };

    bindHoldBtn(this.ui.touchLeft, "left");
    bindHoldBtn(this.ui.touchRight, "right");

    if (this.ui.touchLaunch) {
      this.ui.touchLaunch.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this._handlePrimaryAction();
      });
    }

    this.canvas.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      this.audio.unlock();
      this.touchInput.dragging = true;
      this.touchInput.pointerId = e.pointerId;
      this.touchInput.lastClientX = e.clientX;
      this.touchInput.lastClientY = e.clientY;
      this.touchInput.movedDist = 0;
      if (this.canvas.setPointerCapture) {
        try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}
      }
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.touchInput.dragging || e.pointerId !== this.touchInput.pointerId) return;
      const dx = e.clientX - this.touchInput.lastClientX;
      const dy = e.clientY - this.touchInput.lastClientY;
      this.touchInput.lastClientX = e.clientX;
      this.touchInput.lastClientY = e.clientY;
      this.touchInput.movedDist += Math.hypot(dx, dy);

      if (this.state !== "playing") return;
      const sensitivityX = (ARENA.halfW * 2.35) / Math.max(320, window.innerWidth);
      const sensitivityZ = 3.2 / Math.max(480, window.innerHeight);
      const maxPaddleX = ARENA.halfW - this.paddleWidth / 2 - 0.15;
      this.paddleX = THREE.MathUtils.clamp(this.paddleX + dx * sensitivityX, -maxPaddleX, maxPaddleX);
      this.paddleZ = THREE.MathUtils.clamp(this.paddleZ + dy * sensitivityZ, ARENA.paddleZMin, ARENA.paddleZMax);
      this.paddleVelX = dx * sensitivityX * 35;
    });

    const endDrag = (e) => {
      if (!this.touchInput.dragging || e.pointerId !== this.touchInput.pointerId) return;
      const wasTap = this.touchInput.movedDist < 12;
      this.touchInput.dragging = false;
      this.touchInput.pointerId = null;
      if (wasTap && this.state === "playing") {
        this._launchAttachedBalls();
      }
    };

    this.canvas.addEventListener("pointerup", endDrag);
    this.canvas.addEventListener("pointercancel", endDrag);
  }

  _initThree() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 220);
    this._onResize();
    this.camera.position.copy(CAMERA_MODES[0].pos);
    this.camera.lookAt(CAMERA_MODES[0].look);

    this.impactLight = new THREE.PointLight(0xffffff, 0, 16);
    this.impactLight.position.set(0, 2, 0);
    this.scene.add(this.impactLight);

    this.physics = new DebrisPhysics(this.scene, ARENA.halfW, ARENA.halfD);
    this._buildArena();
  }

  _buildArena() {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(ARENA.halfW * 2, 0.4, ARENA.halfD * 2),
      new THREE.MeshStandardMaterial({ color: 0x2f5e35, roughness: 0.75, metalness: 0.1 })
    );
    floor.position.set(0, -0.2, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const railMat = () =>
      new THREE.MeshStandardMaterial({
        color: 0x7c4a26,
        emissive: 0x1a2e12,
        emissiveIntensity: 0.55,
        roughness: 0.32,
        metalness: 0.48,
      });

    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.35, ARENA.halfD * 2 + 0.5), railMat());
    leftRail.position.set(-ARENA.halfW - 0.25, 0.5, 0);
    leftRail.castShadow = true;

    const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.35, ARENA.halfD * 2 + 0.5), railMat());
    rightRail.position.set(ARENA.halfW + 0.25, 0.5, 0);
    rightRail.castShadow = true;

    const backRail = new THREE.Mesh(new THREE.BoxGeometry(ARENA.halfW * 2 + 1.0, 2.2, 0.5), railMat());
    backRail.position.set(0, 0.92, -ARENA.halfD - 0.25);
    backRail.castShadow = true;

    this.scene.add(leftRail, rightRail, backRail);
    this.arenaMeshes = { floor, rails: [leftRail, rightRail, backRail] };
  }

  async _loadBlenderModels() {
    const loader = new GLTFLoader();
    const names = [
      "paddle",
      "brick_standard",
      "brick_armored",
      "brick_tnt",
      "tree_nature",
      "planter_mall",
      "satellite_space",
      "mushroom_bumper",
      "boss_core",
    ];
    await Promise.all(
      names.map(async (name) => {
        try {
          const gltf = await loader.loadAsync(`./assets/models/${name}.glb`);
          this.models[name] = gltf.scene;
        } catch (err) {
          console.warn(`Could not load Blender model ${name}.glb, using fallback geometry.`, err);
        }
      })
    );
  }

  async _boot() {
    await this._loadBlenderModels();
    this.env = new EnvironmentManager(this.scene, ARENA, this.models);
    this._createPaddle();
    this.switchWorld("nature", true);
    this._buildLevel(0);
    this._spawnBall(true);
    this._syncHUD();

    this.clock = new THREE.Clock();
    this._animate();
  }

  _createPaddle() {
    if (this.paddleGroup) this.scene.remove(this.paddleGroup);
    this.paddleGroup = new THREE.Group();

    if (this.models.paddle) {
      const model = this.models.paddle.clone(true);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      model.scale.set(ARENA.paddleBaseWidth / 2.1, 1.45, 1.45);
      this.paddleGroup.add(model);
    } else {
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(ARENA.paddleBaseWidth, 0.5, ARENA.paddleDepth),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.25 })
      );
      fallback.castShadow = true;
      this.paddleGroup.add(fallback);
    }

    // Twin laser cannons (hidden until LASER power-up is active)
    this.laserCannons = new THREE.Group();
    const cannonMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 1.6,
      metalness: 0.7,
      roughness: 0.2,
    });
    [-1.15, 1.15].forEach((x) => {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.75, 10), cannonMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(x, 0.26, -0.35);
      this.laserCannons.add(barrel);
    });
    this.laserCannons.visible = false;
    this.paddleGroup.add(this.laserCannons);

    // Magnet aura ring (hidden until MAGNET power-up is active)
    this.magnetAura = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.05, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.75 })
    );
    this.magnetAura.rotation.x = Math.PI / 2;
    this.magnetAura.scale.set(1.15, 0.35, 1);
    this.magnetAura.visible = false;
    this.paddleGroup.add(this.magnetAura);

    this.paddleGroup.position.set(0, 0.42, this.paddleZ);
    this.scene.add(this.paddleGroup);
  }

  _clearBoss() {
    if (this.boss) {
      this.scene.remove(this.boss.group);
      this.boss.shields.forEach((s) => this.scene.remove(s.mesh));
      this.boss = null;
    }
    this.bossProjectiles.forEach((p) => this.scene.remove(p.mesh));
    this.bossProjectiles = [];
    this.ui.bossHud.classList.add("hidden");
  }

  _spawnBoss() {
    const group = new THREE.Group();
    if (this.models.boss_core) {
      const m = this.models.boss_core.clone(true);
      m.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      m.scale.setScalar(1.15);
      group.add(m);
    } else {
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.4),
        new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 1.4 })
      );
      group.add(core);
    }
    group.position.set(0, 2.0, -5.6);
    this.scene.add(group);

    // 6 orbiting armored shield bricks around the boss
    const shields = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const mesh = this.models.brick_armored
        ? this.models.brick_armored.clone(true)
        : new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.6, 0.6),
            new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85 })
          );
      mesh.scale.set(1.2, 1.2, 1.2);
      this.scene.add(mesh);
      shields.push({ mesh, angle: ang, hp: 2, radius: 3.1 });
    }

    this.boss = {
      group,
      x: 0,
      y: 2.0,
      z: -5.6,
      radius: 1.55,
      hp: this.diff.bossHp,
      maxHp: this.diff.bossHp,
      hitFlash: 0,
      fireTimer: this.diff.bossFireInterval,
      shields,
    };

    this.ui.bossHud.classList.remove("hidden");
    this.ui.bossBarFill.style.width = "100%";
  }

  _buildLevel(idx) {
    this.bricks.forEach((b) => this.scene.remove(b.mesh));
    this.bricks = [];
    this.powerUps.forEach((p) => this.scene.remove(p.mesh));
    this.powerUps = [];
    this.lasers.forEach((l) => this.scene.remove(l.mesh));
    this.lasers = [];
    this._clearBoss();

    const level = LEVELS[idx % LEVELS.length];
    const palette = WORLD_CONFIGS[this.currentWorld].brickPalette;
    const cols = level.layers[0][0].length;
    const spacingX = 1.82;
    const spacingZ = 1.22;
    const startX = -((cols - 1) * spacingX) / 2;
    const startZ = -8.4;

    level.layers.forEach((rows, layerIdx) => {
      rows.forEach((rowStr, r) => {
        for (let c = 0; c < rowStr.length; c++) {
          const ch = rowStr[c];
          if (ch === "0") continue;

          const armored = ch === "A";
          const tnt = ch === "T";
          const colorHex = tnt
            ? 0xff3b1f
            : armored
              ? 0xcbd5e1
              : palette[(parseInt(ch, 10) - 1 + r + layerIdx) % palette.length];
          const hp = armored ? this.diff.armoredHp : 1;

          let mesh;
          const template = tnt
            ? this.models.brick_tnt
            : armored
              ? this.models.brick_armored
              : this.models.brick_standard;

          if (template) {
            mesh = template.clone(true);
            mesh.scale.set(1.62, 1.55, 1.48);
            mesh.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material = child.material.clone();
                if (!armored && !tnt) {
                  child.material.color.setHex(colorHex);
                  child.material.emissive.setHex(colorHex);
                  child.material.emissiveIntensity = 0.2;
                }
              }
            });
          } else {
            mesh = new THREE.Mesh(
              new THREE.BoxGeometry(1.6, 0.72, 0.88),
              new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: armored ? 0.8 : 0.2 })
            );
            mesh.castShadow = true;
          }

          const x = startX + c * spacingX;
          const y = 0.44 + layerIdx * ARENA.brickLayerH;
          const z = startZ + r * spacingZ;
          mesh.position.set(x, y, z);
          this.scene.add(mesh);

          this.bricks.push({
            mesh,
            x,
            y,
            targetY: y,
            z,
            layer: layerIdx,
            row: r,
            col: c,
            halfW: 0.82,
            halfH: 0.38,
            halfD: 0.45,
            hp,
            armored,
            tnt,
            colorHex,
            hitFlash: 0,
          });
        }
      });
    });

    if (level.isBoss) {
      this._spawnBoss();
      this._showToast("BOSS ROUND: PRISM OVERLORD!");
    }
  }

  _settleStackedBricks() {
    const occupied = new Set(this.bricks.map((b) => `${b.row},${b.col},${b.layer}`));
    this.bricks
      .slice()
      .sort((a, b) => a.layer - b.layer)
      .forEach((b) => {
        while (b.layer > 0 && !occupied.has(`${b.row},${b.col},${b.layer - 1}`)) {
          occupied.delete(`${b.row},${b.col},${b.layer}`);
          b.layer -= 1;
          occupied.add(`${b.row},${b.col},${b.layer}`);
          b.targetY = 0.44 + b.layer * ARENA.brickLayerH;
        }
      });
  }

  _spawnShockwave(pos, colorHex = 0xff6b2b) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.7, 28),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, Math.max(0.25, pos.y), pos.z);
    this.scene.add(ring);
    this.shockwaves.push({ mesh: ring, life: 0.42, maxLife: 0.42 });
  }

  _detonateTNT(origin, impactVel) {
    this.audio.explosion();
    this._vibrate(38);
    this.shakeTime = 0.24;
    this.hitStopTime = 0.045;
    this._triggerImpactFlash(origin, 0xff5500);
    this._spawnShockwave(origin, 0xff6b2b);
    this._showToast("TNT BLAST!");

    const blastRadius = 3.1;
    const chainQueue = [];

    for (let j = this.bricks.length - 1; j >= 0; j--) {
      const nb = this.bricks[j];
      const dist = Math.hypot(nb.x - origin.x, nb.y - origin.y, nb.z - origin.z);
      if (dist <= blastRadius) {
        const posCopy = nb.mesh.position.clone();
        const wasTnt = nb.tnt;
        this.score += (nb.armored ? 220 : 120) * Math.min(Math.max(1, this.combo), 5);
        this.physics.spawnBrickShatter(posCopy, nb.colorHex, { x: (nb.x - origin.x) * 4, z: (nb.z - origin.z) * 4 }, 6);
        this.scene.remove(nb.mesh);
        this.bricks.splice(j, 1);
        if (wasTnt) chainQueue.push(posCopy);
      }
    }

    // Damage boss if close to TNT blast
    if (this.boss) {
      const bDist = Math.hypot(this.boss.x - origin.x, this.boss.z - origin.z);
      if (bDist <= blastRadius + 2.2) this._damageBoss(2);
    }

    this._settleStackedBricks();
    chainQueue.forEach((pos) => setTimeout(() => this._detonateTNT(pos, impactVel), 90));
  }

  _damageBoss(amount = 1) {
    if (!this.boss) return;
    this.boss.hp = Math.max(0, this.boss.hp - amount);
    this.boss.hitFlash = 0.25;
    this.score += 300;
    this.audio.bossHit();
    this._vibrate(25);
    this._triggerImpactFlash(this.boss.group.position, 0xf43f5e);
    this.ui.bossBarFill.style.width = `${(this.boss.hp / this.boss.maxHp) * 100}%`;
    this._syncHUD();

    if (this.boss.hp <= 0) {
      const pos = this.boss.group.position.clone();
      this.score += 2500;
      this.audio.bossDefeat();
      this._vibrate([40, 40, 80]);
      this.shakeTime = 0.45;
      this._spawnShockwave(pos, 0xf43f5e);
      for (let k = 0; k < 3; k++) {
        this.physics.spawnBrickShatter(pos, k % 2 === 0 ? 0xf43f5e : 0xfbbf24, { x: 0, z: 0 }, 10);
      }
      this._clearBoss();
      this._showToast("PRISM OVERLORD DEFEATED! +2,500");
      this._syncHUD();
    }
  }

  _spawnBall(attached = false, x = this.paddleX, z = this.paddleZ - 0.85, vx = 0, vz = -ARENA.baseBallSpeed) {
    const cfg = WORLD_CONFIGS[this.currentWorld];
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(ARENA.ballRadius, 24, 24),
      new THREE.MeshStandardMaterial({
        color: cfg.ballColor,
        emissive: cfg.ballColor,
        emissiveIntensity: 0.65,
        roughness: 0.12,
        metalness: 0.35,
      })
    );
    mesh.castShadow = true;
    const startY = ARENA.ballRadius + 0.08;
    mesh.position.set(x, startY, z);
    this.scene.add(mesh);

    const shadowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.38, 20),
      new THREE.MeshBasicMaterial({ color: cfg.paddleGlow, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    shadowRing.rotation.x = -Math.PI / 2;
    shadowRing.position.set(x, 0.03, z);
    this.scene.add(shadowRing);

    const trail = [];
    for (let i = 0; i < 8; i++) {
      const tMesh = new THREE.Mesh(
        new THREE.SphereGeometry(ARENA.ballRadius * (0.75 - i * 0.07), 10, 10),
        new THREE.MeshBasicMaterial({
          color: cfg.ballColor,
          transparent: true,
          opacity: 0.38 - i * 0.04,
        })
      );
      tMesh.position.set(x, startY, z);
      this.scene.add(tMesh);
      trail.push(tMesh);
    }

    this.balls.push({
      mesh,
      shadowRing,
      trail,
      history: Array.from({ length: 8 }, () => new THREE.Vector3(x, startY, z)),
      x,
      y: startY,
      z,
      vx,
      vy: attached ? 0 : 4.2,
      vz,
      attached,
      attachOffsetX: 0,
      portalCooldown: 0,
    });
  }

  _removeBall(idx) {
    const b = this.balls[idx];
    this.scene.remove(b.mesh, b.shadowRing, ...b.trail);
    this.balls.splice(idx, 1);
  }

  _spawnPowerUp(x, y, z) {
    const spec = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.26, 0.46, 8, 14),
      new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      })
    );
    mesh.position.set(x, Math.max(0.55, y), z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.powerUps.push({ mesh, x, y: mesh.position.y, z, vz: 5.4, spec });
  }

  _fireTwinLasers() {
    this.audio.laserShot();
    const boltGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8);
    boltGeo.rotateX(Math.PI / 2);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const spread = this.paddleWidth * 0.36;
    [-spread, spread].forEach((offset) => {
      const mesh = new THREE.Mesh(boltGeo, boltMat);
      mesh.position.set(this.paddleX + offset, 0.72, this.paddleZ - 0.7);
      this.scene.add(mesh);
      this.lasers.push({ mesh, x: this.paddleX + offset, z: this.paddleZ - 0.7, vz: -28 });
    });
  }

  _vibrate(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (_) {}
    }
  }

  switchWorld(worldKey, silent = false) {
    if (!WORLD_CONFIGS[worldKey]) return;
    this.currentWorld = worldKey;
    const cfg = this.env.setWorld(worldKey, this.arenaMeshes);
    this.ui.worldLabel.textContent = cfg.label;
    if (this.ui.mechanicBadge) this.ui.mechanicBadge.textContent = cfg.mechanicLabel;
    this.ui.worldBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.worldTarget === worldKey);
    });

    this.bricks.forEach((b, idx) => {
      if (!b.armored && !b.tnt) {
        const newColor = cfg.brickPalette[(idx + b.layer) % cfg.brickPalette.length];
        b.colorHex = newColor;
        b.mesh.traverse((child) => {
          if (child.isMesh) {
            child.material.color.setHex(newColor);
            child.material.emissive.setHex(newColor);
          }
        });
      }
    });

    this.balls.forEach((ball) => {
      ball.mesh.material.color.setHex(cfg.ballColor);
      ball.mesh.material.emissive.setHex(cfg.ballColor);
      ball.shadowRing.material.color.setHex(cfg.paddleGlow);
      ball.trail.forEach((t) => t.material.color.setHex(cfg.ballColor));
    });

    if (!silent) {
      this.audio.worldSwitch();
      this._showToast(`${cfg.label} · ${cfg.mechanicLabel}`);
    }
  }

  setDifficulty(diffKey, silent = false) {
    if (!DIFFICULTIES[diffKey]) return;
    this.difficultyKey = diffKey;
    this.diff = DIFFICULTIES[diffKey];

    this.ui.diffBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.diff === diffKey);
    });
    if (this.ui.btnDiff) this.ui.btnDiff.textContent = this.diff.short;

    // Apply paddle width immediately
    const widthScale = this.diff.paddleWidth / ARENA.paddleBaseWidth;
    this.paddleWidth = this.diff.paddleWidth * (this.wideTimer > 0 ? 1.45 : 1);
    if (this.paddleGroup) {
      this.paddleGroup.scale.x = widthScale * (this.wideTimer > 0 ? 1.45 : 1);
    }

    if (this.state === "start") {
      this.lives = this.diff.lives;
      this._buildLevel(0);
      this._syncHUD();
    } else if (this.state === "playing" || this.state === "paused") {
      this._restartGame();
    }

    if (!silent) {
      this.audio.worldSwitch();
      this._showToast(`DIFFICULTY: ${this.diff.label} (${this.diff.scoreMult}x SCORE)`);
    }
  }

  cycleDifficulty() {
    const order = ["easy", "medium", "hard"];
    const next = order[(order.indexOf(this.difficultyKey) + 1) % order.length];
    this.setDifficulty(next);
  }

  cycleCamera() {
    this.cameraModeIdx = (this.cameraModeIdx + 1) % CAMERA_MODES.length;
    this.cameraOrbitAngle = 0;
    this._showToast(`CAMERA: ${CAMERA_MODES[this.cameraModeIdx].name.toUpperCase()}`);
  }

  toggleAudio() {
    const muted = this.audio.toggleMute();
    this.ui.btnAudio.textContent = muted ? "MUTED [M]" : "SFX [M]";
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      this._showOverlay("PAUSED", "Take a breather or switch worlds with 1, 2, 3.", "RESUME — TAP OR SPACE");
    } else if (this.state === "paused") {
      this.state = "playing";
      this.ui.overlay.classList.add("hidden");
    }
  }

  _showOverlay(title, subtitle, ctaText) {
    this.ui.overlayTitle.textContent = title;
    this.ui.overlaySubtitle.textContent = subtitle;
    this.ui.overlayCta.textContent = ctaText;
    this.ui.overlay.classList.remove("hidden");
  }

  _showToast(msg) {
    this.ui.toast.textContent = msg;
    this.ui.toast.classList.remove("hidden");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.ui.toast.classList.add("hidden"), 1800);
  }

  _handlePrimaryAction() {
    this.audio.unlock();
    if (this.state === "start" || this.state === "paused") {
      this.state = "playing";
      this.ui.overlay.classList.add("hidden");
      this._launchAttachedBalls();
    } else if (this.state === "gameover" || this.state === "victory") {
      this._restartGame();
    } else if (this.state === "playing") {
      this._launchAttachedBalls();
      if (this.laserTimer > 0 && this.laserCooldown <= 0) {
        this._fireTwinLasers();
        this.laserCooldown = 0.25;
      }
    }
  }

  _launchAttachedBalls() {
    this.balls.forEach((b) => {
      if (b.attached) {
        b.attached = false;
        const aimAngle = THREE.MathUtils.clamp((b.attachOffsetX || 0) * 0.55 + (Math.random() - 0.5) * 0.35, -0.85, 0.85);
        b.vx = Math.sin(aimAngle) * this.diff.ballSpeed;
        b.vz = -Math.cos(aimAngle) * this.diff.ballSpeed;
        b.vy = 5.4;
        this.audio.paddleHit();
      }
    });
  }

  _restartGame() {
    this.score = 0;
    this.lives = this.diff.lives;
    this.levelIdx = 0;
    this.combo = 0;
    this.paddleX = 0;
    this.paddleZ = ARENA.paddleZDefault;
    this.paddleWidth = this.diff.paddleWidth;
    if (this.paddleGroup) this.paddleGroup.scale.x = this.diff.paddleWidth / ARENA.paddleBaseWidth;
    this.wideTimer = 0;
    this.fireballTimer = 0;
    this.laserTimer = 0;
    this.magnetTimer = 0;
    this.slowMoTimer = 0;
    this.laserCannons.visible = false;
    this.magnetAura.visible = false;
    this.physics.clear();
    while (this.balls.length > 0) this._removeBall(0);
    this._buildLevel(0);
    this._spawnBall(true);
    this.state = "playing";
    this.ui.overlay.classList.add("hidden");
    this._syncHUD();
  }

  _onKeyDown(e) {
    this.keys.add(e.code);
    if (e.code === "Digit1") this.switchWorld("nature");
    else if (e.code === "Digit2") this.switchWorld("mall");
    else if (e.code === "Digit3") this.switchWorld("space");
    else if (e.code === "KeyC") this.cycleCamera();
    else if (e.code === "KeyM") this.toggleAudio();
    else if (e.code === "KeyP" || e.code === "Escape") this.togglePause();
    else if (e.code === "KeyR") this._restartGame();
    else if (e.code === "Space") {
      e.preventDefault();
      this._handlePrimaryAction();
    }
  }

  _onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.85 ? 60 : aspect < 1.1 ? 54 : 50;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _syncHUD() {
    this.ui.score.textContent = this.score.toLocaleString();
    this.ui.level.textContent = String(this.levelIdx + 1);
    this.ui.lives.textContent = "●".repeat(Math.max(0, this.lives)) || "—";
    if (this.combo >= 2) {
      this.ui.comboPill.classList.remove("hidden");
      this.ui.comboVal.textContent = `x${this.combo}`;
    } else {
      this.ui.comboPill.classList.add("hidden");
    }
  }

  _triggerImpactFlash(pos, colorHex) {
    this.impactLight.color.setHex(colorHex);
    this.impactLight.position.set(pos.x, pos.y + 0.5, pos.z);
    this.impactLight.intensity = 4.6;
  }

  _updateGameplay(dt, elapsed) {
    // 3D Paddle movement
    const left = this.keys.has("ArrowLeft") || this.keys.has("KeyA") || this.touchInput.left;
    const right = this.keys.has("ArrowRight") || this.keys.has("KeyD") || this.touchInput.right;
    const forward = this.keys.has("ArrowUp") || this.keys.has("KeyW");
    const back = this.keys.has("ArrowDown") || this.keys.has("KeyS");

    const moveDirX = (right ? 1 : 0) - (left ? 1 : 0);
    const moveDirZ = (back ? 1 : 0) - (forward ? 1 : 0);

    if (!this.touchInput.dragging) {
      this.paddleVelX = moveDirX * 17.0;
      this.paddleX += this.paddleVelX * dt;
      this.paddleZ += moveDirZ * 8.5 * dt;
    }

    const maxPaddleX = ARENA.halfW - this.paddleWidth / 2 - 0.15;
    this.paddleX = THREE.MathUtils.clamp(this.paddleX, -maxPaddleX, maxPaddleX);
    this.paddleZ = THREE.MathUtils.clamp(this.paddleZ, ARENA.paddleZMin, ARENA.paddleZMax);

    this.paddleGroup.position.x = this.paddleX;
    this.paddleGroup.position.z = this.paddleZ;
    this.paddleGroup.rotation.z = THREE.MathUtils.lerp(this.paddleGroup.rotation.z, -moveDirX * 0.12, dt * 11);
    this.paddleGroup.rotation.x = THREE.MathUtils.lerp(this.paddleGroup.rotation.x, moveDirZ * 0.08, dt * 10);

    if (this.keys.has("KeyQ")) this.cameraOrbitAngle -= dt * 1.1;
    if (this.keys.has("KeyE")) this.cameraOrbitAngle += dt * 1.1;
    this.cameraOrbitAngle = THREE.MathUtils.clamp(this.cameraOrbitAngle, -0.75, 0.75);

    // Power-up timers & visual attachments
    if (this.wideTimer > 0) {
      this.wideTimer -= dt;
      if (this.wideTimer <= 0) {
        this.paddleWidth = this.diff.paddleWidth;
        this.paddleGroup.scale.x = this.diff.paddleWidth / ARENA.paddleBaseWidth;
      }
    }
    if (this.fireballTimer > 0) this.fireballTimer -= dt;
    if (this.slowMoTimer > 0) this.slowMoTimer -= dt;
    if (this.magnetTimer > 0) {
      this.magnetTimer -= dt;
      this.magnetAura.visible = this.magnetTimer > 0;
      this.magnetAura.rotation.z = elapsed * 4;
    }
    if (this.laserTimer > 0) {
      this.laserTimer -= dt;
      this.laserCooldown -= dt;
      this.laserCannons.visible = this.laserTimer > 0;
      if (this.laserCooldown <= 0 && this.laserTimer > 0) {
        this._fireTwinLasers();
        this.laserCooldown = 0.44;
      }
    }

    // Update stacked bricks & TNT pulse
    this.bricks.forEach((b) => {
      if (b.y > b.targetY) {
        b.y = Math.max(b.targetY, b.y - dt * 5.8);
        b.mesh.position.y = b.y;
      }
      if (b.hitFlash > 0) {
        b.hitFlash -= dt;
        const s = 1 + b.hitFlash * 0.45;
        b.mesh.scale.set(1.62 * s, 1.55 * s, 1.48 * s);
      } else if (b.tnt) {
        const pulse = 1 + Math.sin(elapsed * 6.5) * 0.045;
        b.mesh.scale.set(1.62 * pulse, 1.55 * pulse, 1.48 * pulse);
      }
    });

    // Update Twin Laser Bolts
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.z += l.vz * dt;
      l.mesh.position.z = l.z;
      let hit = false;

      for (let j = this.bricks.length - 1; j >= 0; j--) {
        const br = this.bricks[j];
        if (Math.abs(l.x - br.x) <= br.halfW + 0.15 && Math.abs(l.z - br.z) <= br.halfD + 0.3) {
          this._hitBrick(j, { x: 0, z: -10 });
          hit = true;
          break;
        }
      }

      if (!hit && this.boss && Math.hypot(l.x - this.boss.x, l.z - this.boss.z) <= this.boss.radius + 0.2) {
        this._damageBoss(1);
        hit = true;
      }

      if (hit || l.z < -ARENA.halfD - 1) {
        this.scene.remove(l.mesh);
        this.lasers.splice(i, 1);
      }
    }

    // Update Boss Core, Orbiting Shields & Plasma Orbs
    if (this.boss) {
      this.boss.x = Math.sin(elapsed * 0.9) * 3.8;
      this.boss.y = 2.0 + Math.sin(elapsed * 2.2) * 0.35;
      this.boss.group.position.set(this.boss.x, this.boss.y, this.boss.z);
      this.boss.group.rotation.y = elapsed * 1.4;
      this.boss.group.rotation.x = Math.sin(elapsed * 1.1) * 0.25;
      if (this.boss.hitFlash > 0) {
        this.boss.hitFlash -= dt;
        this.boss.group.scale.setScalar(1 + this.boss.hitFlash * 0.65);
      } else {
        this.boss.group.scale.setScalar(1);
      }

      this.boss.shields.forEach((s) => {
        s.angle += dt * this.diff.bossShieldSpeed;
        s.x = this.boss.x + Math.cos(s.angle) * s.radius;
        s.z = this.boss.z + Math.sin(s.angle) * s.radius;
        s.mesh.position.set(s.x, 1.0, s.z);
        s.mesh.rotation.y = -s.angle;
      });

      this.boss.fireTimer -= dt;
      if (this.boss.fireTimer <= 0) {
        this.boss.fireTimer = this.diff.bossFireInterval;
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.38, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xff1e56, emissiveIntensity: 2.0 })
        );
        orb.position.set(this.boss.x, 0.75, this.boss.z + 1.4);
        this.scene.add(orb);
        const dirX = THREE.MathUtils.clamp((this.paddleX - this.boss.x) * 0.28, -3.2, 3.2);
        this.bossProjectiles.push({ mesh: orb, x: this.boss.x, z: this.boss.z + 1.4, vx: dirX, vz: this.diff.bossPlasmaSpeed });
      }
    }

    for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
      const p = this.bossProjectiles[i];
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, 0.75, p.z);

      if (Math.abs(p.z - this.paddleZ) < 0.72 && Math.abs(p.x - this.paddleX) < this.paddleWidth / 2 + 0.28) {
        this.scene.remove(p.mesh);
        this.bossProjectiles.splice(i, 1);
        this.lives -= 1;
        this.audio.lifeLost();
        this._vibrate(60);
        this.shakeTime = 0.25;
        this._showToast("HIT BY BOSS PLASMA!");
        this._syncHUD();
        if (this.lives <= 0) {
          this.state = "gameover";
          this._showOverlay("GAME OVER", `Final Score: ${this.score.toLocaleString()} — Ready for another run?`, "PLAY AGAIN — TAP OR SPACE");
          return;
        }
        continue;
      }

      if (p.z > ARENA.halfD + 1.5) {
        this.scene.remove(p.mesh);
        this.bossProjectiles.splice(i, 1);
      }
    }

    // World-specific physics parameters
    const worldCfg = WORLD_CONFIGS[this.currentWorld];
    const ballTimeScale = this.slowMoTimer > 0 ? 0.65 : 1.0;
    const bdt = dt * ballTimeScale;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      if (b.portalCooldown > 0) b.portalCooldown -= dt;

      if (b.attached) {
        b.x = this.paddleX + (b.attachOffsetX || 0);
        b.y = ARENA.ballRadius + 0.08;
        b.z = this.paddleZ - 0.85;
        b.mesh.position.set(b.x, b.y, b.z);
        b.shadowRing.position.set(b.x, 0.03, b.z);
        b.trail.forEach((t) => t.position.set(b.x, b.y, b.z));
        continue;
      }

      // World 1 Mechanic: Nature Glade gentle wind gust
      if (this.currentWorld === "nature") {
        b.vx += Math.sin(elapsed * 1.1) * 1.65 * this.diff.hazardScale * bdt;
      }

      // World 3 Mechanic: Orbital Station central Gravity Well curve
      if (this.currentWorld === "space" && this.env.spaceGravityWell) {
        const gw = this.env.spaceGravityWell;
        const gx = gw.x - b.x;
        const gz = gw.z - b.z;
        const dist = Math.hypot(gx, gz);
        if (dist > 0.7 && dist < gw.radius) {
          const pull = (1 - dist / gw.radius) * 11.5 * this.diff.hazardScale;
          b.vx += (gx / dist) * pull * bdt;
          b.vz += (gz / dist) * pull * bdt;
        }
      }

      b.x += b.vx * bdt;
      b.z += b.vz * bdt;
      b.vy -= worldCfg.gravity * bdt;
      b.y += b.vy * bdt;

      const minY = ARENA.ballRadius + 0.04;
      if (b.y < minY) {
        b.y = minY;
        b.vy = Math.max(this.currentWorld === "space" ? 4.4 : 3.6, Math.abs(b.vy) * 0.8);
      }
      if (b.y > 3.5) {
        b.y = 3.5;
        b.vy = -Math.abs(b.vy) * 0.6;
      }

      // World 1 Mechanic: Nature Glade Mushroom Bumpers
      if (this.currentWorld === "nature" && this.env.natureBumpers) {
        this.env.natureBumpers.forEach((bumper, bIdx) => {
          const dx = b.x - bumper.x;
          const dz = b.z - bumper.z;
          const dist = Math.hypot(dx, dz);
          const minDist = bumper.radius + ARENA.ballRadius;
          if (dist < minDist && dist > 0.01) {
            const nx = dx / dist;
            const nz = dz / dist;
            const speed = Math.min(20, Math.max(14, Math.hypot(b.vx, b.vz) * 1.06));
            b.x = bumper.x + nx * (minDist + 0.05);
            b.z = bumper.z + nz * (minDist + 0.05);
            b.vx = nx * speed;
            b.vz = nz * speed;
            b.vy = 6.6;
            this.score += 50;
            this.env.popBumper(bIdx);
            this.audio.bumperBoing();
            this._vibrate(18);
            this._syncHUD();
          }
        });
      }

      // World 2 Mechanic: Neon Mall Paired Warp Portals
      if (this.currentWorld === "mall" && this.env.mallPortals && b.portalCooldown <= 0) {
        for (let pIdx = 0; pIdx < this.env.mallPortals.length; pIdx++) {
          const portal = this.env.mallPortals[pIdx];
          if (Math.hypot(b.x - portal.x, b.z - portal.z) < portal.radius + ARENA.ballRadius * 0.5) {
            const target = this.env.mallPortals[1 - pIdx];
            b.x = target.x + (target.x < 0 ? 1.1 : -1.1);
            b.z = target.z - 0.5;
            b.vy = 5.8;
            b.vz = -Math.abs(b.vz || ARENA.baseBallSpeed) * 1.05;
            b.portalCooldown = 0.7;
            this.env.flashPortals();
            this.audio.portalWarp();
            this._vibrate(20);
            this._showToast("NEON WARP!");
            break;
          }
        }
      }

      // Arena walls
      const limitX = ARENA.halfW - ARENA.ballRadius;
      if (b.x < -limitX) {
        b.x = -limitX;
        b.vx = Math.abs(b.vx);
        this.audio.wallHit();
      } else if (b.x > limitX) {
        b.x = limitX;
        b.vx = -Math.abs(b.vx);
        this.audio.wallHit();
      }

      const limitBack = -ARENA.halfD + ARENA.ballRadius;
      if (b.z < limitBack) {
        b.z = limitBack;
        b.vz = Math.abs(b.vz);
        this.audio.wallHit();
      }

      // Paddle collision (supports Magnet Catch!)
      const padHalfW = this.paddleWidth / 2 + ARENA.ballRadius * 0.75;
      if (
        b.vz > 0 &&
        b.z >= this.paddleZ - ARENA.paddleDepth / 2 - ARENA.ballRadius &&
        b.z <= this.paddleZ + ARENA.paddleDepth / 2 + 0.25 &&
        Math.abs(b.x - this.paddleX) <= padHalfW
      ) {
        if (this.magnetTimer > 0) {
          b.attached = true;
          b.attachOffsetX = THREE.MathUtils.clamp(b.x - this.paddleX, -this.paddleWidth * 0.4, this.paddleWidth * 0.4);
          this.audio.paddleHit();
          this._vibrate(14);
          continue;
        }
        const hitRatio = THREE.MathUtils.clamp((b.x - this.paddleX) / (this.paddleWidth / 2), -1, 1);
        const speed = Math.min(this.diff.maxBallSpeed, Math.hypot(b.vx, b.vz) * 1.015);
        const bounceAngle = hitRatio * 1.05;
        b.vx = Math.sin(bounceAngle) * speed + this.paddleVelX * 0.14;
        b.vz = -Math.max(4.8, Math.cos(bounceAngle) * speed);
        b.vy = 5.4 + Math.abs(hitRatio) * 1.8;
        b.z = this.paddleZ - ARENA.paddleDepth / 2 - ARENA.ballRadius - 0.02;
        this.combo = 0;
        this.audio.paddleHit();
        this._vibrate(12);
        this._syncHUD();
      }

      // Boss & Orbiting Shield collisions
      if (this.boss) {
        for (let sIdx = this.boss.shields.length - 1; sIdx >= 0; sIdx--) {
          const sh = this.boss.shields[sIdx];
          if (Math.hypot(b.x - sh.x, b.z - sh.z) < 0.95 + ARENA.ballRadius) {
            b.vz = -b.vz;
            sh.hp -= 1;
            this.audio.brickHit(this.combo, sh.hp > 0);
            if (sh.hp <= 0) {
              this.physics.spawnBrickShatter(sh.mesh.position, 0xcbd5e1, { x: b.vx, z: b.vz }, 6);
              this.scene.remove(sh.mesh);
              this.boss.shields.splice(sIdx, 1);
            }
            break;
          }
        }
        if (this.boss && Math.hypot(b.x - this.boss.x, b.z - this.boss.z) < this.boss.radius + ARENA.ballRadius) {
          const nx = (b.x - this.boss.x) / Math.max(0.01, Math.hypot(b.x - this.boss.x, b.z - this.boss.z));
          const nz = (b.z - this.boss.z) / Math.max(0.01, Math.hypot(b.x - this.boss.x, b.z - this.boss.z));
          const spd = Math.hypot(b.vx, b.vz);
          b.vx = nx * spd;
          b.vz = nz * spd;
          this._damageBoss(this.fireballTimer > 0 ? 2 : 1);
        }
      }

      // 3D Brick collisions
      for (let j = this.bricks.length - 1; j >= 0; j--) {
        const brick = this.bricks[j];
        const dx = b.x - brick.x;
        const dy = b.y - brick.y;
        const dz = b.z - brick.z;
        const overlapX = brick.halfW + ARENA.ballRadius - Math.abs(dx);
        const overlapY = brick.halfH + ARENA.ballRadius + 0.35 - Math.abs(dy);
        const overlapZ = brick.halfD + ARENA.ballRadius - Math.abs(dz);

        if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
          if (this.fireballTimer <= 0) {
            if (overlapX < overlapZ) {
              b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
            } else {
              b.vz = dz > 0 ? Math.abs(b.vz) : -Math.abs(b.vz);
            }
            b.vy = 3.8 + Math.random() * 2.2;
          }
          this._hitBrick(j, { x: b.vx, z: b.vz });
          break;
        }
      }

      b.mesh.position.set(b.x, b.y, b.z);
      b.shadowRing.position.set(b.x, 0.03, b.z);
      const heightScale = THREE.MathUtils.clamp(1.15 - (b.y - 0.4) * 0.22, 0.45, 1.15);
      b.shadowRing.scale.setScalar(heightScale);

      b.history.pop();
      b.history.unshift(new THREE.Vector3(b.x, b.y, b.z));
      b.trail.forEach((t, idx) => t.position.copy(b.history[idx]));

      if (this.fireballTimer > 0) {
        b.mesh.material.color.setHex(0xf97316);
        b.mesh.material.emissive.setHex(0xef4444);
      }

      if (b.z > ARENA.halfD + 1.8) {
        this._removeBall(i);
      }
    }

    // Update falling power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.z += p.vz * dt;
      p.y = THREE.MathUtils.lerp(p.y, 0.55, dt * 3);
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y += dt * 3.5;
      p.mesh.rotation.x += dt * 2.1;

      if (Math.abs(p.z - this.paddleZ) < 0.9 && Math.abs(p.x - this.paddleX) < this.paddleWidth / 2 + 0.45) {
        this._applyPowerUp(p.spec);
        this.scene.remove(p.mesh);
        this.powerUps.splice(i, 1);
        continue;
      }
      if (p.z > ARENA.halfD + 1.8) {
        this.scene.remove(p.mesh);
        this.powerUps.splice(i, 1);
      }
    }

    if (this.balls.length === 0) {
      this.lives -= 1;
      this.combo = 0;
      this.audio.lifeLost();
      this._vibrate(45);
      this._syncHUD();
      if (this.lives <= 0) {
        this.state = "gameover";
        this._showOverlay("GAME OVER", `Final Score: ${this.score.toLocaleString()} — Ready for another run?`, "PLAY AGAIN — TAP OR SPACE");
      } else {
        this._spawnBall(true);
      }
    }

    // Level clear check (must clear both bricks and Boss if Boss level)
    if (this.bricks.length === 0 && !this.boss) {
      this.audio.levelClear();
      this.levelIdx += 1;
      if (this.levelIdx >= LEVELS.length) {
        this.state = "victory";
        this._showOverlay("VICTORY!", `You conquered all 3D arenas & the Prism Overlord with ${this.score.toLocaleString()} points!`, "PLAY AGAIN — TAP OR SPACE");
      } else {
        this._showToast(`LEVEL ${this.levelIdx + 1}: ${LEVELS[this.levelIdx].name.toUpperCase()}`);
        while (this.balls.length > 0) this._removeBall(0);
        this._buildLevel(this.levelIdx);
        this._spawnBall(true);
        this._syncHUD();
      }
    }
  }

  _hitBrick(idx, impactVel) {
    const brick = this.bricks[idx];
    if (!brick) return;
    brick.hp -= this.fireballTimer > 0 ? 2 : 1;
    this.combo += 1;
    this.shakeTime = 0.1;
    this._triggerImpactFlash(brick.mesh.position, brick.colorHex);

    if (brick.hp <= 0) {
      const posCopy = brick.mesh.position.clone();
      const wasTnt = brick.tnt;
      this.score += Math.round((brick.armored ? 220 : 120) * Math.min(this.combo, 5) * this.diff.scoreMult);
      this.physics.spawnBrickShatter(posCopy, brick.colorHex, impactVel, 7);
      if (Math.random() < this.diff.powerUpChance) this._spawnPowerUp(brick.x, brick.y, brick.z);
      this.scene.remove(brick.mesh);
      this.bricks.splice(idx, 1);

      if (wasTnt) {
        this._detonateTNT(posCopy, impactVel);
      } else {
        this.audio.brickHit(this.combo, false);
        this._vibrate(12);
        this._settleStackedBricks();
      }
    } else {
      brick.hitFlash = 0.22;
      this.audio.brickHit(this.combo, true);
    }
    this._syncHUD();
  }

  _applyPowerUp(spec) {
    this.audio.powerUp();
    this._vibrate(22);
    this._showToast(spec.label);
    if (spec.type === "WIDE") {
      this.paddleWidth = this.diff.paddleWidth * 1.45;
      this.paddleGroup.scale.x = (this.diff.paddleWidth / ARENA.paddleBaseWidth) * 1.45;
      this.wideTimer = 11;
    } else if (spec.type === "FIREBALL") {
      this.fireballTimer = 7;
    } else if (spec.type === "LASER") {
      this.laserTimer = 9;
      this.laserCooldown = 0.1;
      this.laserCannons.visible = true;
    } else if (spec.type === "MAGNET") {
      this.magnetTimer = 10;
      this.magnetAura.visible = true;
    } else if (spec.type === "SLOWMO") {
      this.slowMoTimer = 8;
    } else if (spec.type === "MULTIBALL") {
      const ref = this.balls[0];
      const baseX = ref ? ref.x : this.paddleX;
      const baseZ = ref ? ref.z : this.paddleZ - 1.2;
      this._spawnBall(false, baseX, baseZ, -6.5, -11.5);
      this._spawnBall(false, baseX, baseZ, 6.5, -11.5);
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const rawDt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    if (this.hitStopTime > 0) {
      this.hitStopTime -= rawDt;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.state === "playing") {
      this._updateGameplay(rawDt, elapsed);
    }

    // Update 3D shockwave rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= rawDt;
      const t = 1 - Math.max(0, sw.life / sw.maxLife);
      sw.mesh.scale.setScalar(1 + t * 5.2);
      sw.mesh.material.opacity = (1 - t) * 0.85;
      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
      }
    }

    if (this.impactLight.intensity > 0.05) {
      this.impactLight.intensity = THREE.MathUtils.lerp(this.impactLight.intensity, 0, rawDt * 10);
    }

    this.physics.update(rawDt);
    if (this.env) this.env.update(elapsed, rawDt);

    const mode = CAMERA_MODES[this.cameraModeIdx];
    const aspect = window.innerWidth / window.innerHeight;
    const portraitPullback = aspect < 1.0 ? THREE.MathUtils.clamp(1.0 / Math.max(aspect, 0.52), 1.0, 1.75) : 1.0;
    const baseRadius = Math.hypot(mode.pos.x, mode.pos.z) * portraitPullback;
    const orbitX = Math.sin(this.cameraOrbitAngle) * baseRadius + this.paddleX * mode.parallax;
    const orbitZ = Math.cos(this.cameraOrbitAngle) * baseRadius;
    const desiredPos = new THREE.Vector3(orbitX, mode.pos.y * (1 + (portraitPullback - 1) * 0.65), orbitZ);

    this.camera.position.lerp(desiredPos, rawDt * 4.5);
    if (this.shakeTime > 0) {
      this.shakeTime -= rawDt;
      this.camera.position.x += (Math.random() - 0.5) * 0.28;
      this.camera.position.y += (Math.random() - 0.5) * 0.2;
    }
    this.camera.lookAt(mode.look.x + this.paddleX * 0.12, mode.look.y, mode.look.z);

    this.renderer.render(this.scene, this.camera);
  }
}

window.__bricks3d = new Bricks3DGame();
