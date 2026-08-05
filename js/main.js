import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RealCityBuilder } from './city-builder.js';
import { CrowdSystem } from './crowd-system.js';
import { PlayerController } from './player-controller.js';

const CENTER = { lat: 10.044179, lon: 105.7856213 };
const canvas = document.getElementById('cityCanvas');
const loadingScreen = document.getElementById('loadingScreen');
const loadingText = document.getElementById('loadingText');
const progressBar = document.getElementById('progressBar');
const startButton = document.getElementById('startButton');
const statusChip = document.getElementById('statusChip');
const mapStatus = document.getElementById('mapStatus');
const helpButton = document.getElementById('helpButton');
const helpPanel = document.getElementById('helpPanel');

function setProgress(value, text) {
  progressBar.style.width = `${Math.max(0, Math.min(100, Math.round(value * 100)))}%`;
  if (text) loadingText.textContent = text;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa5bbc6);
scene.fog = new THREE.Fog(0xa5bbc6, 95, 300);

const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.07, 520);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const pixelRatio = Math.min(devicePixelRatio, matchMedia('(pointer: fine)').matches ? 1.75 : 1.35);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.08;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
pmremGenerator.dispose();

const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);
const skyUniforms = sky.material.uniforms;
skyUniforms.turbidity.value = 6.5;
skyUniforms.rayleigh.value = 2.15;
skyUniforms.mieCoefficient.value = 0.0045;
skyUniforms.mieDirectionalG.value = 0.79;
const sunPosition = new THREE.Vector3().setFromSphericalCoords(
  1,
  THREE.MathUtils.degToRad(48),
  THREE.MathUtils.degToRad(128)
);
skyUniforms.sunPosition.value.copy(sunPosition);

const hemisphere = new THREE.HemisphereLight(0xe8f4f7, 0x5f5548, 1.65);
scene.add(hemisphere);
const sunlight = new THREE.DirectionalLight(0xffefd2, 3.25);
sunlight.position.set(-82, 108, -45);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.left = -120;
sunlight.shadow.camera.right = 120;
sunlight.shadow.camera.top = 120;
sunlight.shadow.camera.bottom = -120;
sunlight.shadow.camera.near = 1;
sunlight.shadow.camera.far = 270;
sunlight.shadow.bias = -0.00018;
sunlight.shadow.normalBias = 0.018;
scene.add(sunlight);

let player;
let crowd;
let composer = null;
let ssaoPass = null;

async function initialise() {
  try {
    setProgress(0.03, 'Requesting the neighbourhood geometry…');
    const city = new RealCityBuilder(scene, { center: CENTER, radius: 185 });
    const cityResult = await city.build((progress, text) => setProgress(0.04 + progress * 0.7, text));
    mapStatus.textContent = cityResult.mapSource === 'osm' ? 'Live OpenStreetMap geometry' : 'Bundled local reconstruction';

    setProgress(0.76, 'Loading realistic pedestrians…');
    crowd = new CrowdSystem(scene, cityResult.walkPaths);
    const crowdResult = await crowd.init((progress, text) => setProgress(0.76 + progress * 0.18, text));
    mapStatus.textContent += crowdResult.realisticModelsLoaded ? ' · rigged crowd' : ' · fallback crowd';

    player = new PlayerController(camera, canvas, cityResult.colliders, statusChip, {
      startPosition: cityResult.startPosition,
      bounds: 188
    });

    const usePostProcessing = matchMedia('(pointer: fine)').matches && innerWidth >= 700 && (navigator.deviceMemory || 8) >= 4;
    if (usePostProcessing) {
      composer = new EffectComposer(renderer);
      composer.setPixelRatio(pixelRatio);
      composer.setSize(innerWidth, innerHeight);
      composer.addPass(new RenderPass(scene, camera));
      ssaoPass = new SSAOPass(scene, camera, innerWidth, innerHeight, 24);
      ssaoPass.kernelRadius = 7;
      ssaoPass.minDistance = 0.003;
      ssaoPass.maxDistance = 0.12;
      composer.addPass(ssaoPass);
      composer.addPass(new OutputPass());
    }

    setProgress(1, `Ready. ${crowdResult.total} pedestrians are in the district.`);
    startButton.disabled = false;
  } catch (error) {
    console.error(error);
    setProgress(1, 'The scene could not finish loading. Check the browser console.');
    mapStatus.textContent = 'Load error';
  }
}

startButton.addEventListener('click', () => {
  if (!player) return;
  loadingScreen.classList.add('is-hidden');
  player.start();
  if (matchMedia('(pointer: fine)').matches) player.controls.lock();
});

helpButton.addEventListener('click', () => {
  const open = helpPanel.hidden;
  helpPanel.hidden = !open;
  helpButton.setAttribute('aria-expanded', String(open));
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (composer) composer.setSize(innerWidth, innerHeight);
  if (ssaoPass) ssaoPass.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
let elapsed = 0;
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  elapsed += deltaTime;
  if (player) player.update(deltaTime, elapsed);
  if (crowd) crowd.update(deltaTime, elapsed);
  if (composer) composer.render(deltaTime);
  else renderer.render(scene, camera);
}

animate();
initialise();
