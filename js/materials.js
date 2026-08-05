import * as THREE from 'three';

export function seededRandom(seed = 1) {
  let value = Math.abs(Math.trunc(seed)) % 2147483647;
  if (value === 0) value = 1;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function canvasTexture(canvas, repeatX = 1, repeatY = 1, srgb = true) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function noiseCanvas(size, seed, base, variance, detail) {
  const rand = seededRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const image = ctx.createImageData(size, size);

  for (let index = 0; index < image.data.length; index += 4) {
    const broad = (rand() - 0.5) * variance;
    const grain = (rand() - 0.5) * detail;
    image.data[index] = clampByte(base[0] + broad + grain);
    image.data[index + 1] = clampByte(base[1] + broad + grain);
    image.data[index + 2] = clampByte(base[2] + broad + grain);
    image.data[index + 3] = 255;
  }

  ctx.putImageData(image, 0, 0);
  return { canvas, ctx, rand };
}

function makeHeightFromCanvas(source, contrast = 1.35) {
  const target = document.createElement('canvas');
  target.width = source.width;
  target.height = source.height;
  const targetCtx = target.getContext('2d');
  const sourceCtx = source.getContext('2d');
  const image = sourceCtx.getImageData(0, 0, source.width, source.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const grey = (image.data[index] + image.data[index + 1] + image.data[index + 2]) / 3;
    const adjusted = clampByte(128 + (grey - 128) * contrast);
    image.data[index] = image.data[index + 1] = image.data[index + 2] = adjusted;
  }
  targetCtx.putImageData(image, 0, 0);
  return target;
}

export function createAsphaltMaterial(seed = 41) {
  const { canvas, ctx, rand } = noiseCanvas(512, seed, [78, 80, 78], 28, 18);

  for (let index = 0; index < 30; index += 1) {
    const x = rand() * 512;
    const y = rand() * 512;
    const radiusX = 18 + rand() * 70;
    const radiusY = 8 + rand() * 34;
    ctx.fillStyle = `rgba(25, 27, 26, ${0.05 + rand() * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineCap = 'round';
  for (let index = 0; index < 18; index += 1) {
    let x = rand() * 512;
    let y = rand() * 512;
    ctx.strokeStyle = `rgba(22, 23, 22, ${0.18 + rand() * 0.18})`;
    ctx.lineWidth = 0.7 + rand() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let segment = 0; segment < 5; segment += 1) {
      x += (rand() - 0.5) * 42;
      y += (rand() - 0.5) * 42;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const map = canvasTexture(canvas, 7, 7);
  const bumpMap = canvasTexture(makeHeightFromCanvas(canvas, 1.8), 7, 7, false);
  return new THREE.MeshStandardMaterial({
    map,
    bumpMap,
    bumpScale: 0.055,
    color: 0xb7b7b1,
    roughness: 0.93,
    metalness: 0.02
  });
}

export function createSidewalkMaterial(seed = 53) {
  const { canvas, ctx, rand } = noiseCanvas(512, seed, [164, 158, 146], 22, 12);
  ctx.strokeStyle = 'rgba(45, 43, 39, 0.2)';
  ctx.lineWidth = 3;
  for (let x = 0; x <= 512; x += 96) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 96) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  for (let index = 0; index < 75; index += 1) {
    ctx.fillStyle = `rgba(48, 53, 46, ${0.02 + rand() * 0.055})`;
    ctx.beginPath();
    ctx.arc(rand() * 512, rand() * 512, 2 + rand() * 14, 0, Math.PI * 2);
    ctx.fill();
  }
  const map = canvasTexture(canvas, 5.5, 5.5);
  const bumpMap = canvasTexture(makeHeightFromCanvas(canvas, 1.45), 5.5, 5.5, false);
  return new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.035, roughness: 0.96, color: 0xc7c0b3 });
}

export function createPlasterMaterial(color, seed = 1) {
  const baseColor = new THREE.Color(color);
  const base = [baseColor.r * 255, baseColor.g * 255, baseColor.b * 255];
  const { canvas, ctx, rand } = noiseCanvas(384, seed, base, 20, 9);

  const dirt = ctx.createLinearGradient(0, 0, 0, 384);
  dirt.addColorStop(0, 'rgba(255,255,255,0.035)');
  dirt.addColorStop(0.68, 'rgba(55,48,40,0.02)');
  dirt.addColorStop(1, 'rgba(38,34,30,0.19)');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, 0, 384, 384);

  for (let index = 0; index < 22; index += 1) {
    ctx.strokeStyle = `rgba(58, 51, 45, ${0.025 + rand() * 0.055})`;
    ctx.lineWidth = 0.6 + rand() * 1.3;
    ctx.beginPath();
    const x = rand() * 384;
    const y = rand() * 384;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 52, y + rand() * 50);
    ctx.stroke();
  }

  const map = canvasTexture(canvas, 2.2, 2.2);
  const bumpMap = canvasTexture(makeHeightFromCanvas(canvas, 1.55), 2.2, 2.2, false);
  return new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.035, roughness: 0.92, color: 0xffffff });
}

export function createRoofMaterial(seed = 75) {
  const { canvas, ctx, rand } = noiseCanvas(256, seed, [103, 103, 97], 24, 12);
  for (let index = 0; index < 35; index += 1) {
    ctx.fillStyle = `rgba(40,45,38,${0.025 + rand() * 0.07})`;
    ctx.beginPath();
    ctx.arc(rand() * 256, rand() * 256, 2 + rand() * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.MeshStandardMaterial({ map: canvasTexture(canvas, 2, 2), roughness: 0.98, color: 0xb7b6ae });
}

export function createShutterMaterial(color = 0x6e7779) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#737b7c';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(25,28,29,0.48)';
  ctx.lineWidth = 3;
  for (let y = 4; y < 256; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  const texture = canvasTexture(canvas, 1, 2);
  return new THREE.MeshStandardMaterial({ map: texture, color, roughness: 0.62, metalness: 0.38 });
}

export function createGlassMaterial(tint = 0x607c85) {
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    roughness: 0.16,
    metalness: 0.05,
    transmission: 0.18,
    transparent: true,
    opacity: 0.76,
    envMapIntensity: 0.8,
    side: THREE.DoubleSide
  });
}

export function createSignTexture(text, background = '#334a52', foreground = '#f5eedc', seed = 4) {
  const rand = seededRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  for (let index = 0; index < 90; index += 1) {
    ctx.fillRect(rand() * canvas.width, rand() * canvas.height, 1 + rand() * 5, 1 + rand() * 2);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = foreground;
  ctx.font = '700 60px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.36)';
  ctx.shadowBlur = 5;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 3, canvas.width - 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function makeMaterialSet(seed = 1) {
  const colors = ['#c4b39f', '#d6c8b6', '#aeb6b1', '#c9a997', '#d9c79c', '#9fa9ae', '#c4b9aa', '#b98d75'];
  return colors.map((color, index) => createPlasterMaterial(color, seed + index * 17));
}
