import * as THREE from 'three';
import { seededRandom } from './materials.js';

const skinTones = [0xf0c7a5, 0xd6a27c, 0xc88963, 0xa86e4f, 0xe5b78d];
const shirtColors = [0x264f6a,0x9a423d,0xd2b047,0x4c7353,0xe6ded1,0x72548b,0x30363a,0xb56d37];
const trouserColors = [0x252b31,0x3e4e5e,0x665b4b,0x263b42,0x59605f];

function material(color, roughness=0.78) { return new THREE.MeshStandardMaterial({ color, roughness }); }
function shadowify(root) { root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }

class ProceduralPerson {
  constructor(seed, path, scene) {
    this.rand = seededRandom(seed);
    this.path = path;
    this.progress = this.rand();
    this.speed = 0.55 + this.rand() * 0.75;
    this.phase = this.rand() * Math.PI * 2;
    this.direction = this.rand() > 0.5 ? 1 : -1;
    this.group = new THREE.Group();
    this.group.name = `Pedestrian-${seed}`;
    this.build();
    scene.add(this.group);
  }

  build() {
    const heightScale = 0.60 + this.rand() * 0.09;
    const bodyWidth = 0.72 + this.rand() * 0.18;
    const skin = material(skinTones[Math.floor(this.rand()*skinTones.length)],0.7);
    const shirt = material(shirtColors[Math.floor(this.rand()*shirtColors.length)],0.82);
    const trousers = material(trouserColors[Math.floor(this.rand()*trouserColors.length)],0.86);
    const shoes = material(this.rand()>0.5 ? 0x22282b : 0x79563c,0.9);
    const hair = material([0x171615,0x31261f,0x463126][Math.floor(this.rand()*3)],0.88);

    this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36*bodyWidth,0.66,5,10),shirt);
    this.torso.position.y = 1.72;
    this.torso.scale.set(1,1.06,0.72);
    this.group.add(this.torso);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.25,18,14),skin);
    this.head.position.y = 2.58;
    this.head.scale.set(0.88,1.05,0.9);
    this.group.add(this.head);
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.255,18,10,0,Math.PI*2,0,Math.PI*0.55),hair);
    hairCap.position.set(0,2.67,0);
    this.group.add(hairCap);

    this.leftArm = this.makeLimb(0.12,0.72,shirt,skin); this.leftArm.position.set(-0.42*bodyWidth,2.03,0); this.group.add(this.leftArm);
    this.rightArm = this.makeLimb(0.12,0.72,shirt,skin); this.rightArm.position.set(0.42*bodyWidth,2.03,0); this.group.add(this.rightArm);
    this.leftLeg = this.makeLeg(trousers,shoes); this.leftLeg.position.set(-0.19,0.87,0); this.group.add(this.leftLeg);
    this.rightLeg = this.makeLeg(trousers,shoes); this.rightLeg.position.set(0.19,0.87,0); this.group.add(this.rightLeg);

    if (this.rand() > 0.78) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.52,0.17),material(this.rand()>0.5?0x6e4a31:0x243e4d,0.85));
      bag.position.set(0.48,1.62,0.16); bag.rotation.z = -0.12; this.group.add(bag);
    }
    if (this.rand() > 0.88) {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.05,20),material(0xc79e50));
      brim.position.set(0,2.82,0); this.group.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.23,0.25,0.22,18),material(0xc79e50));
      crown.position.set(0,2.92,0); this.group.add(crown);
    }

    this.group.scale.setScalar(heightScale);
    shadowify(this.group);
  }

  makeLimb(radius,length,upperMat,skinMat) {
    const pivot = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(radius,length*0.55,4,8),upperMat); upper.position.y = -length*0.22; pivot.add(upper);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(radius*0.88,10,8),skinMat); hand.position.y = -length*0.62; pivot.add(hand);
    return pivot;
  }

  makeLeg(trouserMat,shoeMat) {
    const pivot = new THREE.Group();
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14,0.66,4,8),trouserMat); leg.position.y = -0.34; pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.16,0.4),shoeMat); shoe.position.set(0,-0.79,-0.08); pivot.add(shoe);
    return pivot;
  }

  update(dt, time) {
    const length = this.path.getLength();
    this.progress = (this.progress + this.direction * dt * this.speed / length + 1) % 1;
    const point = this.path.getPointAt(this.progress);
    const tangent = this.path.getTangentAt(this.progress).multiplyScalar(this.direction);
    this.group.position.copy(point);
    this.group.rotation.y = Math.atan2(tangent.x,tangent.z);
    const gait = Math.sin(time * 7.2 * this.speed + this.phase);
    this.leftLeg.rotation.x = gait * 0.55;
    this.rightLeg.rotation.x = -gait * 0.55;
    this.leftArm.rotation.x = -gait * 0.48;
    this.rightArm.rotation.x = gait * 0.48;
    this.torso.position.y = 1.72 + Math.abs(Math.sin(time*7.2*this.speed+this.phase))*0.025;
    this.head.rotation.y = Math.sin(time*0.7+this.phase)*0.1;
  }
}

export class CrowdSystem {
  constructor(scene, count=28) {
    this.scene = scene;
    this.people = [];
    this.paths = this.createPaths();
    for (let i=0;i<count;i++) this.people.push(new ProceduralPerson(1200+i*19,this.paths[i%this.paths.length],scene));
  }

  createPaths() {
    const makeLoop = points => new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0.12,z)),true,'catmullrom',0.18);
    return [
      makeLoop([[-108,-9],[-70,-9],[-35,-9],[0,-9],[36,-9],[75,-9],[108,-9],[108,-12],[-108,-12]]),
      makeLoop([[-108,9],[-72,9],[-32,9],[5,9],[42,9],[76,9],[108,9],[108,12],[-108,12]]),
      makeLoop([[-63,-82],[-63,-45],[-63,-15],[-63,20],[-63,52],[-63,82],[-60,82],[-60,-82]]),
      makeLoop([[-49,-82],[-49,-42],[-49,-16],[-49,18],[-49,51],[-49,82],[-46,82],[-46,-82]]),
      makeLoop([[42,-80],[42,-45],[42,-14],[42,22],[42,55],[42,80],[45,80],[45,-80]]),
      makeLoop([[55,-80],[55,-45],[55,-14],[55,22],[55,55],[55,80],[58,80],[58,-80]]),
      makeLoop([[-100,-55],[-60,-55],[-20,-55],[20,-55],[60,-55],[104,-55],[104,-59],[-100,-59]]),
      makeLoop([[69,37],[106,37],[108,72],[70,72]])
    ];
  }

  update(dt,time) { this.people.forEach(p=>p.update(dt,time)); }
}
