import * as THREE from 'three';
import { makeAsphaltTexture, makeConcreteTexture, makeFacadeTexture, makeSignTexture, seededRandom } from './materials.js';

const palette = ['#c49b7b', '#d8c4a8', '#b98568', '#d9c1b2', '#9eaaa2', '#d5a78f', '#e1c991', '#aeb6bd'];
const signNames = ['CÀ PHÊ SÁNG', 'PHỞ GIA TRUYỀN', 'TẠP HÓA MINH AN', 'BÁNH MÌ 24H', 'NHÀ THUỐC AN KHANG', 'CƠM TẤM', 'TRÀ SỮA', 'SỬA XE', 'ĐIỆN MÁY', 'MỸ PHẨM LAN'];
const signColors = ['#a51f28', '#13594c', '#c66616', '#1d4c7d', '#6f253d', '#315b2b'];

function boxMesh(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'CanThoCity';
    scene.add(this.group);
    this.colliders = [];
    this.walkways = [];
    this.rand = seededRandom(20260805);
  }

  build(onProgress = () => {}) {
    this.addGround(); onProgress(0.08, 'Laying tropical ground…');
    this.addRoadNetwork(); onProgress(0.2, 'Painting roads and pavements…');
    this.addBuildingBlocks(); onProgress(0.52, 'Raising the neighbourhood…');
    this.addStreetDetails(); onProgress(0.72, 'Adding signs, scooters and wires…');
    this.addVegetation(); onProgress(0.88, 'Planting tropical greenery…');
    this.addAtmosphereDetails(); onProgress(1, 'City ready.');
    return { colliders: this.colliders, walkways: this.walkways };
  }

  addGround() {
    const grassTexture = makeConcreteTexture(31, [91, 116, 78]);
    grassTexture.repeat.set(18, 18);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 260),
      new THREE.MeshStandardMaterial({ map: grassTexture, roughness: 1, color: 0xb4b38b })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  addRoadNetwork() {
    const asphalt = makeAsphaltTexture();
    asphalt.repeat.set(18, 5);
    const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.88, metalness: 0.04, color: 0x8a8d8c });
    const concrete = makeConcreteTexture();
    concrete.repeat.set(20, 2);
    const pavementMat = new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.96, color: 0xc1bcae });

    this.addRoad(0, 0, 236, 13, roadMat, 0);
    this.addRoad(-56, 0, 182, 10, roadMat, Math.PI / 2);
    this.addRoad(49, 4, 170, 9, roadMat, Math.PI / 2);
    this.addRoad(0, -62, 210, 7, roadMat, 0);

    this.addSidewalk(0, -8.7, 236, 4, pavementMat, 0);
    this.addSidewalk(0, 8.7, 236, 4, pavementMat, 0);
    this.addSidewalk(-62.7, 0, 182, 3.2, pavementMat, Math.PI / 2);
    this.addSidewalk(-49.3, 0, 182, 3.2, pavementMat, Math.PI / 2);
    this.addSidewalk(43, 4, 170, 3, pavementMat, Math.PI / 2);
    this.addSidewalk(55, 4, 170, 3, pavementMat, Math.PI / 2);
    this.addSidewalk(0, -67.5, 210, 3, pavementMat, 0);
    this.addSidewalk(0, -56.5, 210, 3, pavementMat, 0);

    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xe4d8b7, roughness: 0.75 });
    for (let x = -104; x <= 104; x += 12) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.16), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.022, 0);
      this.group.add(stripe);
    }
    for (let z = -75; z <= 75; z += 10) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.14), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.rotation.z = Math.PI / 2;
      stripe.position.set(-56, 0.023, z);
      this.group.add(stripe);
    }

    this.addCrosswalk(-56, 0, true);
    this.addCrosswalk(49, 0, true);
  }

  addRoad(x, z, length, width, material, rotation = 0) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(length, width), material);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = rotation;
    road.position.set(x, 0, z);
    road.receiveShadow = true;
    this.group.add(road);
  }

  addSidewalk(x, z, length, width, material, rotation = 0) {
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(length, 0.18, width), material);
    sidewalk.position.set(x, 0.08, z);
    sidewalk.rotation.y = rotation;
    sidewalk.receiveShadow = true;
    this.group.add(sidewalk);
    const halfL = length / 2;
    const halfW = width / 2;
    this.walkways.push(rotation === 0
      ? { minX: x - halfL, maxX: x + halfL, minZ: z - halfW, maxZ: z + halfW }
      : { minX: x - halfW, maxX: x + halfW, minZ: z - halfL, maxZ: z + halfL });
  }

  addCrosswalk(x, z, verticalRoad = true) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xece9df, roughness: 0.72 });
    for (let i = -4; i <= 4; i++) {
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(verticalRoad ? 0.85 : 5.5, verticalRoad ? 5.5 : 0.85), mat);
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(x + (verticalRoad ? i * 1.25 : 0), 0.026, z + (verticalRoad ? 0 : i * 1.25));
      this.group.add(mark);
    }
  }

  addBuildingBlocks() {
    const rows = [
      { z: -18, start: -112, end: -65, side: 1 }, { z: -18, start: -45, end: 42, side: 1 }, { z: -18, start: 57, end: 112, side: 1 },
      { z: 19, start: -112, end: -65, side: -1 }, { z: 19, start: -45, end: 42, side: -1 }, { z: 19, start: 57, end: 112, side: -1 },
      { x: -73, start: -82, end: -22, vertical: true, side: 1 }, { x: -73, start: 24, end: 82, vertical: true, side: 1 },
      { x: -39, start: -84, end: -23, vertical: true, side: -1 }, { x: -39, start: 25, end: 84, vertical: true, side: -1 },
      { x: 33, start: -82, end: -23, vertical: true, side: 1 }, { x: 33, start: 25, end: 82, vertical: true, side: 1 },
      { x: 65, start: -80, end: -23, vertical: true, side: -1 }, { x: 65, start: 24, end: 80, vertical: true, side: -1 },
      { z: -78, start: -108, end: -63, side: 1 }, { z: -78, start: -48, end: 44, side: 1 }, { z: -78, start: 58, end: 108, side: 1 }
    ];

    let buildingIndex = 0;
    for (const row of rows) {
      let cursor = row.start;
      while (cursor < row.end - 4) {
        const frontage = 5.2 + this.rand() * 5.7;
        const depth = 10 + this.rand() * 8;
        const floors = 2 + Math.floor(this.rand() * 5);
        const height = floors * (3 + this.rand() * 0.35);
        const usable = Math.min(frontage, row.end - cursor);
        if (usable < 4.6) break;
        if (row.vertical) {
          const z = cursor + usable / 2;
          const x = row.x + row.side * depth / 2;
          this.addBuilding({ x, z, width: depth, depth: usable, height, floors, rotation: row.side > 0 ? -Math.PI / 2 : Math.PI / 2, index: buildingIndex++ });
        } else {
          const x = cursor + usable / 2;
          const z = row.z + row.side * depth / 2;
          this.addBuilding({ x, z, width: usable, depth, height, floors, rotation: row.side > 0 ? 0 : Math.PI, index: buildingIndex++ });
        }
        cursor += usable + 0.45 + this.rand() * 0.6;
      }
    }

    this.addMarketHall();
  }

  addBuilding({ x, z, width, depth, height, floors, rotation, index }) {
    const wall = palette[index % palette.length];
    const facadeMap = makeFacadeTexture({ seed: index + 8, wall, floors, columns: Math.max(2, Math.round(width / 3.2)) });
    const sideMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(wall).multiplyScalar(0.72), roughness: 0.93 });
    const facadeMat = new THREE.MeshStandardMaterial({ map: facadeMap, roughness: 0.84, metalness: 0.01 });
    const backMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(wall).multiplyScalar(0.63), roughness: 0.96 });
    const roofMat = new THREE.MeshStandardMaterial({ color: index % 3 ? 0x7e6d5f : 0x8b4c3e, roughness: 0.95 });
    const materials = [sideMat, sideMat, roofMat, roofMat, facadeMat, backMat];
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials);
    building.position.set(x, height / 2 + 0.15, z);
    building.rotation.y = rotation;
    building.castShadow = true;
    building.receiveShadow = true;
    this.group.add(building);

    const frontZ = depth / 2 + 0.13;
    const signTexture = makeSignTexture(signNames[index % signNames.length], signColors[index % signColors.length], '#fff4dc', index + 3);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(width * 0.86, 8.8), 1.55),
      new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.5, emissive: 0x1a1008, emissiveIntensity: 0.14 })
    );
    sign.position.set(0, -height / 2 + 3.05, frontZ);
    building.add(sign);

    const shopGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(2.8, width * 0.72), 2.45),
      new THREE.MeshPhysicalMaterial({ color: 0x55747e, roughness: 0.24, metalness: 0.08, transmission: 0.07, transparent: true, opacity: 0.82 })
    );
    shopGlass.position.set(0, -height / 2 + 1.48, frontZ + 0.01);
    building.add(shopGlass);

    if (index % 3 !== 1) {
      const awningMat = new THREE.MeshStandardMaterial({ color: index % 2 ? 0x284f5a : 0x9e3a32, roughness: 0.72 });
      const awning = boxMesh(width * 0.82, 0.14, 1.25, awningMat);
      awning.position.set(0, -height / 2 + 2.55, frontZ + 0.5);
      awning.rotation.x = -0.12;
      building.add(awning);
    }

    if (height > 12) {
      for (let f = 1; f < floors; f += 2) {
        const balcony = boxMesh(width * 0.78, 0.13, 0.85, new THREE.MeshStandardMaterial({ color: 0xbeb7aa, roughness: 0.9 }));
        balcony.position.set(0, -height / 2 + 3.2 + f * 3.05, frontZ + 0.38);
        building.add(balcony);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, 0.65, 0.05), new THREE.MeshStandardMaterial({ color: 0x30383a, metalness: 0.65, roughness: 0.48 }));
        rail.position.set(0, balcony.position.y + 0.35, frontZ + 0.78);
        building.add(rail);
      }
    }

    if (index % 2 === 0) {
      const ac = boxMesh(1.2, 0.65, 0.42, new THREE.MeshStandardMaterial({ color: 0xd2d1c9, roughness: 0.86 }));
      ac.position.set(width * 0.31, -height / 2 + Math.min(height - 1.2, 5.9), frontZ + 0.3);
      building.add(ac);
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 20), new THREE.MeshStandardMaterial({ color: 0x4b5354, roughness: 0.7 }));
      fan.rotation.x = Math.PI / 2;
      fan.position.set(0, 0, 0.23);
      ac.add(fan);
    }

    if (index % 4 === 0) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 18), new THREE.MeshStandardMaterial({ color: 0x355c71, metalness: 0.25, roughness: 0.55 }));
      tank.position.set(width * 0.25, height / 2 + 0.75, 0);
      building.add(tank);
    }

    const c = Math.abs(Math.cos(rotation));
    const s = Math.abs(Math.sin(rotation));
    const worldW = width * c + depth * s;
    const worldD = width * s + depth * c;
    this.colliders.push({ minX: x - worldW / 2 - 0.25, maxX: x + worldW / 2 + 0.25, minZ: z - worldD / 2 - 0.25, maxZ: z + worldD / 2 + 0.25 });
  }

  addMarketHall() {
    const group = new THREE.Group();
    group.position.set(88, 0, 54);
    const floor = boxMesh(34, 0.22, 26, new THREE.MeshStandardMaterial({ color: 0xb9af9c, roughness: 0.95 }));
    floor.position.y = 0.1;
    group.add(floor);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x6d4135, roughness: 0.86, side: THREE.DoubleSide }));
    roof.scale.z = 0.72;
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 7.5;
    group.add(roof);
    for (const px of [-14, -7, 0, 7, 14]) {
      for (const pz of [-10, 10]) {
        const post = boxMesh(0.35, 7.2, 0.35, new THREE.MeshStandardMaterial({ color: 0x49443c, roughness: 0.85 }));
        post.position.set(px, 3.6, pz);
        group.add(post);
      }
    }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.4), new THREE.MeshStandardMaterial({ map: makeSignTexture('CHỢ NHỎ', '#8d2430', '#fff0c4', 77), side: THREE.DoubleSide }));
    banner.position.set(0, 5.3, -10.2);
    group.add(banner);
    this.group.add(group);
    this.colliders.push({ minX: 70, maxX: 106, minZ: 41, maxZ: 67 });
  }

  addStreetDetails() {
    this.addUtilityPoles();
    this.addStreetLights();
    this.addParkedScooters();
    this.addStalls();
  }

  addUtilityPoles() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x46433e, roughness: 0.94 });
    const cableMat = new THREE.LineBasicMaterial({ color: 0x1e2528, transparent: true, opacity: 0.75 });
    const lines = [];
    for (let x = -105; x <= 105; x += 24) {
      for (const z of [-12.3, 12.3]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.23, 8.8, 10), poleMat);
        pole.position.set(x, 4.4, z);
        pole.castShadow = true;
        this.group.add(pole);
        const cross = boxMesh(2.2, 0.12, 0.12, poleMat);
        cross.position.set(x, 7.8, z);
        this.group.add(cross);
        lines.push({ x, z });
      }
    }
    for (const z of [-12.3, 12.3]) {
      const row = lines.filter(p => p.z === z);
      for (let i = 0; i < row.length - 1; i++) {
        for (let offset = -0.65; offset <= 0.65; offset += 0.65) {
          const a = row[i], b = row[i + 1];
          const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(a.x, 7.75 + offset * 0.12, z + offset),
            new THREE.Vector3((a.x + b.x) / 2, 7.08 + offset * 0.12, z + offset),
            new THREE.Vector3(b.x, 7.75 + offset * 0.12, z + offset)
          );
          const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16));
          this.group.add(new THREE.Line(geometry, cableMat));
        }
      }
    }
  }

  addStreetLights() {
    const metal = new THREE.MeshStandardMaterial({ color: 0x586267, metalness: 0.55, roughness: 0.48 });
    for (let x = -96; x <= 96; x += 24) {
      for (const z of [-8.5, 8.5]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 5.2, 10), metal);
        pole.position.set(x, 2.65, z);
        this.group.add(pole);
        const arm = boxMesh(1.1, 0.08, 0.08, metal);
        arm.position.set(x + (z > 0 ? 0.52 : -0.52), 5.1, z);
        this.group.add(arm);
        const lamp = boxMesh(0.5, 0.18, 0.32, new THREE.MeshStandardMaterial({ color: 0xe8e0c6, emissive: 0xffd890, emissiveIntensity: 0.25 }));
        lamp.position.set(x + (z > 0 ? 1.03 : -1.03), 5.02, z);
        this.group.add(lamp);
      }
    }
  }

  addScooter(x, z, rotation = 0, color = 0x963d32) {
    const group = new THREE.Group();
    const rubber = new THREE.MeshStandardMaterial({ color: 0x181c1e, roughness: 0.72 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x737a7c, metalness: 0.72, roughness: 0.33 });
    const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.4 });
    for (const dz of [-0.72, 0.72]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.075, 10, 22), rubber);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.38, dz);
      group.add(wheel);
    }
    const body = boxMesh(0.46, 0.44, 1.35, paint); body.position.set(0, 0.68, 0); body.rotation.x = -0.05; group.add(body);
    const seat = boxMesh(0.42, 0.16, 0.75, new THREE.MeshStandardMaterial({ color: 0x24282a, roughness: 0.76 })); seat.position.set(0, 1.02, 0.15); group.add(seat);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.9,8), metal); fork.rotation.x = 0.18; fork.position.set(0,0.83,-0.62); group.add(fork);
    const handle = boxMesh(0.72,0.06,0.06,metal); handle.position.set(0,1.32,-0.72); group.add(handle);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.13,14,10), new THREE.MeshStandardMaterial({ color: 0xf4e3b5, emissive: 0xffe3a4, emissiveIntensity: 0.22 })); light.position.set(0,1.12,-0.75); group.add(light);
    group.position.set(x,0,z); group.rotation.y = rotation;
    group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.group.add(group);
    return group;
  }

  addParkedScooters() {
    const colors = [0x9c2f32, 0x2f5f78, 0xe0d9ce, 0x33393c, 0x9d7031];
    for (let i = 0; i < 20; i++) {
      const north = i % 2 === 0;
      const x = -103 + i * 10.6;
      const z = north ? -10.7 : 10.7;
      const scooter = this.addScooter(x, z, north ? Math.PI / 2 + 0.15 : -Math.PI / 2 - 0.1, colors[i % colors.length]);
      scooter.scale.setScalar(0.82 + this.rand() * 0.12);
    }
  }

  addStalls() {
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x665043, roughness: 0.9 });
    const canopyColors = [0x3b805f, 0xa94237, 0xd0a22e, 0x315e83];
    const positions = [[81,39],[91,39],[101,39],[77,71],[89,71],[101,71]];
    positions.forEach((p,i) => {
      const g = new THREE.Group();
      const table = boxMesh(3,0.75,1.4,tableMat); table.position.y = 0.55; g.add(table);
      const canopy = boxMesh(3.6,0.16,2.2,new THREE.MeshStandardMaterial({ color: canopyColors[i%canopyColors.length], roughness: 0.74 })); canopy.position.y = 2.55; g.add(canopy);
      for (const sx of [-1.55,1.55]) for (const sz of [-0.82,0.82]) { const post = boxMesh(0.08,2.3,0.08,tableMat); post.position.set(sx,1.35,sz); g.add(post); }
      g.position.set(p[0],0,p[1]);
      this.group.add(g);
    });
  }

  addVegetation() {
    const treePositions = [
      [-109,-9],[-86,9],[-22,-9],[15,9],[71,-9],[104,9],[-64,34],[-64,58],[-48,-35],[-48,-74],[42,31],[42,61],[56,-34],[56,-72],[-98,-54],[18,-54],[92,-54]
    ];
    treePositions.forEach((p,i) => this.addTree(p[0],p[1],0.85 + (i%4)*0.08));
    for (let i = 0; i < 22; i++) this.addPlanter(-105 + i*10, i%2 ? 8.1 : -8.1);
  }

  addTree(x,z,scale=1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.34,3.9,10), new THREE.MeshStandardMaterial({ color: 0x6c4d35, roughness: 0.96 }));
    trunk.position.y = 1.95;
    g.add(trunk);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d744d, roughness: 0.88 });
    for (let i = 0; i < 6; i++) {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25 + this.rand()*0.45,1), leafMat);
      const a = i / 6 * Math.PI*2;
      crown.position.set(Math.cos(a)*0.85,4.2 + (i%2)*0.45,Math.sin(a)*0.85);
      crown.scale.y = 0.8 + this.rand()*0.45;
      crown.castShadow = true;
      g.add(crown);
    }
    g.position.set(x,0,z); g.scale.setScalar(scale); this.group.add(g);
  }

  addPlanter(x,z) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.3,0.55,14), new THREE.MeshStandardMaterial({ color: 0x8e6951, roughness: 0.94 }));
    pot.position.set(x,0.35,z);
    this.group.add(pot);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.55,10,8), new THREE.MeshStandardMaterial({ color: 0x4e7d46, roughness: 0.9 }));
    leaves.scale.y = 1.35; leaves.position.set(x,1.1,z); leaves.castShadow = true; this.group.add(leaves);
  }

  addAtmosphereDetails() {
    const drainMat = new THREE.MeshStandardMaterial({ color: 0x4a4e4e, metalness: 0.45, roughness: 0.62 });
    for (let x=-104; x<=104; x+=16) {
      for (const z of [-6.9,6.9]) {
        const drain = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.04,0.28),drainMat);
        drain.position.set(x,0.03,z); this.group.add(drain);
      }
    }
  }
}
