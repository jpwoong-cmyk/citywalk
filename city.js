import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { clone as skeletonClone } from "three/addons/utils/SkeletonUtils.js";

const canvas = document.querySelector("#city-canvas");
const loadingPanel = document.querySelector("#loading");
const loadingText = document.querySelector("#loading-text");
const loadingFill = document.querySelector("#loading-bar-fill");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8cad7);
scene.fog = new THREE.FogExp2(0xb8cad7, 0.0042);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 700);
camera.position.set(62, 50, 72);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 8, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 12;
controls.maxDistance = 160;
controls.maxPolarAngle = Math.PI * 0.485;

const hemi = new THREE.HemisphereLight(0xdcecff, 0x6b6257, 2.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2d7, 3.25);
sun.position.set(-50, 82, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -95;
sun.shadow.camera.right = 95;
sun.shadow.camera.top = 95;
sun.shadow.camera.bottom = -95;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 220;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 240),
  new THREE.MeshStandardMaterial({ color: 0x6e7a6d, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.17;
ground.receiveShadow = true;
scene.add(ground);

const district = new THREE.Group();
const animatedWorld = new THREE.Group();
scene.add(district, animatedWorld);

const loader = new GLTFLoader();
const ASSET_ROOT = "./assets/city/";
const assetFiles = {
  large: "Building_Large_2.gltf",
  medium: "Building_Medium_2_001.gltf",
  small: "Building_Small_1.gltf",
  road: "Street_2Lane.gltf",
  crossing: "Street_4WayIntersection.gltf",
  planter: "Prop_Planter_Single.gltf",
  bollard: "Prop_Bollard.gltf",
  manhole: "Prop_ManholeCover.gltf"
};

const templates = {};
const movingCars = [];
const pedestrians = [];
const swayingTrees = [];
const trafficLights = [];
let loadedCount = 0;

function updateLoading(label) {
  loadedCount++;
  const percent = Math.round((loadedCount / Object.keys(assetFiles).length) * 100);
  loadingFill.style.width = `${percent}%`;
  loadingText.textContent = `${label} · ${percent}%`;
}

function prepareTemplate(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.filter(Boolean).forEach((m) => (m.side = THREE.FrontSide));
  });
  return root;
}

async function loadAsset(key, file) {
  const gltf = await loader.loadAsync(ASSET_ROOT + file);
  templates[key] = prepareTemplate(gltf.scene);
  updateLoading(file);
}

await Promise.all(Object.entries(assetFiles).map(([key, file]) => loadAsset(key, file)));
buildCity();
buildLivingLayer();
loadingText.textContent = "City alive";
loadingFill.style.width = "100%";
setTimeout(() => loadingPanel.classList.add("is-done"), 450);

function instantiate(key) {
  return skeletonClone(templates[key]);
}

function settleOnGround(object, y = 0) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y += y - box.min.y;
  object.updateMatrixWorld(true);
  return object;
}

function fitFootprint(object, maxX, maxZ, maxScale = 1.3) {
  object.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  object.scale.multiplyScalar(Math.min(maxX / size.x, maxZ / size.z, maxScale));
}

function addBuilding(type, x, z, rotation = 0, footprintX = 21, footprintZ = 21) {
  const obj = instantiate(type);
  obj.rotation.y = rotation;
  fitFootprint(obj, footprintX, footprintZ);
  settleOnGround(obj, 0.04);
  obj.position.x += x;
  obj.position.z += z;
  district.add(obj);
}

function addAsset(type, x, z, rotation = 0, scale = 1) {
  const obj = instantiate(type);
  obj.rotation.y = rotation;
  obj.scale.setScalar(scale);
  settleOnGround(obj, 0.025);
  obj.position.x += x;
  obj.position.z += z;
  district.add(obj);
}

function addRoadSegment(x, z, rotation = 0) {
  const road = instantiate("road");
  settleOnGround(road, -0.04);
  road.rotation.y = rotation;
  road.position.x += x;
  road.position.z += z;
  district.add(road);
}

function addCrossing(x, z) {
  const crossing = instantiate("crossing");
  settleOnGround(crossing, -0.035);
  crossing.position.x += x;
  crossing.position.z += z;
  district.add(crossing);
}

function makeTree(x, z, scale = 1) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.38, 3.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x655142, roughness: 1 })
  );
  trunk.position.y = 1.8;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x477153, roughness: 0.95 });
  [[0,4.15,0,1.55],[-0.8,3.8,0.2,1.25],[0.75,3.75,-0.25,1.05]].forEach(([px,py,pz,r]) => {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leafMat);
    crown.position.set(px, py, pz);
    crown.castShadow = true;
    tree.add(crown);
  });

  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  district.add(tree);
  swayingTrees.push({ tree, phase: Math.random() * Math.PI * 2, strength: 0.008 + Math.random() * 0.008 });
}

function makePark() {
  const park = new THREE.Mesh(
    new THREE.BoxGeometry(27, 0.22, 27),
    new THREE.MeshStandardMaterial({ color: 0x71856d, roughness: 1 })
  );
  park.position.set(-25, -0.03, 25);
  park.receiveShadow = true;
  district.add(park);

  const pathMat = new THREE.MeshStandardMaterial({ color: 0xb8b2a6, roughness: 1 });
  const pathA = new THREE.Mesh(new THREE.BoxGeometry(25, 0.08, 3), pathMat);
  pathA.position.set(-25, 0.1, 25);
  district.add(pathA);
  const pathB = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 25), pathMat);
  pathB.position.set(-25, 0.1, 25);
  district.add(pathB);

  [[-34,18,1],[-28,17,.85],[-18,18,.95],[-34,31,.9],[-28,33,1.05],[-18,31,.9]]
    .forEach(([x,z,s]) => makeTree(x,z,s));
  addAsset("planter", -20, 24, 0, 1.1);
  addAsset("planter", -30, 24, Math.PI, 1.1);
}

function buildCity() {
  for (let z = -48; z <= 48; z += 12) if (Math.abs(z) >= 8) addRoadSegment(0, z, 0);
  for (let x = -48; x <= 48; x += 12) if (Math.abs(x) >= 8) addRoadSegment(x, 0, Math.PI / 2);
  addCrossing(0, 0);

  addBuilding("large", 25, 25, Math.PI, 22, 23);
  addBuilding("medium", 25, -25, Math.PI / 2, 22, 23);
  addBuilding("small", -25, -25, 0, 22, 23);
  makePark();

  addBuilding("medium", 25, 52, Math.PI, 20, 22);
  addBuilding("small", 25, -52, Math.PI / 2, 20, 22);
  addBuilding("small", -25, -52, 0, 20, 22);
  addBuilding("medium", 52, 25, -Math.PI / 2, 20, 22);
  addBuilding("small", 52, -25, Math.PI, 20, 22);
  addBuilding("small", -52, -25, 0, 20, 22);
  addBuilding("medium", -52, 25, Math.PI / 2, 20, 22);

  [[-7.2,-7.2],[7.2,-7.2],[-7.2,7.2],[7.2,7.2],[-7.2,-12],[7.2,12]]
    .forEach(([x,z],i) => addAsset("bollard", x, z, i % 2 ? Math.PI / 2 : 0, 1));
  addAsset("manhole", 2, -17, 0, 1);
  addAsset("manhole", -2, 22, 0, 1);
  [[-43,10],[-43,17],[43,10],[43,17],[-43,-10],[43,-10]].forEach(([x,z]) => makeTree(x,z,.72));
}

function makeCar(color) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.2 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b2025, roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x6f8ea0, roughness: 0.18, metalness: 0.1 });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.72, 1.55), bodyMat);
  lower.position.y = 0.72;
  lower.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.7, 1.35), glassMat);
  cabin.position.set(-0.15, 1.34, 0);
  cabin.castShadow = true;
  car.add(lower, cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14);
  [[-.95,.38,-.82],[.95,.38,-.82],[-.95,.38,.82],[.95,.38,.82]].forEach(([x,y,z]) => {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x,y,z);
    wheel.castShadow = true;
    car.add(wheel);
  });
  return car;
}

function addLoopCar({ axis, lane, direction, speed, offset, color }) {
  const car = makeCar(color);
  if (axis === "x") {
    car.position.set(offset, 0.02, lane);
    car.rotation.y = direction > 0 ? 0 : Math.PI;
  } else {
    car.position.set(lane, 0.02, offset);
    car.rotation.y = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  animatedWorld.add(car);
  movingCars.push({ car, axis, direction, speed, currentSpeed: speed, min: -60, max: 60 });
}

function makePedestrian(bodyColor) {
  const person = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd1a27e, roughness: 0.9 });
  const cloth = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2d333a, roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.72, 4, 8), cloth);
  torso.position.y = 1.45;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skin);
  head.position.y = 2.32;
  person.add(torso, head);

  const limbGeo = new THREE.CapsuleGeometry(0.09, 0.55, 3, 6);
  const armL = new THREE.Mesh(limbGeo, cloth);
  const armR = new THREE.Mesh(limbGeo, cloth);
  const legL = new THREE.Mesh(limbGeo, pants);
  const legR = new THREE.Mesh(limbGeo, pants);
  armL.position.set(-0.37, 1.48, 0);
  armR.position.set(0.37, 1.48, 0);
  legL.position.set(-0.14, 0.55, 0);
  legR.position.set(0.14, 0.55, 0);
  person.add(armL, armR, legL, legR);
  person.userData.limbs = { armL, armR, legL, legR };
  return person;
}

function addPedestrianRoute(points, speed, color, startT) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x,z]) => new THREE.Vector3(x, 0, z)), true, "catmullrom", 0.08);
  const person = makePedestrian(color);
  person.position.copy(curve.getPointAt(startT));
  animatedWorld.add(person);
  pedestrians.push({ person, curve, t: startT, speed, stride: Math.random() * Math.PI * 2 });
}

function makeTrafficLight(x, z, rotation, nsPrimary) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 3.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x2d3336, roughness: 0.8 })
  );
  pole.position.y = 1.75;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 1.15, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x141719, roughness: 0.75 })
  );
  box.position.set(0.22, 3.15, 0);
  group.add(pole, box);

  const lamp = (y, color) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 10, 8),
      new THREE.MeshStandardMaterial({ color, emissive: 0x000000 })
    );
    m.position.set(0.22, y, -0.22);
    group.add(m);
    return m;
  };

  const red = lamp(3.5, 0x3a0b0b);
  const amber = lamp(3.16, 0x3b2c08);
  const green = lamp(2.82, 0x0a3217);
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  animatedWorld.add(group);
  trafficLights.push({ red, amber, green, nsPrimary });
}

function buildLivingLayer() {
  addLoopCar({ axis:"x", lane:-2.4, direction:1, speed:8, offset:-42, color:0xb64235 });
  addLoopCar({ axis:"x", lane:2.4, direction:-1, speed:7, offset:34, color:0x365d88 });
  addLoopCar({ axis:"x", lane:-2.4, direction:1, speed:6.2, offset:10, color:0x8a8d92 });
  addLoopCar({ axis:"z", lane:2.4, direction:1, speed:7.6, offset:-35, color:0xd1a03a });
  addLoopCar({ axis:"z", lane:-2.4, direction:-1, speed:6.8, offset:26, color:0x3c7656 });
  addLoopCar({ axis:"z", lane:2.4, direction:1, speed:5.9, offset:4, color:0x7f4c83 });

  const walkA = [[-42,8],[-10,8],[-10,42],[-42,42]];
  const walkB = [[10,-42],[42,-42],[42,-8],[10,-8]];
  const park = [[-36,16],[-17,16],[-17,34],[-36,34]];
  addPedestrianRoute(walkA, 1.55, 0x476f91, .08);
  addPedestrianRoute(walkA, 1.35, 0x8a5d4f, .48);
  addPedestrianRoute(walkB, 1.7, 0x566e4a, .15);
  addPedestrianRoute(walkB, 1.5, 0x6e547f, .67);
  addPedestrianRoute(park, 1.05, 0x9b6f3d, .2);
  addPedestrianRoute(park, .9, 0x435b63, .72);

  makeTrafficLight(-5.8, -5.8, 0, true);
  makeTrafficLight(5.8, 5.8, Math.PI, true);
  makeTrafficLight(-5.8, 5.8, Math.PI / 2, false);
  makeTrafficLight(5.8, -5.8, -Math.PI / 2, false);
}

function trafficPhase(t) {
  const c = t % 18;
  if (c < 7) return { ns:"green", ew:"red" };
  if (c < 9) return { ns:"amber", ew:"red" };
  if (c < 16) return { ns:"red", ew:"green" };
  return { ns:"red", ew:"amber" };
}

function setLamp(mesh, active, color) {
  mesh.material.emissive.set(active ? color : 0x000000);
  mesh.material.emissiveIntensity = active ? 3.2 : 0;
}

function updateTrafficLights(t) {
  const phase = trafficPhase(t);
  for (const light of trafficLights) {
    const state = light.nsPrimary ? phase.ns : phase.ew;
    setLamp(light.red, state === "red", 0xff210d);
    setLamp(light.amber, state === "amber", 0xffb000);
    setLamp(light.green, state === "green", 0x22ff66);
  }
  return phase;
}

function carShouldStop(state, phase) {
  const pos = state.axis === "x" ? state.car.position.x : state.car.position.z;
  const stopLine = state.direction > 0 ? -7.5 : 7.5;
  const signal = state.axis === "x" ? phase.ew : phase.ns;
  return Math.abs(pos - stopLine) < 2.2 && signal !== "green";
}

function updateCars(dt, phase) {
  for (const s of movingCars) {
    const target = carShouldStop(s, phase) ? 0 : s.speed;
    s.currentSpeed = THREE.MathUtils.lerp(s.currentSpeed, target, 1 - Math.pow(0.02, dt));
    const move = s.currentSpeed * s.direction * dt;
    if (s.axis === "x") {
      s.car.position.x += move;
      if (s.car.position.x > s.max) s.car.position.x = s.min;
      if (s.car.position.x < s.min) s.car.position.x = s.max;
    } else {
      s.car.position.z += move;
      if (s.car.position.z > s.max) s.car.position.z = s.min;
      if (s.car.position.z < s.min) s.car.position.z = s.max;
    }
  }
}

function updatePedestrians(dt) {
  for (const p of pedestrians) {
    p.t = (p.t + (dt * p.speed) / 180) % 1;
    const pos = p.curve.getPointAt(p.t);
    const tangent = p.curve.getTangentAt(p.t);
    p.person.position.copy(pos);
    p.person.rotation.y = Math.atan2(tangent.x, tangent.z);
    p.stride += dt * (5 + p.speed * 1.7);
    const swing = Math.sin(p.stride) * 0.58;
    const { armL, armR, legL, legR } = p.person.userData.limbs;
    armL.rotation.x = swing;
    armR.rotation.x = -swing;
    legL.rotation.x = -swing;
    legR.rotation.x = swing;
    p.person.position.y = 0.03 + Math.abs(Math.sin(p.stride * 2)) * 0.025;
  }
}

function updateTrees(t) {
  for (const s of swayingTrees) {
    s.tree.rotation.z = Math.sin(t * .85 + s.phase) * s.strength;
    s.tree.rotation.x = Math.cos(t * .67 + s.phase) * s.strength * .45;
  }
}

const keys = new Set();
addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if (e.key.toLowerCase() === "r") resetView();
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function resetView() {
  camera.position.set(62, 50, 72);
  controls.target.set(0, 8, 0);
  controls.update();
}

function updateKeyboardMovement(dt) {
  if (![...keys].some((k) => ["w","a","s","d"].includes(k))) return;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const move = new THREE.Vector3();
  if (keys.has("w")) move.add(forward);
  if (keys.has("s")) move.sub(forward);
  if (keys.has("d")) move.add(right);
  if (keys.has("a")) move.sub(right);
  if (move.lengthSq()) {
    move.normalize().multiplyScalar(22 * dt);
    camera.position.add(move);
    controls.target.add(move);
  }
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);
  const t = clock.elapsedTime;
  updateKeyboardMovement(dt);
  const phase = updateTrafficLights(t);
  updateCars(dt, phase);
  updatePedestrians(dt);
  updateTrees(t);
  controls.update();
  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
});
