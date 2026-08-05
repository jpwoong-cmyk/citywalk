import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { CityBuilder } from './city-builder.js';
import { CrowdSystem } from './crowd-system.js';
import { TrafficSystem } from './traffic-system.js';
import { PlayerController } from './player-controller.js';

const canvas=document.getElementById('cityCanvas');
const loadingScreen=document.getElementById('loadingScreen');
const loadingText=document.getElementById('loadingText');
const progressBar=document.getElementById('progressBar');
const startButton=document.getElementById('startButton');
const statusChip=document.getElementById('statusChip');
const helpButton=document.getElementById('helpButton');
const helpPanel=document.getElementById('helpPanel');

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb8d7e5);
scene.fog=new THREE.FogExp2(0xa9c6cf,0.0058);

const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,0.08,500);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;

const sky=new Sky();
sky.scale.setScalar(450000);
scene.add(sky);
const skyU=sky.material.uniforms;
skyU.turbidity.value=8;
skyU.rayleigh.value=2.25;
skyU.mieCoefficient.value=0.006;
skyU.mieDirectionalG.value=0.82;
const sun=new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(54),THREE.MathUtils.degToRad(122));
skyU.sunPosition.value.copy(sun);

scene.add(new THREE.HemisphereLight(0xdff4ff,0x62513e,1.9));
const sunlight=new THREE.DirectionalLight(0xfff1d5,3.2);
sunlight.position.set(-65,90,-25);
sunlight.castShadow=true;
sunlight.shadow.mapSize.set(2048,2048);
sunlight.shadow.camera.left=-120;
sunlight.shadow.camera.right=120;
sunlight.shadow.camera.top=120;
sunlight.shadow.camera.bottom=-120;
sunlight.shadow.camera.near=1;
sunlight.shadow.camera.far=230;
sunlight.shadow.bias=-0.00025;
scene.add(sunlight);

const city=new CityBuilder(scene);
const {colliders}=city.build((progress,text)=>{
  progressBar.style.width=`${Math.round(progress*72)}%`;
  loadingText.textContent=text;
});

loadingText.textContent='Inviting pedestrians…';
progressBar.style.width='82%';
const crowd=new CrowdSystem(scene,30);
loadingText.textContent='Starting street traffic…';
progressBar.style.width='93%';
const traffic=new TrafficSystem(scene);
const player=new PlayerController(camera,canvas,colliders,statusChip);
progressBar.style.width='100%';
loadingText.textContent='Ready to explore.';
startButton.disabled=false;

startButton.addEventListener('click',()=>{
  loadingScreen.classList.add('is-hidden');
  player.start();
  if(matchMedia('(pointer: fine)').matches) player.controls.lock();
});

helpButton.addEventListener('click',()=>{
  const open=helpPanel.hidden;
  helpPanel.hidden=!open;
  helpButton.setAttribute('aria-expanded',String(open));
});

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
  renderer.setSize(innerWidth,innerHeight);
});

const clock=new THREE.Clock();
let elapsed=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.05);
  elapsed+=dt;
  player.update(dt,elapsed);
  crowd.update(dt,elapsed);
  traffic.update(dt);
  renderer.render(scene,camera);
}
animate();
