import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { seededRandom } from './materials.js';

const MODEL_URLS = {
  xbot: 'https://threejs.org/examples/models/gltf/Xbot.glb',
  michelle: 'https://threejs.org/examples/models/gltf/Michelle.glb',
  avatar: 'https://threejs.org/examples/models/gltf/readyplayer.me.glb'
};

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs))
  ]);
}

function cloneMaterials(root, hueShift = 0, saturationScale = 1, lightnessShift = 0) {
  root.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const cloned = materials.map(material => {
      if (!material) return material;
      const result = material.clone();
      const name = `${result.name} ${object.name}`.toLowerCase();
      const protectedMaterial = /(skin|face|eye|mouth|teeth|hair)/.test(name);
      if (result.color && !protectedMaterial) {
        const hsl = {};
        result.color.getHSL(hsl);
        result.color.setHSL((hsl.h + hueShift + 1) % 1, Math.min(1, hsl.s * saturationScale), Math.max(0.05, Math.min(0.92, hsl.l + lightnessShift)));
      }
      result.roughness = Math.max(0.35, result.roughness ?? 0.7);
      return result;
    });
    object.material = Array.isArray(object.material) ? cloned : cloned[0];
  });
}

function findAnimation(gltf, names) {
  const lowerNames = names.map(name => name.toLowerCase());
  return gltf.animations.find(clip => lowerNames.some(name => clip.name.toLowerCase().includes(name))) || gltf.animations[0] || null;
}

function defaultPaths() {
  return [
    [new THREE.Vector3(-92, 0.1, -7), new THREE.Vector3(-35, 0.1, -7), new THREE.Vector3(22, 0.1, -7), new THREE.Vector3(92, 0.1, -7)],
    [new THREE.Vector3(92, 0.1, 7), new THREE.Vector3(28, 0.1, 7), new THREE.Vector3(-31, 0.1, 7), new THREE.Vector3(-92, 0.1, 7)],
    [new THREE.Vector3(-55, 0.1, -88), new THREE.Vector3(-55, 0.1, -24), new THREE.Vector3(-55, 0.1, 28), new THREE.Vector3(-55, 0.1, 88)],
    [new THREE.Vector3(61, 0.1, 88), new THREE.Vector3(61, 0.1, 29), new THREE.Vector3(61, 0.1, -25), new THREE.Vector3(61, 0.1, -88)]
  ];
}

class Walker {
  constructor({ model, gltf, path, seed, scene }) {
    this.rand = seededRandom(seed);
    this.path = new THREE.CatmullRomCurve3(path, false, 'centripetal', 0.35);
    this.progress = this.rand();
    this.direction = this.rand() > 0.5 ? 1 : -1;
    this.speed = 0.72 + this.rand() * 0.72;
    this.group = new THREE.Group();
    this.group.name = `RealPedestrian-${seed}`;
    this.model = SkeletonUtils.clone(model);
    const hueShift = (this.rand() - 0.5) * 0.32;
    cloneMaterials(this.model, hueShift, 0.8 + this.rand() * 0.35, (this.rand() - 0.5) * 0.07);
    const scale = 0.88 + this.rand() * 0.14;
    this.model.scale.setScalar(scale);
    this.group.add(this.model);
    this.addAccessory();
    scene.add(this.group);

    this.mixer = new THREE.AnimationMixer(this.model);
    const walkClip = findAnimation(gltf, ['walk']);
    if (walkClip) {
      this.action = this.mixer.clipAction(walkClip);
      this.action.timeScale = 0.82 + this.rand() * 0.34;
      this.action.play();
      this.mixer.setTime(this.rand() * walkClip.duration);
    }
  }

  addAccessory() {
    if (this.rand() > 0.62) {
      const backpack = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.48, 0.16),
        new THREE.MeshStandardMaterial({ color: [0x31444f, 0x5a4031, 0x39483b][Math.floor(this.rand() * 3)], roughness: 0.86 })
      );
      backpack.position.set(0, 1.15, 0.18);
      backpack.rotation.x = -0.08;
      backpack.castShadow = true;
      this.group.add(backpack);
    }
    if (this.rand() > 0.83) {
      const capMaterial = new THREE.MeshStandardMaterial({ color: [0x2f3b43, 0x71433c, 0x8a7847][Math.floor(this.rand() * 3)], roughness: 0.8 });
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.13, 18), capMaterial);
      crown.position.set(0, 1.75, 0);
      crown.castShadow = true;
      this.group.add(crown);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.14), capMaterial);
      brim.position.set(0, 1.71, -0.14);
      brim.castShadow = true;
      this.group.add(brim);
    }
  }

  update(deltaTime) {
    const pathLength = Math.max(1, this.path.getLength());
    this.progress += this.direction * deltaTime * this.speed / pathLength;
    if (this.progress > 1) {
      this.progress = 1;
      this.direction = -1;
    } else if (this.progress < 0) {
      this.progress = 0;
      this.direction = 1;
    }
    const point = this.path.getPointAt(this.progress);
    const tangent = this.path.getTangentAt(this.progress).multiplyScalar(this.direction);
    this.group.position.copy(point);
    this.group.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI;
    this.mixer.update(deltaTime);
  }
}

class IdlePerson {
  constructor({ model, gltf, position, rotation, seed, scene }) {
    this.rand = seededRandom(seed);
    this.group = new THREE.Group();
    this.model = SkeletonUtils.clone(model);
    cloneMaterials(this.model, (this.rand() - 0.5) * 0.24, 0.82 + this.rand() * 0.3, (this.rand() - 0.5) * 0.05);
    const scale = 0.87 + this.rand() * 0.14;
    this.model.scale.setScalar(scale);
    this.group.add(this.model);
    this.group.position.copy(position);
    this.group.rotation.y = rotation;
    scene.add(this.group);
    this.baseY = position.y;
    this.phase = this.rand() * Math.PI * 2;
    this.mixer = new THREE.AnimationMixer(this.model);
    const idleClip = findAnimation(gltf, ['idle']);
    if (idleClip) {
      this.action = this.mixer.clipAction(idleClip);
      this.action.timeScale = 0.75 + this.rand() * 0.2;
      this.action.play();
      this.mixer.setTime(this.rand() * idleClip.duration);
    }
  }

  update(deltaTime, elapsed) {
    this.mixer.update(deltaTime);
    this.group.position.y = this.baseY + Math.sin(elapsed * 0.75 + this.phase) * 0.006;
    this.group.rotation.y += Math.sin(elapsed * 0.3 + this.phase) * 0.00015;
  }
}

function createFallbackHuman(seed) {
  const rand = seededRandom(seed);
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: [0xd4a17c, 0xb77d5e, 0xe0b18b][Math.floor(rand() * 3)], roughness: 0.72 });
  const shirt = new THREE.MeshStandardMaterial({ color: [0x35576a, 0x76423c, 0x4e674f, 0xb7a06c, 0x51485e][Math.floor(rand() * 5)], roughness: 0.84 });
  const trousers = new THREE.MeshStandardMaterial({ color: [0x252b2e, 0x394450, 0x514b42][Math.floor(rand() * 3)], roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x211f1d, roughness: 0.88 });

  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.32, 10), trousers);
  hips.position.y = 0.92;
  group.add(hips);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.23, 0.82, 12), shirt);
  torso.position.y = 1.42;
  group.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.14, 10), skin);
  neck.position.y = 1.9;
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), skin);
  head.scale.set(0.84, 1.08, 0.9);
  head.position.y = 2.08;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), dark);
  hair.position.y = 2.15;
  group.add(hair);

  const limbs = {};
  [-1, 1].forEach(side => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.31, 1.68, 0);
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.55, 9), shirt);
    upperArm.position.y = -0.26;
    armPivot.add(upperArm);
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.48, 9), skin);
    forearm.position.y = -0.72;
    armPivot.add(forearm);
    group.add(armPivot);
    limbs[side < 0 ? 'leftArm' : 'rightArm'] = armPivot;

    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.14, 0.82, 0);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.115, 0.82, 10), trousers);
    leg.position.y = -0.38;
    legPivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.34), dark);
    shoe.position.set(0, -0.83, -0.055);
    legPivot.add(shoe);
    group.add(legPivot);
    limbs[side < 0 ? 'leftLeg' : 'rightLeg'] = legPivot;
  });

  group.scale.setScalar(0.82 + rand() * 0.1);
  group.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return { group, limbs };
}

class FallbackWalker {
  constructor({ path, seed, scene }) {
    this.rand = seededRandom(seed);
    this.path = new THREE.CatmullRomCurve3(path, false, 'centripetal', 0.35);
    this.progress = this.rand();
    this.direction = this.rand() > 0.5 ? 1 : -1;
    this.speed = 0.65 + this.rand() * 0.55;
    const built = createFallbackHuman(seed);
    this.group = built.group;
    this.limbs = built.limbs;
    this.phase = this.rand() * Math.PI * 2;
    scene.add(this.group);
  }

  update(deltaTime, elapsed) {
    const length = Math.max(1, this.path.getLength());
    this.progress += this.direction * deltaTime * this.speed / length;
    if (this.progress > 1 || this.progress < 0) {
      this.direction *= -1;
      this.progress = Math.max(0, Math.min(1, this.progress));
    }
    const point = this.path.getPointAt(this.progress);
    const tangent = this.path.getTangentAt(this.progress).multiplyScalar(this.direction);
    this.group.position.copy(point);
    this.group.rotation.y = Math.atan2(tangent.x, tangent.z);
    const gait = Math.sin(elapsed * 6.2 * this.speed + this.phase);
    this.limbs.leftLeg.rotation.x = gait * 0.48;
    this.limbs.rightLeg.rotation.x = -gait * 0.48;
    this.limbs.leftArm.rotation.x = -gait * 0.38;
    this.limbs.rightArm.rotation.x = gait * 0.38;
  }
}

export class CrowdSystem {
  constructor(scene, walkPaths = []) {
    this.scene = scene;
    this.paths = walkPaths.filter(path => path.length >= 2);
    if (!this.paths.length) this.paths = defaultPaths();
    this.people = [];
    this.loader = new GLTFLoader();
    this.loadedModels = {};
  }

  loadModel(key, url) {
    return withTimeout(this.loader.loadAsync(url), 12000, key).then(gltf => {
      this.loadedModels[key] = gltf;
      return gltf;
    });
  }

  async init(onProgress = () => {}) {
    onProgress(0.1, 'Streaming rigged pedestrians…');
    const results = await Promise.allSettled([
      this.loadModel('xbot', MODEL_URLS.xbot),
      this.loadModel('michelle', MODEL_URLS.michelle),
      this.loadModel('avatar', MODEL_URLS.avatar)
    ]);
    onProgress(0.68, 'Placing the crowd naturally…');

    const xbot = this.loadedModels.xbot;
    if (xbot) {
      for (let index = 0; index < Math.min(12, this.paths.length * 3); index += 1) {
        this.people.push(new Walker({
          model: xbot.scene,
          gltf: xbot,
          path: this.paths[index % this.paths.length],
          seed: 1300 + index * 23,
          scene: this.scene
        }));
      }
    }

    const staticSources = [this.loadedModels.michelle, this.loadedModels.avatar].filter(Boolean);
    if (staticSources.length) {
      const idlePlacements = Array.from({ length: 6 }, (_, index) => {
        const path = this.paths[index % this.paths.length];
        const pointIndex = Math.min(path.length - 1, Math.max(0, Math.floor((path.length - 1) * (0.25 + (index % 3) * 0.25))));
        const position = path[pointIndex].clone();
        position.y = 0.08;
        const neighbour = path[Math.min(path.length - 1, pointIndex + 1)] || path[Math.max(0, pointIndex - 1)];
        const direction = neighbour.clone().sub(position);
        return { position, rotation: Math.atan2(direction.x, direction.z) + (index % 2 ? Math.PI * 0.5 : -Math.PI * 0.5) };
      });
      idlePlacements.forEach(({ position, rotation }, index) => {
        const source = staticSources[index % staticSources.length];
        this.people.push(new IdlePerson({
          model: source.scene,
          gltf: source,
          position,
          rotation,
          seed: 2200 + index * 31,
          scene: this.scene
        }));
      });
    }

    if (!xbot) {
      console.warn('Realistic pedestrian model failed to load; using local fallback humans.', results);
      for (let index = 0; index < 14; index += 1) {
        this.people.push(new FallbackWalker({
          path: this.paths[index % this.paths.length],
          seed: 3300 + index * 29,
          scene: this.scene
        }));
      }
    }

    onProgress(1, xbot ? 'Rigged pedestrians ready.' : 'Fallback pedestrians ready.');
    return { realisticModelsLoaded: Boolean(xbot), total: this.people.length };
  }

  update(deltaTime, elapsed) {
    this.people.forEach(person => person.update(deltaTime, elapsed));
  }
}
