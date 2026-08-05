import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  createAsphaltMaterial,
  createGlassMaterial,
  createRoofMaterial,
  createShutterMaterial,
  createSidewalkMaterial,
  createSignTexture,
  makeMaterialSet,
  seededRandom
} from './materials.js';
import { createFallbackMapData, loadOpenStreetMapData } from './map-data.js';

const SHOP_NAMES = [
  'CÀ PHÊ AN NHIÊN', 'BÁNH MÌ', 'PHỞ GIA TRUYỀN', 'TẠP HÓA', 'CƠM TẤM',
  'NHÀ THUỐC', 'SỬA XE', 'TRÀ SỮA', 'ĐIỆN MÁY', 'MỸ PHẨM', 'BÚN CÁ', 'GIẶT SẤY'
];
const SIGN_COLORS = ['#314c55', '#7a3732', '#315345', '#7d582b', '#4b405f', '#6a313f'];
const WALL_PALETTE = ['#c4b39f', '#d6c8b6', '#aeb6b1', '#c9a997', '#d9c79c', '#9fa9ae', '#c4b9aa', '#b98d75'];

function polygonArea(points) {
  let area = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    area += points[index].x * points[index + 1].z - points[index + 1].x * points[index].z;
  }
  return Math.abs(area) * 0.5;
}

function polygonCentroid(points) {
  const usable = points.slice(0, -1);
  if (!usable.length) return { x: 0, z: 0 };
  return usable.reduce((sum, point) => ({ x: sum.x + point.x / usable.length, z: sum.z + point.z / usable.length }), { x: 0, z: 0 });
}

function longestEdge(points) {
  let selected = null;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    if (!selected || length > selected.length) selected = { a, b, dx, dz, length };
  }
  return selected;
}

function aabbFromPoints(points, padding = 0.05) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  });
  return { minX: minX - padding, maxX: maxX + padding, minZ: minZ - padding, maxZ: maxZ + padding };
}

function addShadowFlags(root, cast = true) {
  root.traverse(object => {
    if (object.isMesh) {
      object.castShadow = cast;
      object.receiveShadow = true;
    }
  });
}

function roadWidth(tags = {}) {
  const highway = tags.highway;
  if (highway === 'primary' || highway === 'trunk') return 12;
  if (highway === 'secondary') return 9.5;
  if (highway === 'tertiary') return 8;
  if (highway === 'residential' || highway === 'unclassified') return 5.8;
  if (highway === 'service') return 4.2;
  if (highway === 'living_street') return 4.6;
  if (highway === 'footway' || highway === 'path') return 1.8;
  return 4.8;
}

function parseLevels(tags, rand) {
  const explicitHeight = Number.parseFloat(tags.height);
  if (Number.isFinite(explicitHeight) && explicitHeight > 2) return Math.max(1, Math.round(explicitHeight / 3.15));
  const explicitLevels = Number.parseInt(tags['building:levels'], 10);
  if (Number.isFinite(explicitLevels) && explicitLevels > 0) return Math.min(explicitLevels, 9);
  return 2 + Math.floor(rand() * 4.2);
}

function box(width, height, depth, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

export class RealCityBuilder {
  constructor(scene, { center, radius = 185 } = {}) {
    this.scene = scene;
    this.center = center;
    this.radius = radius;
    this.group = new THREE.Group();
    this.group.name = 'CanThoRealCity';
    this.scene.add(this.group);
    this.rand = seededRandom(10044179);
    this.colliders = [];
    this.walkPaths = [];
    this.roadSegments = [];
    this.startPosition = new THREE.Vector3(-4, 1.7, 3.4);
    this.materials = {
      asphalt: createAsphaltMaterial(),
      sidewalk: createSidewalkMaterial(),
      walls: makeMaterialSet(81),
      roof: createRoofMaterial(),
      glass: createGlassMaterial(),
      shutter: createShutterMaterial(),
      darkMetal: new THREE.MeshStandardMaterial({ color: 0x34393a, roughness: 0.58, metalness: 0.48 }),
      paleMetal: new THREE.MeshStandardMaterial({ color: 0xa9b0af, roughness: 0.55, metalness: 0.42 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x76543d, roughness: 0.86 }),
      concrete: new THREE.MeshStandardMaterial({ color: 0xa9a49a, roughness: 0.95 }),
      foliage: new THREE.MeshStandardMaterial({ color: 0x416a43, roughness: 0.92 }),
      foliageDark: new THREE.MeshStandardMaterial({ color: 0x2f5536, roughness: 0.94 }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x5b4738, roughness: 0.98 })
    };
  }

  async build(onProgress = () => {}) {
    onProgress(0.04, 'Requesting the real street geometry…');
    let mapData;
    try {
      mapData = await loadOpenStreetMapData({ center: this.center, radius: this.radius });
    } catch (error) {
      console.warn('Using fallback map geometry:', error);
      mapData = createFallbackMapData();
    }

    onProgress(0.14, mapData.source === 'osm' ? 'OpenStreetMap geometry received.' : 'Using the bundled neighbourhood fallback.');
    this.addBaseGround();
    this.addRoadNetwork(mapData.roads);
    onProgress(0.34, 'Building roads, drains and pavements…');
    this.addBuildings(mapData.buildings);
    onProgress(0.67, 'Adding shopfronts, balconies and weathering…');
    this.addMappedPoints(mapData.points);
    this.addStreetFurniture();
    onProgress(0.84, 'Hanging cables and parking scooters…');
    this.addUtilityLines();
    this.addBackgroundBlocks();
    onProgress(0.92, 'Finalising the street atmosphere…');

    return {
      colliders: this.colliders,
      walkPaths: this.walkPaths,
      startPosition: this.startPosition,
      mapSource: mapData.source
    };
  }

  addBaseGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 520),
      new THREE.MeshStandardMaterial({ color: 0x858878, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  addRoadNetwork(roads) {
    const usableRoads = roads.filter(road => road.points.length >= 2).slice(0, 45);
    let longest = null;

    usableRoads.forEach((road, roadIndex) => {
      const width = roadWidth(road.tags);
      const sidewalkEligible = width >= 4.2 && !['footway', 'path', 'steps'].includes(road.tags.highway);
      const leftPath = [];
      const rightPath = [];

      for (let index = 0; index < road.points.length - 1; index += 1) {
        const start = road.points[index];
        const end = road.points[index + 1];
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const length = Math.hypot(dx, dz);
        if (length < 0.4 || Math.abs(start.x) > 220 || Math.abs(start.z) > 220) continue;
        const angle = Math.atan2(dx, dz);
        const midX = (start.x + end.x) / 2;
        const midZ = (start.z + end.z) / 2;

        const roadMesh = box(width, 0.08, length + 0.45, this.materials.asphalt);
        roadMesh.position.set(midX, -0.015, midZ);
        roadMesh.rotation.y = angle;
        roadMesh.receiveShadow = true;
        this.group.add(roadMesh);
        this.roadSegments.push({ start, end, width, length });

        if (!longest || length > longest.length) longest = { start, end, width, length };

        if (sidewalkEligible) {
          const ux = dx / length;
          const uz = dz / length;
          const nx = -uz;
          const nz = ux;
          const pavementWidth = width >= 8 ? 1.75 : 1.25;
          const offset = width / 2 + pavementWidth / 2 + 0.22;

          [-1, 1].forEach(side => {
            const pavement = box(pavementWidth, 0.12, length + 0.3, this.materials.sidewalk);
            pavement.position.set(midX + nx * offset * side, 0.045, midZ + nz * offset * side);
            pavement.rotation.y = angle;
            pavement.receiveShadow = true;
            this.group.add(pavement);

            const curb = box(0.13, 0.18, length + 0.35, this.materials.concrete);
            curb.position.set(midX + nx * (width / 2 + 0.08) * side, 0.07, midZ + nz * (width / 2 + 0.08) * side);
            curb.rotation.y = angle;
            curb.receiveShadow = true;
            this.group.add(curb);
          });

          leftPath.push(new THREE.Vector3(start.x + nx * (width / 2 + 0.95), 0.12, start.z + nz * (width / 2 + 0.95)));
          rightPath.push(new THREE.Vector3(start.x - nx * (width / 2 + 0.95), 0.12, start.z - nz * (width / 2 + 0.95)));
          if (index === road.points.length - 2) {
            leftPath.push(new THREE.Vector3(end.x + nx * (width / 2 + 0.95), 0.12, end.z + nz * (width / 2 + 0.95)));
            rightPath.push(new THREE.Vector3(end.x - nx * (width / 2 + 0.95), 0.12, end.z - nz * (width / 2 + 0.95)));
          }
        }
      }

      if (leftPath.length >= 2) this.walkPaths.push(leftPath);
      if (rightPath.length >= 2) this.walkPaths.push(rightPath.reverse());

      if (roadIndex === 0 && usableRoads.length === 1) {
        this.addCenterLine(road.points, width);
      }
    });

    if (longest) {
      const dx = longest.end.x - longest.start.x;
      const dz = longest.end.z - longest.start.z;
      const length = Math.hypot(dx, dz) || 1;
      const nx = -dz / length;
      const nz = dx / length;
      this.startPosition.set(
        (longest.start.x + longest.end.x) / 2 + nx * 1.2,
        1.7,
        (longest.start.z + longest.end.z) / 2 + nz * 1.2
      );
    }
  }

  addCenterLine(points, width) {
    if (width < 7) return;
    const material = new THREE.MeshBasicMaterial({ color: 0xc8b37b, transparent: true, opacity: 0.42 });
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      if (length < 1) continue;
      const marking = box(0.1, 0.012, length, material);
      marking.position.set((start.x + end.x) / 2, 0.04, (start.z + end.z) / 2);
      marking.rotation.y = Math.atan2(dx, dz);
      this.group.add(marking);
    }
  }

  addBuildings(buildings) {
    const candidates = buildings
      .filter(building => building.points.length >= 4 && polygonArea(building.points) > 8)
      .filter(building => building.points.some(point => Math.abs(point.x) < 190 && Math.abs(point.z) < 190))
      .slice(0, 115);

    candidates.forEach((building, index) => this.addBuilding(building, index));
  }

  addBuilding(building, index) {
    const rand = seededRandom(building.id || 300 + index);
    const points = [...building.points];
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.hypot(first.x - last.x, first.z - last.z) > 0.05) points.push({ ...first });

    const area = polygonArea(points);
    if (area < 8 || area > 2200) return;
    const levels = parseLevels(building.tags, rand);
    const floorHeight = 3.05;
    const height = levels * floorHeight + 0.35;
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, -points[0].z);
    points.slice(1).forEach(point => shape.lineTo(point.x, -point.z));

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      curveSegments: 1
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();

    const wallMaterial = this.materials.walls[Math.floor(rand() * this.materials.walls.length)];
    const mesh = new THREE.Mesh(geometry, [this.materials.roof, wallMaterial]);
    mesh.castShadow = index < 70;
    mesh.receiveShadow = true;
    mesh.name = `Building-${building.id}`;
    this.group.add(mesh);
    this.colliders.push(aabbFromPoints(points, 0.1));

    const edge = longestEdge(points);
    if (edge && edge.length > 3.4) this.addFacadeDetails({ edge, points, levels, floorHeight, height, rand, buildingId: building.id });
  }

  addFacadeDetails({ edge, points, levels, floorHeight, rand, buildingId }) {
    const tangent = new THREE.Vector2(edge.dx, edge.dz).normalize();
    const centroid = polygonCentroid(points);
    const midpoint = new THREE.Vector2((edge.a.x + edge.b.x) / 2, (edge.a.z + edge.b.z) / 2);
    let normal = new THREE.Vector2(-tangent.y, tangent.x);
    const toMidpoint = midpoint.clone().sub(new THREE.Vector2(centroid.x, centroid.z));
    if (normal.dot(toMidpoint) < 0) normal.multiplyScalar(-1);
    const rotationY = Math.atan2(-tangent.y, tangent.x);
    const frontage = edge.length;
    const windowCount = Math.max(1, Math.floor(frontage / 2.25));
    const spacing = frontage / windowCount;
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d4c9, roughness: 0.86 });
    const frameMaterial = this.materials.darkMetal;

    for (let floor = 1; floor < levels; floor += 1) {
      for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
        if (rand() < 0.08) continue;
        const along = -frontage / 2 + spacing * (windowIndex + 0.5);
        const width = Math.min(1.22, spacing * 0.62);
        const height = 1.35 + rand() * 0.18;
        const x = midpoint.x + tangent.x * along + normal.x * 0.075;
        const z = midpoint.y + tangent.y * along + normal.y * 0.075;
        const y = floor * floorHeight + 1.55;

        const trim = box(width + 0.16, height + 0.16, 0.08, trimMaterial);
        trim.position.set(x, y, z);
        trim.rotation.y = rotationY;
        this.group.add(trim);

        const glass = box(width, height, 0.09, this.materials.glass);
        glass.position.set(x + normal.x * 0.055, y, z + normal.y * 0.055);
        glass.rotation.y = rotationY;
        glass.castShadow = false;
        this.group.add(glass);

        const mullion = box(0.035, height, 0.105, frameMaterial);
        mullion.position.copy(glass.position);
        mullion.rotation.y = rotationY;
        this.group.add(mullion);
      }

      if (frontage > 5.2 && floor === 1 && rand() > 0.48) {
        this.addBalcony(midpoint, tangent, normal, rotationY, frontage, floorHeight * floor + 0.72);
      }
    }

    const groundWidth = Math.min(frontage * 0.76, Math.max(2.8, frontage - 0.65));
    const isShop = frontage > 4.1 && rand() > 0.26;
    if (isShop) {
      const shuttered = rand() > 0.66;
      const groundMaterial = shuttered ? this.materials.shutter : this.materials.glass;
      const shopFront = box(groundWidth, 2.3, 0.11, groundMaterial);
      shopFront.position.set(midpoint.x + normal.x * 0.085, 1.28, midpoint.y + normal.y * 0.085);
      shopFront.rotation.y = rotationY;
      this.group.add(shopFront);

      const signText = SHOP_NAMES[Math.floor(rand() * SHOP_NAMES.length)];
      const signTexture = createSignTexture(signText, SIGN_COLORS[Math.floor(rand() * SIGN_COLORS.length)], '#f5eddc', buildingId || 8);
      const sign = box(groundWidth, 0.66, 0.11, new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.62 }));
      sign.position.set(midpoint.x + normal.x * 0.14, 2.86, midpoint.y + normal.y * 0.14);
      sign.rotation.y = rotationY;
      this.group.add(sign);

      if (rand() > 0.44) this.addAwning(midpoint, tangent, normal, rotationY, groundWidth, 2.65, rand);
    } else {
      const gate = box(Math.min(2.4, groundWidth), 2.45, 0.12, this.materials.shutter);
      gate.position.set(midpoint.x + normal.x * 0.085, 1.28, midpoint.y + normal.y * 0.085);
      gate.rotation.y = rotationY;
      this.group.add(gate);
    }

    if (levels > 2 && rand() > 0.32) {
      this.addAirConditioner(midpoint, tangent, normal, rotationY, frontage, floorHeight * (1 + Math.floor(rand() * (levels - 1))) + 1.25, rand);
    }
  }

  addBalcony(midpoint, tangent, normal, rotationY, frontage, y) {
    const width = Math.min(frontage * 0.72, 5.6);
    const slab = box(width, 0.12, 0.95, this.materials.concrete);
    slab.position.set(midpoint.x + normal.x * 0.48, y, midpoint.y + normal.y * 0.48);
    slab.rotation.y = rotationY;
    this.group.add(slab);

    const railMaterial = this.materials.darkMetal;
    const rail = box(width, 0.05, 0.05, railMaterial);
    rail.position.set(midpoint.x + normal.x * 0.94, y + 0.78, midpoint.y + normal.y * 0.94);
    rail.rotation.y = rotationY;
    this.group.add(rail);
    for (let index = 0; index <= 6; index += 1) {
      const along = -width / 2 + width * index / 6;
      const post = box(0.035, 0.82, 0.035, railMaterial);
      post.position.set(midpoint.x + tangent.x * along + normal.x * 0.94, y + 0.4, midpoint.y + tangent.y * along + normal.y * 0.94);
      this.group.add(post);
    }
  }

  addAwning(midpoint, tangent, normal, rotationY, width, y, rand) {
    const colors = [0x596e5c, 0x734843, 0x86703f, 0x405f70];
    const material = new THREE.MeshStandardMaterial({ color: colors[Math.floor(rand() * colors.length)], roughness: 0.78, side: THREE.DoubleSide });
    const awning = box(width * 0.92, 0.08, 1.35, material);
    awning.position.set(midpoint.x + normal.x * 0.72, y, midpoint.y + normal.y * 0.72);
    awning.rotation.set(0.12 * (normal.x + normal.y), rotationY, 0);
    this.group.add(awning);
  }

  addAirConditioner(midpoint, tangent, normal, rotationY, frontage, y, rand) {
    const along = (rand() - 0.5) * Math.max(0, frontage - 1.8);
    const x = midpoint.x + tangent.x * along + normal.x * 0.22;
    const z = midpoint.y + tangent.y * along + normal.y * 0.22;
    const casing = box(0.75, 0.48, 0.28, this.materials.paleMetal);
    casing.position.set(x, y, z);
    casing.rotation.y = rotationY;
    this.group.add(casing);
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 18), this.materials.darkMetal);
    fan.rotation.x = Math.PI / 2;
    fan.rotation.z = rotationY;
    fan.position.set(x + normal.x * 0.17, y, z + normal.y * 0.17);
    this.group.add(fan);
  }

  addMappedPoints(points) {
    const trees = points.filter(point => point.tags.natural === 'tree').slice(0, 35);
    trees.forEach((point, index) => this.addTree(point.x, point.z, 0.8 + (index % 4) * 0.08));

    if (trees.length < 5) {
      const fallbackTrees = [[-86, 10], [-22, -10], [30, 10], [87, -10], [-52, 38], [64, -40], [9, 69]];
      fallbackTrees.forEach(([x, z], index) => this.addTree(x, z, 0.88 + (index % 3) * 0.09));
    }
  }

  addTree(x, z, scale = 1) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.27, 3.2, 9), this.materials.trunk);
    trunk.position.y = 1.6;
    group.add(trunk);
    const clusters = [
      [-0.45, 3.45, 0.05, 1.12], [0.44, 3.52, -0.08, 1.08], [0, 4.12, 0, 1.25],
      [-0.18, 3.75, 0.52, 0.92], [0.22, 3.7, -0.55, 0.88]
    ];
    clusters.forEach((cluster, index) => {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(cluster[3], 2), index % 2 ? this.materials.foliage : this.materials.foliageDark);
      crown.position.set(cluster[0], cluster[1], cluster[2]);
      crown.scale.y = 0.84;
      group.add(crown);
    });
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    addShadowFlags(group, true);
    this.group.add(group);
  }

  addStreetFurniture() {
    const positions = this.walkPaths.flatMap(path => path.filter((_, index) => index % 3 === 0)).slice(0, 20);
    positions.forEach((point, index) => {
      if (index % 2 === 0) this.addPlanter(point.x + 0.7, point.z + 0.5, 0.8 + (index % 3) * 0.1);
      if (index % 4 === 1) this.addParkedScooter(point.x - 0.8, point.z - 0.35, index * 0.73);
    });
  }

  addPlanter(x, z, scale = 1) {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.52, 12), new THREE.MeshStandardMaterial({ color: 0x8b5d48, roughness: 0.94 }));
    pot.position.y = 0.26;
    group.add(pot);
    for (let index = 0; index < 5; index += 1) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), this.materials.foliage);
      leaf.position.set(Math.cos(index * 1.7) * 0.22, 0.64 + (index % 2) * 0.12, Math.sin(index * 1.7) * 0.22);
      leaf.scale.set(0.55, 1.25, 0.35);
      group.add(leaf);
    }
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    addShadowFlags(group, true);
    this.group.add(group);
  }

  addParkedScooter(x, z, rotation) {
    const group = new THREE.Group();
    const rubber = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.82 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0x919797, roughness: 0.28, metalness: 0.82 });
    const paints = [0x812f2b, 0x2f5569, 0xd0ccc1, 0x34383a, 0x6d6040];
    const paint = new THREE.MeshStandardMaterial({ color: paints[Math.floor(this.rand() * paints.length)], roughness: 0.32, metalness: 0.24 });
    const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x272828, roughness: 0.78 });

    [-0.58, 0.58].forEach(localZ => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.055, 10, 24), rubber);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.3, localZ);
      group.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16), chrome);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      group.add(hub);
    });

    const body = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.48, 1.15, 4, 0.13), paint);
    body.position.set(0, 0.58, 0.06);
    body.rotation.x = -0.05;
    group.add(body);
    const front = new THREE.Mesh(new RoundedBoxGeometry(0.39, 0.78, 0.34, 4, 0.11), paint);
    front.position.set(0, 0.86, -0.48);
    front.rotation.x = -0.16;
    group.add(front);
    const seat = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.12, 0.64, 3, 0.06), seatMaterial);
    seat.position.set(0, 0.92, 0.2);
    group.add(seat);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.76, 8), chrome);
    fork.position.set(0, 0.72, -0.58);
    fork.rotation.x = 0.16;
    group.add(fork);
    const handle = box(0.58, 0.045, 0.045, chrome);
    handle.position.set(0, 1.26, -0.57);
    group.add(handle);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xe7dfc7, emissive: 0x332b1a, roughness: 0.2 }));
    light.position.set(0, 1.04, -0.71);
    light.scale.z = 0.42;
    group.add(light);
    [-1, 1].forEach(side => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 6), chrome);
      stem.position.set(side * 0.23, 1.34, -0.55);
      stem.rotation.z = side * 0.42;
      group.add(stem);
      const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), chrome);
      mirror.position.set(side * 0.3, 1.47, -0.55);
      mirror.scale.z = 0.3;
      group.add(mirror);
    });

    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    group.scale.setScalar(0.95);
    addShadowFlags(group, true);
    this.group.add(group);
  }

  addUtilityLines() {
    const polePositions = [];
    this.roadSegments.slice(0, 12).forEach((segment, index) => {
      const dx = segment.end.x - segment.start.x;
      const dz = segment.end.z - segment.start.z;
      const length = Math.hypot(dx, dz) || 1;
      const nx = -dz / length;
      const nz = dx / length;
      const side = index % 2 === 0 ? 1 : -1;
      const x = (segment.start.x + segment.end.x) / 2 + nx * (segment.width / 2 + 1.45) * side;
      const z = (segment.start.z + segment.end.z) / 2 + nz * (segment.width / 2 + 1.45) * side;
      if (Math.abs(x) > 150 || Math.abs(z) > 150) return;
      polePositions.push(new THREE.Vector3(x, 0, z));
      this.addUtilityPole(x, z);
    });

    for (let index = 0; index < polePositions.length - 1; index += 1) {
      const a = polePositions[index];
      const b = polePositions[index + 1];
      if (a.distanceTo(b) > 70) continue;
      this.addCable(a.clone().setY(5.8), b.clone().setY(5.8), 0x202324);
      if (index % 2 === 0) this.addCable(a.clone().setY(5.45), b.clone().setY(5.45), 0x2b2d2e);
    }
  }

  addUtilityPole(x, z) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 6.2, 9), new THREE.MeshStandardMaterial({ color: 0x6f6d65, roughness: 0.95 }));
    pole.position.y = 3.1;
    group.add(pole);
    const arm = box(1.15, 0.07, 0.08, this.materials.darkMetal);
    arm.position.y = 5.65;
    group.add(arm);
    const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.55, 7), this.materials.darkMetal);
    lampArm.position.set(0.52, 5.1, 0);
    lampArm.rotation.z = -0.62;
    group.add(lampArm);
    const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.13, 0.18, 3, 0.05), this.materials.paleMetal);
    lamp.position.set(0.98, 4.62, 0);
    group.add(lamp);
    group.position.set(x, 0, z);
    addShadowFlags(group, true);
    this.group.add(group);
  }

  addCable(start, end, color) {
    const distance = start.distanceTo(end);
    const midpoint = start.clone().lerp(end, 0.5);
    midpoint.y -= Math.min(1.8, distance * 0.035);
    const curve = new THREE.QuadraticBezierCurve3(start, midpoint, end);
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(8, Math.floor(distance / 2)), 0.018, 5, false),
      new THREE.MeshStandardMaterial({ color, roughness: 0.72 })
    );
    cable.castShadow = false;
    this.group.add(cable);
  }

  addBackgroundBlocks() {
    const material = new THREE.MeshStandardMaterial({ color: 0x8d9695, roughness: 0.96 });
    for (let index = 0; index < 28; index += 1) {
      const angle = (index / 28) * Math.PI * 2;
      const distance = 205 + (index % 4) * 13;
      const width = 10 + (index % 5) * 3;
      const depth = 12 + (index % 3) * 4;
      const height = 10 + (index % 7) * 4;
      const block = box(width, height, depth, material);
      block.position.set(Math.cos(angle) * distance, height / 2 - 0.05, Math.sin(angle) * distance);
      block.rotation.y = -angle + Math.PI / 2;
      block.receiveShadow = true;
      this.group.add(block);
    }
  }
}
