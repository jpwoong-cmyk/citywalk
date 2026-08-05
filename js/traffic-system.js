import * as THREE from 'three';
import { seededRandom } from './materials.js';

function mat(color, opts={}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts }); }

class MovingScooter {
  constructor(scene, seed, laneZ, direction=1) {
    this.rand = seededRandom(seed);
    this.direction = direction;
    this.speed = 5 + this.rand()*4;
    this.group = this.buildScooter();
    this.group.position.set((this.rand()*220-110),0,laneZ);
    this.group.rotation.y = direction>0 ? -Math.PI/2 : Math.PI/2;
    scene.add(this.group);
  }

  buildScooter() {
    const g = new THREE.Group();
    const rubber = mat(0x151819,{roughness:0.78});
    const metal = mat(0x6d7476,{metalness:0.65,roughness:0.35});
    const paint = mat([0xb03730,0x2d607c,0xe6dfd2,0x383d40][Math.floor(this.rand()*4)],{metalness:0.22,roughness:0.38});
    for(const z of [-0.72,0.72]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.32,0.07,9,20),rubber); w.rotation.y=Math.PI/2; w.position.set(0,0.35,z); g.add(w); }
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46,0.43,1.35),paint); body.position.y=0.65; g.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.14,0.72),mat(0x242729)); seat.position.set(0,0.99,0.12); g.add(seat);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.9,8),metal); fork.rotation.x=0.18; fork.position.set(0,0.82,-0.62); g.add(fork);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.05,0.05),metal); handle.position.set(0,1.3,-0.72); g.add(handle);

    const skin = mat(0xd5a07a,{roughness:0.72});
    const shirt = mat([0x325d6c,0x8e433b,0xd2b14f,0x465c43][Math.floor(this.rand()*4)],{roughness:0.8});
    const rider = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27,0.58,4,8),shirt); torso.position.set(0,1.64,0.05); torso.rotation.x=-0.24; rider.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21,14,10),skin); head.position.set(0,2.25,-0.1); rider.add(head);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.225,14,8,0,Math.PI*2,0,Math.PI*0.62),paint); helmet.position.set(0,2.32,-0.1); rider.add(helmet);
    const arms = new THREE.Mesh(new THREE.BoxGeometry(0.78,0.11,0.11),skin); arms.position.set(0,1.82,-0.42); arms.rotation.x=-0.25; rider.add(arms);
    rider.scale.setScalar(0.75);
    g.add(rider);
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    return g;
  }

  update(dt) {
    this.group.position.x += this.direction*this.speed*dt;
    if(this.group.position.x>122) this.group.position.x=-122;
    if(this.group.position.x<-122) this.group.position.x=122;
    this.group.position.y = Math.sin(this.group.position.x*0.6)*0.012;
  }
}

export class TrafficSystem {
  constructor(scene) {
    this.vehicles=[];
    for(let i=0;i<8;i++) this.vehicles.push(new MovingScooter(scene,700+i*13,i%2===0?-2.4:2.4,i%2===0?1:-1));
  }
  update(dt){this.vehicles.forEach(v=>v.update(dt));}
}
