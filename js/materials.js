import * as THREE from 'three';

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

export function seededRandom(seed = 1) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}

export function makeAsphaltTexture(seed = 18) {
  const rand = seededRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const grain = 48 + rand() * 28;
    image.data[i] = clamp255(grain * 0.88);
    image.data[i + 1] = clamp255(grain * 0.92);
    image.data[i + 2] = clamp255(grain * 0.96);
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(220,230,235,${0.015 + rand() * 0.025})`;
    ctx.beginPath();
    ctx.arc(rand() * 256, rand() * 256, 0.6 + rand() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function makeConcreteTexture(seed = 25, base = [150, 146, 135]) {
  const rand = seededRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (rand() - 0.5) * 24;
    image.data[i] = clamp255(base[0] + n);
    image.data[i + 1] = clamp255(base[1] + n);
    image.data[i + 2] = clamp255(base[2] + n);
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  ctx.strokeStyle = 'rgba(30,30,30,0.08)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
  for (let y = 0; y <= 256; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function makeFacadeTexture({ seed = 1, wall = '#d4b99c', trim = '#f5efe6', floors = 4, columns = 3 } = {}) {
  const rand = seededRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.13)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.03)');
  grad.addColorStop(0.82, 'rgba(255,255,255,0.03)');
  grad.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 1300; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '45,36,30'},${0.012 + rand() * 0.025})`;
    ctx.fillRect(rand() * canvas.width, rand() * canvas.height, 1 + rand() * 2, 1 + rand() * 2);
  }

  const marginX = 30;
  const floorHeight = 380 / floors;
  const colWidth = (canvas.width - marginX * 2) / columns;
  for (let floor = 0; floor < floors; floor++) {
    const y = 38 + floor * floorHeight;
    for (let col = 0; col < columns; col++) {
      const x = marginX + col * colWidth + colWidth * 0.16;
      const w = colWidth * 0.68;
      const h = floorHeight * 0.48;
      ctx.fillStyle = trim;
      ctx.fillRect(x - 7, y - 7, w + 14, h + 14);
      const windowGrad = ctx.createLinearGradient(x, y, x, y + h);
      windowGrad.addColorStop(0, rand() > 0.45 ? '#7795a2' : '#313c42');
      windowGrad.addColorStop(1, '#16232a');
      ctx.fillStyle = windowGrad;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,240,185,0.18)';
      ctx.fillRect(x + 5, y + 5, w * 0.18, h - 10);
      ctx.fillStyle = 'rgba(15,20,23,0.35)';
      ctx.fillRect(x + w * 0.48, y, 3, h);
      if (rand() > 0.6) {
        ctx.fillStyle = 'rgba(25,25,25,0.58)';
        ctx.fillRect(x - 8, y + h + 7, w + 16, 7);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function makeSignTexture(text, background = '#b7262e', foreground = '#fff4dc', seed = 3) {
  const rand = seededRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  for (let i = 0; i < 90; i++) ctx.fillRect(rand() * 512, rand() * 128, 1 + rand() * 4, 1 + rand() * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = foreground;
  ctx.font = '800 45px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 4;
  ctx.fillText(text, 256, 65, 460);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
