/**
 * Bricks 3D — Main Three.js + Blender GLB + Cannon-es 3D Arcade Game Engine
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ArcadeAudio } from "./audio.js";
import { EnvironmentManager, WORLD_CONFIGS } from "./environments.js";
import { DebrisPhysics } from "./physics.js";

const ARENA = {
  halfW: 9.0,
  halfD: 11.5,
  paddleZ: 9.4,
  paddleBaseWidth: 3.1,
  paddleDepth: 0.72,
  ballRadius: 0.36,
  baseBallSpeed: 13.5,
};

const LEVELS = [
  {
    name: "Classic Arcade",
    rows: [
      "111111111",
      "222222222",
      "111A1A111",
      "333333333",
      "444444444",
    ],
  },
  {
    name: "Twin Fortress",
    rows: [
      "A110A011A",
      "222121222",
      "3A33333A3",
      "444040444",
      "555555555",
    ],
  },
  {
    name: "Prism Core",
    rows: [
      "0011A1100",
      "022222220",
      "33A333A33",
      "0444A4440",
      "005555500",
    ],
  },
];

const CAMERA_MODES = [
  { name: "Arcade 3D", pos: new THREE.Vector3(0, 14.5, 19.2), look: new THREE.Vector3(0, 0, 0.8) },
  { name: "Low Action", pos: new THREE.Vector3(0, 9.2, 18.8), look: new THREE.Vector3(0, 0.4, -1.5) },
  { name: "Overhead", pos: new THREE.Vector3(0, 22.5, 10.5), look: new THREE.Vector3(0, 0, 0.4) },
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

    // Game state
    this.state = "start"; // start | playing | paused | gameover | victory
    this.score = 0;
    this.lives = 3;
    this.levelIdx = 0;
    this.combo = 0;
    this.cameraModeIdx = 0;
    this.currentWorld = "nature";

    this.paddleX = 0;
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
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 180);
    this.camera.position.copy(CAMERA_MODES[0].pos);
    this.camera.lookAt(CAMERA_MODES[0].look);

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
        emissiveIntensity: 0.5,
        roughness: 0.35,
        metalness: 0.45,
      });

    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.8, ARENA.halfD * 2 + 0.45), railMat());
    leftRail.position.set(-ARENA.halfW - 0.22, 0.25, 0);
    leftRail.castShadow = true;

    const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.8, ARENA.halfD * 2 + 0.45), railMat());
    rightRail.position.set(ARENA.halfW + 0.22, 0.25, 0);
    rightRail.castShadow = true;

    const backRail = new THREE.Mesh(new THREE.BoxGeometry(ARENA.halfW * 2 + 0.9, 0.8, 0.45), railMat());
    backRail.position.set(0, 0.25, -ARENA.halfD - 0.22);
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
      // Normalize Blender paddle (~2.1 width) to ARENA.paddleBaseWidth
      model.scale.set(ARENA.paddleBaseWidth / 2.1, 1.35, 1.35);
      this.paddleGroup.add(model);
    } else {
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(ARENA.paddleBaseWidth, 0.45, ARENA.paddleDepth),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.25 })
      );
      fallback.castShadow = true;
      this.paddleGroup.add(fallback);
    }

    this.paddleGroup.position.set(0, 0.35, ARENA.paddleZ);
    this.scene.add(this.paddleGroup);
  }

  _buildLevel(idx) {
    this.bricks.forEach((b) => this.scene.remove(b.mesh));
    this.bricks = [];
    this.powerUps.forEach((p) => this.scene.remove(p.mesh));
    this.powerUps = [];

    const level = LEVELS[idx % LEVELS.length];
    const palette = WORLD_CONFIGS[this.currentWorld].brickPalette;
    const cols = level.rows[0].length;
    const spacingX = 1.82;
    const spacingZ = 1.18;
    const startX = -((cols - 1) * spacingX) / 2;
    const startZ = -8.2;

    level.rows.forEach((rowStr, r) => {
      for (let c = 0; c < rowStr.length; c++) {
        const ch = rowStr[c];
        if (ch === "0") continue;

        const armored = ch === "A";
        const colorHex = armored ? 0xcbd5e1 : palette[(parseInt(ch, 10) - 1 + r) % palette.length];
        const hp = armored ? 2 : 1;

        let mesh;
        const template = armored ? this.models.brick_armored : this.models.brick_standard;
        if (template) {
          mesh = template.clone(true);
          mesh.scale.set(1.62, 1.35, 1.45);
          mesh.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.material = child.material.clone();
              if (!armored) {
                child.material.color.setHex(colorHex);
                child.material.emissive.setHex(colorHex);
                child.material.emissiveIntensity = 0.16;
              }
            }
          });
        } else {
          mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.6, 0.85),
            new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: armored ? 0.8 : 0.2 })
          );
          mesh.castShadow = true;
        }

        const x = startX + c * spacingX;
        const z = startZ + r * spacingZ;
        mesh.position.set(x, 0.42, z);
        this.scene.add(mesh);

        this.bricks.push({
          mesh,
          x,
          z,
          halfW: 0.82,
          halfD: 0.44,
          hp,
          armored,
          colorHex,
          hitFlash: 0,
        });
      }
    });
  }

  _spawnBall(attached = false, x = this.paddleX, z = ARENA.paddleZ - 0.82, vx = 0, vz = -ARENA.baseBallSpeed) {
    const cfg = WORLD_CONFIGS[this.currentWorld];
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(ARENA.ballRadius, 24, 24),
      new THREE.MeshStandardMaterial({
        color: cfg.ballColor,
        emissive: cfg.ballColor,
        emissiveIntensity: 0.55,
        roughness: 0.15,
        metalness: 0.35,
      })
    );
    mesh.castShadow = true;
    mesh.position.set(x, ARENA.ballRadius + 0.05, z);
    this.scene.add(mesh);

    this.balls.push({
      mesh,
      x,
      z,
      vx,
      vz,
      attached,
    });
  }

  _spawnPowerUp(x, z) {
    const spec = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.24, 0.42, 8, 14),
      new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: 0.75,
        roughness: 0.2,
      })
    );
    mesh.position.set(x, 0.45, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.powerUps.push({ mesh, x, z, vz: 5.2, spec });
  }

  switchWorld(worldKey, silent = false) {
    if (!WORLD_CONFIGS[worldKey]) return;
    this.currentWorld = worldKey;
    const cfg = this.env.setWorld(worldKey, this.arenaMeshes);
    this.ui.worldLabel.textContent = cfg.label;
    this.ui.worldBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.worldTarget === worldKey);
    });

    // Recolor non-armored bricks to match the new world palette
    this.bricks.forEach((b, idx) => {
      if (!b.armored) {
        const newColor = cfg.brickPalette[idx % cfg.brickPalette.length];
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
    });

    if (!silent) {
      this.audio.worldSwitch();
      this._showToast(`WORLD: ${cfg.label}`);
    }
  }

  cycleCamera() {
    this.cameraModeIdx = (this.cameraModeIdx + 1) % CAMERA_MODES.length;
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
    this.paddleWidth = ARENA.paddleBaseWidth;
    this.wideTimer = 0;
    this.fireballTimer = 0;
    this.physics.clear();
    this.balls.forEach((b) => this.scene.remove(b.mesh));
    this.balls = [];
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

  _updateGameplay(dt) {
    // Paddle keyboard movement
    const left = this.keys.has("ArrowLeft") || this.keys.has("KeyA");
    const right = this.keys.has("ArrowRight") || this.keys.has("KeyD");
    const moveDir = (right ? 1 : 0) - (left ? 1 : 0);
    const paddleSpeed = 16.5;
    this.paddleVelX = moveDir * paddleSpeed;
    this.paddleX += this.paddleVelX * dt;

    const maxPaddleX = ARENA.halfW - this.paddleWidth / 2 - 0.15;
    this.paddleX = THREE.MathUtils.clamp(this.paddleX, -maxPaddleX, maxPaddleX);
    this.paddleGroup.position.x = this.paddleX;
    this.paddleGroup.rotation.z = THREE.MathUtils.lerp(this.paddleGroup.rotation.z, -moveDir * 0.09, dt * 10);

    // Power-up timers
    if (this.wideTimer > 0) {
      this.wideTimer -= dt;
      if (this.wideTimer <= 0) {
        this.paddleWidth = ARENA.paddleBaseWidth;
        this.paddleGroup.scale.x = 1;
      }
    }
    if (this.fireballTimer > 0) this.fireballTimer -= dt;

    // Update balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      if (b.attached) {
        b.x = this.paddleX;
        b.z = ARENA.paddleZ - 0.85;
        b.mesh.position.set(b.x, ARENA.ballRadius + 0.05, b.z);
        continue;
      }

      b.x += b.vx * dt;
      b.z += b.vz * dt;

      // Side walls
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

      // Back wall
      const limitBack = -ARENA.halfD + ARENA.ballRadius;
      if (b.z < limitBack) {
        b.z = limitBack;
        b.vz = Math.abs(b.vz);
        this.audio.wallHit();
      }

      // Paddle collision with English/spin
      const padHalfW = this.paddleWidth / 2 + ARENA.ballRadius * 0.7;
      if (
        b.vz > 0 &&
        b.z >= ARENA.paddleZ - ARENA.paddleDepth / 2 - ARENA.ballRadius &&
        b.z <= ARENA.paddleZ + ARENA.paddleDepth / 2 &&
        Math.abs(b.x - this.paddleX) <= padHalfW
      ) {
        const hitRatio = THREE.MathUtils.clamp((b.x - this.paddleX) / (this.paddleWidth / 2), -1, 1);
        const speed = Math.min(20, Math.hypot(b.vx, b.vz) * 1.015);
        const bounceAngle = hitRatio * 1.05;
        b.vx = Math.sin(bounceAngle) * speed + this.paddleVelX * 0.14;
        b.vz = -Math.max(4.5, Math.cos(bounceAngle) * speed);
        b.z = ARENA.paddleZ - ARENA.paddleDepth / 2 - ARENA.ballRadius - 0.02;
        this.combo = 0;
        this.audio.paddleHit();
        this._syncHUD();
      }

      // Brick collisions
      for (let j = this.bricks.length - 1; j >= 0; j--) {
        const brick = this.bricks[j];
        const dx = b.x - brick.x;
        const dz = b.z - brick.z;
        const overlapX = brick.halfW + ARENA.ballRadius - Math.abs(dx);
        const overlapZ = brick.halfD + ARENA.ballRadius - Math.abs(dz);

        if (overlapX > 0 && overlapZ > 0) {
          if (this.fireballTimer <= 0) {
            if (overlapX < overlapZ) {
              b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
            } else {
              b.vz = dz > 0 ? Math.abs(b.vz) : -Math.abs(b.vz);
            }
          }

          brick.hp -= this.fireballTimer > 0 ? 2 : 1;
          this.combo += 1;
          this.shakeTime = 0.09;

          if (brick.hp <= 0) {
            this.score += (brick.armored ? 200 : 100) * Math.min(this.combo, 5);
            this.audio.brickHit(this.combo, false);
            this.physics.spawnBrickShatter(brick.mesh.position, brick.colorHex, { x: b.vx, z: b.vz });
            if (Math.random() < 0.2) this._spawnPowerUp(brick.x, brick.z);
            this.scene.remove(brick.mesh);
            this.bricks.splice(j, 1);
          } else {
            brick.hitFlash = 0.2;
            this.audio.brickHit(this.combo, true);
          }
          this._syncHUD();
          break;
        }
      }

      b.mesh.position.set(b.x, ARENA.ballRadius + 0.05, b.z);
      if (this.fireballTimer > 0) {
        b.mesh.material.color.setHex(0xf97316);
        b.mesh.material.emissive.setHex(0xef4444);
      }

      // Missed ball
      if (b.z > ARENA.halfD + 1.5) {
        this.scene.remove(b.mesh);
        this.balls.splice(i, 1);
      }
    }

    // Update falling power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.z += p.vz * dt;
      p.mesh.position.z = p.z;
      p.mesh.rotation.y += dt * 3.5;
      p.mesh.rotation.x += dt * 2.1;

      if (Math.abs(p.z - ARENA.paddleZ) < 0.85 && Math.abs(p.x - this.paddleX) < this.paddleWidth / 2 + 0.4) {
        this._applyPowerUp(p.spec);
        this.scene.remove(p.mesh);
        this.powerUps.splice(i, 1);
        continue;
      }

      if (p.z > ARENA.halfD + 1.5) {
        this.scene.remove(p.mesh);
        this.powerUps.splice(i, 1);
      }
    }

    // Animate armored brick hit flash
    this.bricks.forEach((b) => {
      if (b.hitFlash > 0) {
        b.hitFlash -= dt;
        const s = 1 + b.hitFlash * 0.45;
        b.mesh.scale.set(1.62 * s, 1.35 * s, 1.45 * s);
      }
    });

    // Check life lost
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

    // Check level clear
    if (this.bricks.length === 0) {
      this.audio.levelClear();
      this.levelIdx += 1;
      if (this.levelIdx >= LEVELS.length) {
        this.state = "victory";
        this._showOverlay("VICTORY!", `You cleared all 3 arenas with ${this.score.toLocaleString()} points!`, "PLAY AGAIN — PRESS SPACE");
      } else {
        this._showToast(`LEVEL ${this.levelIdx + 1}: ${LEVELS[this.levelIdx].name.toUpperCase()}`);
        this.balls.forEach((b) => this.scene.remove(b.mesh));
        this.balls = [];
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
      const baseZ = ref ? ref.z : ARENA.paddleZ - 1.2;
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

    this.physics.update(dt);
    if (this.env) this.env.update(elapsed);

    // Smooth camera transition + subtle micro screen-shake
    const targetCam = CAMERA_MODES[this.cameraModeIdx];
    this.camera.position.lerp(targetCam.pos, dt * 4.5);
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      this.camera.position.x += (Math.random() - 0.5) * 0.22;
      this.camera.position.y += (Math.random() - 0.5) * 0.16;
    }
    this.camera.lookAt(targetCam.look);

    this.renderer.render(this.scene, this.camera);
  }
}

window.__bricks3d = new Bricks3DGame();
