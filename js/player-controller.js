import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class PlayerController {
  constructor(camera, domElement, colliders, statusElement, { startPosition, bounds = 185 } = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.colliders = colliders;
    this.statusElement = statusElement;
    this.controls = new PointerLockControls(camera, document.body);
    this.keys = { forward: false, backward: false, left: false, right: false, sprint: false };
    this.direction = new THREE.Vector3();
    this.playerRadius = 0.42;
    this.walkSpeed = 3.8;
    this.jogSpeed = 6.4;
    this.eyeHeight = 1.69;
    this.pitch = 0;
    this.yaw = 0;
    this.touchLook = false;
    this.enabled = false;
    this.isFinePointer = matchMedia('(pointer: fine)').matches;
    this.bounds = bounds;
    this.camera.position.copy(startPosition || new THREE.Vector3(0, this.eyeHeight, 0));
    this.camera.position.y = this.eyeHeight;
    this.camera.rotation.order = 'YXZ';
    this.bindKeyboard();
    this.bindPointerLock();
    this.bindTouchControls();
  }

  bindKeyboard() {
    const map = {
      KeyW: 'forward', ArrowUp: 'forward',
      KeyS: 'backward', ArrowDown: 'backward',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
      ShiftLeft: 'sprint', ShiftRight: 'sprint'
    };
    addEventListener('keydown', event => {
      if (!map[event.code]) return;
      this.keys[map[event.code]] = true;
      event.preventDefault();
    });
    addEventListener('keyup', event => {
      if (!map[event.code]) return;
      this.keys[map[event.code]] = false;
      event.preventDefault();
    });
    addEventListener('blur', () => Object.keys(this.keys).forEach(key => { this.keys[key] = false; }));
  }

  bindPointerLock() {
    this.domElement.addEventListener('click', () => {
      if (this.enabled && this.isFinePointer && !this.controls.isLocked) this.controls.lock();
    });
    this.controls.addEventListener('lock', () => { this.statusElement.textContent = 'Mouse look active'; });
    this.controls.addEventListener('unlock', () => {
      if (this.enabled) this.statusElement.textContent = 'Click scene to look';
    });
  }

  bindTouchControls() {
    document.querySelectorAll('[data-move]').forEach(button => {
      const key = button.dataset.move;
      const start = event => {
        event.preventDefault();
        this.keys[key] = true;
        button.classList.add('is-active');
      };
      const end = event => {
        event.preventDefault();
        this.keys[key] = false;
        button.classList.remove('is-active');
      };
      button.addEventListener('pointerdown', start);
      button.addEventListener('pointerup', end);
      button.addEventListener('pointercancel', end);
      button.addEventListener('pointerleave', end);
    });

    const pad = document.getElementById('lookPad');
    let lastX = 0;
    let lastY = 0;
    pad.addEventListener('pointerdown', event => {
      this.touchLook = true;
      lastX = event.clientX;
      lastY = event.clientY;
      pad.setPointerCapture(event.pointerId);
    });
    pad.addEventListener('pointermove', event => {
      if (!this.touchLook) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      this.yaw -= dx * 0.0048;
      this.pitch -= dy * 0.0039;
      this.pitch = Math.max(-1.25, Math.min(1.25, this.pitch));
      this.camera.rotation.set(this.pitch, this.yaw, 0);
    });
    const stop = () => { this.touchLook = false; };
    pad.addEventListener('pointerup', stop);
    pad.addEventListener('pointercancel', stop);
  }

  start() {
    this.enabled = true;
    this.statusElement.textContent = this.isFinePointer ? 'Click scene to look' : 'Walking';
  }

  collides(x, z) {
    if (Math.abs(x) > this.bounds || Math.abs(z) > this.bounds) return true;
    const radius = this.playerRadius;
    return this.colliders.some(collider => (
      x + radius > collider.minX && x - radius < collider.maxX &&
      z + radius > collider.minZ && z - radius < collider.maxZ
    ));
  }

  update(deltaTime, elapsed) {
    if (!this.enabled) return;
    const moving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
    const speed = this.keys.sprint ? this.jogSpeed : this.walkSpeed;
    this.direction.set(
      Number(this.keys.right) - Number(this.keys.left),
      0,
      Number(this.keys.backward) - Number(this.keys.forward)
    );
    if (this.direction.lengthSq() > 0) this.direction.normalize();

    const yaw = this.camera.rotation.y;
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const movement = new THREE.Vector3()
      .addScaledVector(forward, -this.direction.z)
      .addScaledVector(right, this.direction.x);
    if (movement.lengthSq() > 0) movement.normalize().multiplyScalar(speed * deltaTime);

    const position = this.camera.position;
    const nextX = position.x + movement.x;
    if (!this.collides(nextX, position.z)) position.x = nextX;
    const nextZ = position.z + movement.z;
    if (!this.collides(position.x, nextZ)) position.z = nextZ;
    const bobSpeed = this.keys.sprint ? 12.5 : 8.5;
    position.y = this.eyeHeight + (moving ? Math.sin(elapsed * bobSpeed) * 0.028 : 0);

    if (this.isFinePointer && this.controls.isLocked) {
      this.yaw = this.camera.rotation.y;
      this.pitch = this.camera.rotation.x;
    }
    if (moving) this.statusElement.textContent = this.keys.sprint ? 'Jogging' : 'Walking';
  }
}
