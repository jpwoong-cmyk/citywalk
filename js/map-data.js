const CENTER = { lat: 10.044179, lon: 105.7856213 };

export function projectCoordinate(lat, lon, center = CENTER) {
  const metresPerLon = 111320 * Math.cos(center.lat * Math.PI / 180);
  const metresPerLat = 110540;
  return {
    x: (lon - center.lon) * metresPerLon,
    z: -(lat - center.lat) * metresPerLat
  };
}

function parseWay(element, center) {
  if (!Array.isArray(element.geometry) || element.geometry.length < 2) return null;
  return {
    id: element.id,
    tags: element.tags || {},
    points: element.geometry.map(point => projectCoordinate(point.lat, point.lon, center))
  };
}

export async function loadOpenStreetMapData({ center = CENTER, radius = 185, timeoutMs = 11000 } = {}) {
  const query = `
    [out:json][timeout:20];
    (
      way["building"](around:${radius},${center.lat},${center.lon});
      way["highway"](around:${radius + 50},${center.lat},${center.lon});
      node["natural"="tree"](around:${radius},${center.lat},${center.lon});
      node["amenity"](around:${radius},${center.lat},${center.lon});
      node["shop"](around:${radius},${center.lat},${center.lon});
    );
    out geom;
  `;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`OpenStreetMap request failed with ${response.status}`);
    const json = await response.json();
    const buildings = [];
    const roads = [];
    const points = [];

    for (const element of json.elements || []) {
      if (element.type === 'way') {
        const way = parseWay(element, center);
        if (!way) continue;
        if (way.tags.building) buildings.push(way);
        if (way.tags.highway) roads.push(way);
      } else if (element.type === 'node' && Number.isFinite(element.lat) && Number.isFinite(element.lon)) {
        const projected = projectCoordinate(element.lat, element.lon, center);
        points.push({ id: element.id, tags: element.tags || {}, ...projected });
      }
    }

    if (buildings.length < 3 || roads.length < 1) throw new Error('OpenStreetMap returned too little geometry');
    return { source: 'osm', center, buildings, roads, points };
  } finally {
    clearTimeout(timer);
  }
}

function rectangle(cx, cz, width, depth, rotation = 0) {
  const halfW = width / 2;
  const halfD = depth / 2;
  const corners = [
    { x: -halfW, z: -halfD },
    { x: halfW, z: -halfD },
    { x: halfW, z: halfD },
    { x: -halfW, z: halfD },
    { x: -halfW, z: -halfD }
  ];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return corners.map(point => ({
    x: cx + point.x * cos - point.z * sin,
    z: cz + point.x * sin + point.z * cos
  }));
}

export function createFallbackMapData() {
  const roads = [
    { id: 1, tags: { highway: 'tertiary', name: 'Đường chính' }, points: [{ x: -120, z: 0 }, { x: 120, z: 0 }] },
    { id: 2, tags: { highway: 'residential' }, points: [{ x: -48, z: -105 }, { x: -48, z: 105 }] },
    { id: 3, tags: { highway: 'residential' }, points: [{ x: 54, z: -105 }, { x: 54, z: 105 }] },
    { id: 4, tags: { highway: 'service' }, points: [{ x: -118, z: -58 }, { x: 118, z: -58 }] },
    { id: 5, tags: { highway: 'service' }, points: [{ x: -118, z: 62 }, { x: 118, z: 62 }] }
  ];

  const buildings = [];
  let id = 100;
  const rows = [
    { z: -25, facing: 1, start: -111, end: 112 },
    { z: 25, facing: -1, start: -111, end: 112 },
    { z: -81, facing: 1, start: -111, end: 112 },
    { z: 83, facing: -1, start: -111, end: 112 }
  ];

  for (const row of rows) {
    let x = row.start;
    while (x < row.end) {
      const width = 6.2 + ((id * 17) % 34) / 10;
      const depth = 12 + ((id * 11) % 55) / 10;
      const cx = x + width / 2;
      const cz = row.z + row.facing * depth / 2;
      const levels = 2 + (id % 4);
      buildings.push({
        id,
        tags: { building: 'yes', 'building:levels': String(levels) },
        points: rectangle(cx, cz, width, depth)
      });
      x += width + 1.1 + (id % 3) * 0.35;
      id += 1;
    }
  }

  const points = [
    { id: 901, tags: { natural: 'tree' }, x: -90, z: 9 },
    { id: 902, tags: { natural: 'tree' }, x: -20, z: -9 },
    { id: 903, tags: { natural: 'tree' }, x: 31, z: 9 },
    { id: 904, tags: { natural: 'tree' }, x: 91, z: -9 },
    { id: 905, tags: { natural: 'tree' }, x: -58, z: 38 },
    { id: 906, tags: { natural: 'tree' }, x: 66, z: -38 }
  ];

  return { source: 'fallback', center: CENTER, buildings, roads, points };
}
