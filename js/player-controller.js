import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class PlayerController {
  constructor(camera, domElement, colliders, statusElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.colliders = colliders;
    this.statusElement = statusElement;
    this.controls = new PointerLockControls(camera, document.body);
    this.keys = { forward:false, backward:false, left:false, right:false, sprint:false };
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.playerRadius = 0.45;
    this.walkSpeed = 4.4;
    this.jogSpeed = 7.2;
    this.eyeHeight = 1.7;
    this.pitch = 0;
    this.yaw = 0;
    this.touchLook = false;
    this.enabled = false;
    this.isFinePointer = matchMedia('(pointer: fine)').matches;
    this.bounds = 118;
    this.camera.position.set(-14,this.eyeHeight,4.6);
    this.camera.rotation.order='YXZ';
    this.bindKeyboard();
    this.bindPointerLock();
    this.bindTouchControls();
  }

  bindKeyboard() {
    const map = { KeyW:'forward',ArrowUp:'forward',KeyS:'backward',ArrowDown:'backward',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'sprint',ShiftRight:'sprint' };
    addEventListener('keydown',e=>{ if(map[e.code]) { this.keys[map[e.code]]=true; e.preventDefault(); } });
    addEventListener('keyup',e=>{ if(map[e.code]) { this.keys[map[e.code]]=false; e.preventDefault(); } });
    addEventListener('blur',()=>Object.keys(this.keys).forEach(k=>this.keys[k]=false));
  }

  bindPointerLock() {
    this.domElement.addEventListener('click',()=>{ if(this.enabled && this.isFinePointer && !this.controls.isLocked) this.controls.lock(); });
    this.controls.addEventListener('lock',()=>{ this.statusElement.textContent='Mouse look active'; });
    this.controls.addEventListener('unlock',()=>{ if(this.enabled) this.statusElement.textContent='Click scene to look'; });
  }

  bindTouchControls() {
    document.querySelectorAll('[data-move]').forEach(button=>{
      const key = button.dataset.move;
      const start = e=>{e.preventDefault();this.keys[key]=true;button.classList.add('is-active');};
      const end = e=>{e.preventDefault();this.keys[key]=false;button.classList.remove('is-active');};
      button.addEventListener('pointerdown',start);
      button.addEventListener('pointerup',end);
      button.addEventListener('pointercancel',end);
      button.addEventListener('pointerleave',end);
    });
    const pad = document.getElementById('lookPad');
    let lastX=0,lastY=0;
    pad.addEventListener('pointerdown',e=>{this.touchLook=true;lastX=e.clientX;lastY=e.clientY;pad.setPointerCapture(e.pointerId);});
    pad.addEventListener('pointermove',e=>{
      if(!this.touchLook)return;
      const dx=e.clientX-lastX,dy=e.clientY-lastY;
      lastX=e.clientX;lastY=e.clientY;
      this.yaw -= dx*0.0052;
      this.pitch -= dy*0.0042;
      this.pitch=Math.max(-1.25,Math.min(1.25,this.pitch));
      this.camera.rotation.set(this.pitch,this.yaw,0);
    });
    const stop=()=>{this.touchLook=false;};
    pad.addEventListener('pointerup',stop); pad.addEventListener('pointercancel',stop);
  }

  start() { this.enabled=true; this.statusElement.textContent=this.isFinePointer?'Click scene to look':'Walking'; }

  collides(x,z) {
    if(Math.abs(x)>this.bounds||Math.abs(z)>this.bounds)return true;
    const r=this.playerRadius;
    return this.colliders.some(c=>x+r>c.minX&&x-r<c.maxX&&z+r>c.minZ&&z-r<c.maxZ);
  }

  update(dt,time) {
    if(!this.enabled)return;
    const moving=this.keys.forward||this.keys.backward||this.keys.left||this.keys.right;
    const speed=this.keys.sprint?this.jogSpeed:this.walkSpeed;
    this.direction.set(Number(this.keys.right)-Number(this.keys.left),0,Number(this.keys.backward)-Number(this.keys.forward));
    if(this.direction.lengthSq()>0)this.direction.normalize();

    const yaw=this.camera.rotation.y;
    const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    const move=new THREE.Vector3().addScaledVector(forward,-this.direction.z).addScaledVector(right,this.direction.x);
    if(move.lengthSq()>0)move.normalize().multiplyScalar(speed*dt);

    const pos=this.camera.position;
    const nextX=pos.x+move.x;
    if(!this.collides(nextX,pos.z))pos.x=nextX;
    const nextZ=pos.z+move.z;
    if(!this.collides(pos.x,nextZ))pos.z=nextZ;
    pos.y=this.eyeHeight+(moving?Math.sin(time*(this.keys.sprint?13:9))*0.035:0);

    if(this.isFinePointer&&this.controls.isLocked){
      this.yaw=this.camera.rotation.y; this.pitch=this.camera.rotation.x;
    }
    if(moving)this.statusElement.textContent=this.keys.sprint?'Jogging':'Walking';
  }
}
