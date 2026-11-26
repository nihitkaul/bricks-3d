/**
 * Bricks 3D v2 — True Multi-Story 3D Arcade Brick Breaker
 * Features:
 *   - Stacked multi-tier 3D brick towers & arches with gravity drop when lower bricks shatter
 *   - 3D arcing ball physics (x, y, z) with ground shadow ring & glowing 3D motion trail
 *   - 3D paddle control (←/→ or A/D + ↑/↓ or W/S for 3D depth)
 *   - Dynamic parallax 3D chase camera + Q/E orbit + C camera presets
 *   - 6 Blender-authored GLB models + cannon-es 3D rigid-body shattering shards
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

// Multi-story 3D levels: each layer is stacked vertically in Y!
const LEVELS = [
  {
    name: "3D Stepped Citadel",
    layers: [
      [
        "111111111",
        "222222222",
        "111A1A111",
        "333333333",
        "444444444",
      ],
      [
        "0111A1110",
        "002222200",
        "0003A3000",
        "004404400",
        "000000000",
      ],
      [
        "000AAA000",
        "000050000",
        "000000000",
        "000000000",
        "000000000",
      ],
    ],
  },
  {
    name: "Twin 3D Towers",
    layers: [
      [
        "A110A011A",
        "222121222",
        "3A33333A3",
        "444040444",
        "555555555",
      ],
      [
        "110000011",
        "2200A0022",
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
    name: "Prism Pyramid",
    layers: [
      [
        "1111A1111",
        "222222222",
        "33A333A33",
        "4444A4444",
        "555555555",
      ],
      [
        "001111100",
        "0222A2220",
        "003333300",
        "000444000",
        "000000000",
      ],
      [
        "0000A0000",
        "0005A5000",
        "000050000",
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
];

class Bricks3DGame {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.audio = new ArcadeAudio();
    this.models = {};
    this.keys = new Set();

    this.state = "start";
    this.score = 0;
    this.lives = 3;
    this.levelIdx = 0;
    this.combo = 0;
    this.cameraModeIdx = 0;
    this.cameraOrbitAngle = 0;
    this.currentWorld = "nature";

    this.paddleX = 0;
    this.paddleZ = ARENA.paddleZDefault;
    this.paddleVelX = 0;
    this.paddleWidth = ARENA.paddleBaseWidth;
    this.wideTimer = 0;
    this.fireballTimer = 0;
    this.shakeTime = 0;

    this.bricks = [];
    this.balls = [];
    this.powerUps = [];

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
      toast: document.getElementById("toast-banner"),
      overlay: document.getElementById("overlay"),
      overlayTitle: document.getElementById("overlay-title"),
      overlaySubtitle: document.getElementById("overlay-subtitle"),
      overlayCta: document.getElementById("overlay-cta"),
      worldBtns: Array.from(document.querySelectorAll(".world-btn")),
      btnCamera: document.getElementById("btn-camera"),
      btnAudio: document.getElementById("btn-audio"),
      btnPause: document.getElementById("btn-pause"),
    };

    this.ui.overlayCta.addEventListener("click", () => this._handlePrimaryAction());
    this.ui.btnCamera.addEventListener("click", () => this.cycleCamera());
    this.ui.btnAudio.addEventListener("click", () => this.toggleAudio());
    this.ui.btnPause.addEventListener("click", () => this.togglePause());

    this.ui.worldBtns.forEach((btn) => {
      btn.addEventListener("click", () => this.switchWorld(btn.dataset.worldTarget));
    });

    window.addEventListener("keydown", (e) => this._onKeyDown(e));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("resize", () => this._onResize());
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
    this.camera.position.copy(CAMERA_MODES[0].pos);
    this.camera.lookAt(CAMERA_MODES[0].look);

    // Dynamic impact flash light for 3D hit illumination
    this.impactLight = new THREE.PointLight(0xffffff, 0, 14);
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

    // Taller beveled 3D arena walls + subtle translucent energy glass above rails
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
      "tree_nature",
      "planter_mall",
      "satellite_space",
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

    this.paddleGroup.position.set(0, 0.42, this.paddleZ);
    this.scene.add(this.paddleGroup);
  }

  _buildLevel(idx) {
    this.bricks.forEach((b) => this.scene.remove(b.mesh));
    this.bricks = [];
    this.powerUps.forEach((p) => this.scene.remove(p.mesh));
    this.powerUps = [];

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
          const colorHex = armored
            ? 0xcbd5e1
            : palette[(parseInt(ch, 10) - 1 + r + layerIdx) % palette.length];
          const hp = armored ? 2 : 1;

          let mesh;
          const template = armored ? this.models.brick_armored : this.models.brick_standard;
          if (template) {
            mesh = template.clone(true);
            mesh.scale.set(1.62, 1.55, 1.48);
            mesh.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material = child.material.clone();
                if (!armored) {
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
            colorHex,
            hitFlash: 0,
          });
        }
      });
    });
  }

  _settleStackedBricks() {
    // When lower bricks shatter, upper-story bricks physically drop down a level
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

    // Ground shadow ring directly underneath ball to visualize 3D height
    const shadowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.38, 20),
      new THREE.MeshBasicMaterial({ color: cfg.paddleGlow, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    shadowRing.rotation.x = -Math.PI / 2;
    shadowRing.position.set(x, 0.03, z);
    this.scene.add(shadowRing);

    // Glowing 3D motion trail spheres
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

  switchWorld(worldKey, silent = false) {
    if (!WORLD_CONFIGS[worldKey]) return;
    this.currentWorld = worldKey;
    const cfg = this.env.setWorld(worldKey, this.arenaMeshes);
    this.ui.worldLabel.textContent = cfg.label;
    this.ui.worldBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.worldTarget === worldKey);
    });

    this.bricks.forEach((b, idx) => {
      if (!b.armored) {
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
      this._showToast(`WORLD: ${cfg.label}`);
    }
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
      this._showOverlay("PAUSED", "Take a breather or switch worlds with 1, 2, 3.", "RESUME — PRESS SPACE");
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
    this._toastTimer = setTimeout(() => this.ui.toast.classList.add("hidden"), 1600);
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
    }
  }

  _launchAttachedBalls() {
    this.balls.forEach((b) => {
      if (b.attached) {
        b.attached = false;
        const angle = (Math.random() - 0.5) * 0.55;
        b.vx = Math.sin(angle) * ARENA.baseBallSpeed;
        b.vz = -Math.cos(angle) * ARENA.baseBallSpeed;
        b.vy = 5.4;
        this.audio.paddleHit();
      }
    });
  }

  _restartGame() {
    this.score = 0;
    this.lives = 3;
    this.levelIdx = 0;
    this.combo = 0;
    this.paddleX = 0;
    this.paddleZ = ARENA.paddleZDefault;
    this.paddleWidth = ARENA.paddleBaseWidth;
    this.wideTimer = 0;
    this.fireballTimer = 0;
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
    this.camera.aspect = window.innerWidth / window.innerHeight;
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
    this.impactLight.intensity = 4.2;
  }

  _updateGameplay(dt) {
    // 3D Paddle movement (X + optional Z depth with Up/Down or W/S)
    const left = this.keys.has("ArrowLeft") || this.keys.has("KeyA");
    const right = this.keys.has("ArrowRight") || this.keys.has("KeyD");
    const forward = this.keys.has("ArrowUp") || this.keys.has("KeyW");
    const back = this.keys.has("ArrowDown") || this.keys.has("KeyS");

    const moveDirX = (right ? 1 : 0) - (left ? 1 : 0);
    const moveDirZ = (back ? 1 : 0) - (forward ? 1 : 0);

    this.paddleVelX = moveDirX * 17.0;
    this.paddleX += this.paddleVelX * dt;
    this.paddleZ += moveDirZ * 8.5 * dt;

    const maxPaddleX = ARENA.halfW - this.paddleWidth / 2 - 0.15;
    this.paddleX = THREE.MathUtils.clamp(this.paddleX, -maxPaddleX, maxPaddleX);
    this.paddleZ = THREE.MathUtils.clamp(this.paddleZ, ARENA.paddleZMin, ARENA.paddleZMax);

    this.paddleGroup.position.x = this.paddleX;
    this.paddleGroup.position.z = this.paddleZ;
    this.paddleGroup.rotation.z = THREE.MathUtils.lerp(this.paddleGroup.rotation.z, -moveDirX * 0.12, dt * 11);
    this.paddleGroup.rotation.x = THREE.MathUtils.lerp(this.paddleGroup.rotation.x, moveDirZ * 0.08, dt * 10);

    // Optional Q/E camera orbit
    if (this.keys.has("KeyQ")) this.cameraOrbitAngle -= dt * 1.1;
    if (this.keys.has("KeyE")) this.cameraOrbitAngle += dt * 1.1;
    this.cameraOrbitAngle = THREE.MathUtils.clamp(this.cameraOrbitAngle, -0.75, 0.75);

    if (this.wideTimer > 0) {
      this.wideTimer -= dt;
      if (this.wideTimer <= 0) {
        this.paddleWidth = ARENA.paddleBaseWidth;
        this.paddleGroup.scale.x = 1;
      }
    }
    if (this.fireballTimer > 0) this.fireballTimer -= dt;

    // Smoothly drop stacked bricks whose lower support was destroyed
    this.bricks.forEach((b) => {
      if (b.y > b.targetY) {
        b.y = Math.max(b.targetY, b.y - dt * 5.8);
        b.mesh.position.y = b.y;
      }
      if (b.hitFlash > 0) {
        b.hitFlash -= dt;
        const s = 1 + b.hitFlash * 0.45;
        b.mesh.scale.set(1.62 * s, 1.55 * s, 1.48 * s);
      }
    });

    // Update balls in full 3D (X, Y arc with gravity, Z)
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      if (b.attached) {
        b.x = this.paddleX;
        b.y = ARENA.ballRadius + 0.08;
        b.z = this.paddleZ - 0.85;
        b.mesh.position.set(b.x, b.y, b.z);
        b.shadowRing.position.set(b.x, 0.03, b.z);
        b.trail.forEach((t) => t.position.set(b.x, b.y, b.z));
        continue;
      }

      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.vy -= 14.5 * dt; // 3D gravity arc
      b.y += b.vy * dt;

      // Floor 3D bounce
      const minY = ARENA.ballRadius + 0.04;
      if (b.y < minY) {
        b.y = minY;
        b.vy = Math.max(3.6, Math.abs(b.vy) * 0.78);
      }
      // Ceiling soft cap so ball stays inside brick tower zone
      if (b.y > 3.2) {
        b.y = 3.2;
        b.vy = -Math.abs(b.vy) * 0.6;
      }

      // Side & back walls
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

      // 3D Paddle collision (generous Y capture so 3D arcs feel crisp & fair)
      const padHalfW = this.paddleWidth / 2 + ARENA.ballRadius * 0.75;
      if (
        b.vz > 0 &&
        b.z >= this.paddleZ - ARENA.paddleDepth / 2 - ARENA.ballRadius &&
        b.z <= this.paddleZ + ARENA.paddleDepth / 2 + 0.25 &&
        Math.abs(b.x - this.paddleX) <= padHalfW
      ) {
        const hitRatio = THREE.MathUtils.clamp((b.x - this.paddleX) / (this.paddleWidth / 2), -1, 1);
        const speed = Math.min(20.5, Math.hypot(b.vx, b.vz) * 1.015);
        const bounceAngle = hitRatio * 1.05;
        b.vx = Math.sin(bounceAngle) * speed + this.paddleVelX * 0.14;
        b.vz = -Math.max(4.8, Math.cos(bounceAngle) * speed);
        b.vy = 5.4 + Math.abs(hitRatio) * 1.8; // loft into upper 3D brick tiers!
        b.z = this.paddleZ - ARENA.paddleDepth / 2 - ARENA.ballRadius - 0.02;
        this.combo = 0;
        this.audio.paddleHit();
        this._syncHUD();
      }

      // 3D Brick collisions (checks X, Z, and nearest vertical Y tier)
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

          brick.hp -= this.fireballTimer > 0 ? 2 : 1;
          this.combo += 1;
          this.shakeTime = 0.1;
          this._triggerImpactFlash(brick.mesh.position, brick.colorHex);

          if (brick.hp <= 0) {
            this.score += (brick.armored ? 220 : 120) * Math.min(this.combo, 5);
            this.audio.brickHit(this.combo, false);
            this.physics.spawnBrickShatter(brick.mesh.position, brick.colorHex, { x: b.vx, z: b.vz }, 7);
            if (Math.random() < 0.18) this._spawnPowerUp(brick.x, brick.y, brick.z);
            this.scene.remove(brick.mesh);
            this.bricks.splice(j, 1);
            this._settleStackedBricks();
          } else {
            brick.hitFlash = 0.22;
            this.audio.brickHit(this.combo, true);
          }
          this._syncHUD();
          break;
        }
      }

      // Sync 3D ball, ground shadow ring, and motion trail
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
      this._syncHUD();
      if (this.lives <= 0) {
        this.state = "gameover";
        this._showOverlay("GAME OVER", `Final Score: ${this.score.toLocaleString()} — Ready for another run?`, "PLAY AGAIN — PRESS SPACE");
      } else {
        this._spawnBall(true);
      }
    }

    if (this.bricks.length === 0) {
      this.audio.levelClear();
      this.levelIdx += 1;
      if (this.levelIdx >= LEVELS.length) {
        this.state = "victory";
        this._showOverlay("VICTORY!", `You cleared all 3D arenas with ${this.score.toLocaleString()} points!`, "PLAY AGAIN — PRESS SPACE");
      } else {
        this._showToast(`LEVEL ${this.levelIdx + 1}: ${LEVELS[this.levelIdx].name.toUpperCase()}`);
        while (this.balls.length > 0) this._removeBall(0);
        this._buildLevel(this.levelIdx);
        this._spawnBall(true);
        this._syncHUD();
      }
    }
  }

  _applyPowerUp(spec) {
    this.audio.powerUp();
    this._showToast(spec.label);
    if (spec.type === "WIDE") {
      this.paddleWidth = ARENA.paddleBaseWidth * 1.45;
      this.paddleGroup.scale.x = 1.45;
      this.wideTimer = 11;
    } else if (spec.type === "FIREBALL") {
      this.fireballTimer = 7;
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
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    if (this.state === "playing") {
      this._updateGameplay(dt);
    }

    if (this.impactLight.intensity > 0.05) {
      this.impactLight.intensity = THREE.MathUtils.lerp(this.impactLight.intensity, 0, dt * 10);
    }

    this.physics.update(dt);
    if (this.env) this.env.update(elapsed);

    // Dynamic 3D parallax + orbit camera
    const mode = CAMERA_MODES[this.cameraModeIdx];
    const radius = Math.hypot(mode.pos.x, mode.pos.z);
    const orbitX = Math.sin(this.cameraOrbitAngle) * radius + this.paddleX * mode.parallax;
    const orbitZ = Math.cos(this.cameraOrbitAngle) * radius;
    const desiredPos = new THREE.Vector3(orbitX, mode.pos.y, orbitZ);

    this.camera.position.lerp(desiredPos, dt * 4.5);
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      this.camera.position.x += (Math.random() - 0.5) * 0.24;
      this.camera.position.y += (Math.random() - 0.5) * 0.18;
    }
    this.camera.lookAt(mode.look.x + this.paddleX * 0.12, mode.look.y, mode.look.z);

    this.renderer.render(this.scene, this.camera);
  }
}

window.__bricks3d = new Bricks3DGame();
