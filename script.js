const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

const colorPicker = document.getElementById('colorPicker');
const coordsText = document.getElementById('coords');
const zoomText = document.getElementById('zoomLevel');

// Harita Boyutları (Pixelplanet tarzı geniş dünya haritası oranında)
const GRID_WIDTH = 1000;
const GRID_HEIGHT = 500;
const pixelData = new Map();

let scale = 2;
let offsetX = (window.innerWidth - GRID_WIDTH * scale) / 2;
let offsetY = (window.innerHeight - GRID_HEIGHT * scale) / 2;

let isDragging = false;
let startX = 0;
let startY = 0;
let hasMoved = false;

// Dünya Haritası Arka Planı için Görsel Nesnesi
let worldMapImg = new Image();
// İnternetten ücretsiz pikselli/sade bir dünya haritası taslağı çekiyoruz
worldMapImg.src = 'https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg';
worldMapImg.onload = () => {
  draw();
};

function resizeWindow() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}
window.addEventListener('resize', resizeWindow);

// Veritabanından pikselleri yükle
async function loadPixels() {
  try {
    const res = await fetch('/api/pixels');
    const data = await res.json();
    Object.keys(data).forEach(key => {
      pixelData.set(key, data[key]);
    });
    draw();
  } catch (e) {
    console.error("Pikseller yüklenemedi:", e);
  }
}

// Çizim Fonksiyonu
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Okyanus Rengi (Arka plan)
  ctx.fillStyle = "#1a2634";
  ctx.fillRect(0, 0, GRID_WIDTH, GRID_HEIGHT);

  // Dünya Haritasını Arka Plan Olarak Çiz
  if (worldMapImg.complete) {
    ctx.globalAlpha = 0.35; // Harita soluk dursun ki üzerine çizilen pikseller net görünsün
    ctx.drawImage(worldMapImg, 0, 0, GRID_WIDTH, GRID_HEIGHT);
    ctx.globalAlpha = 1.0;
  }

  // Oyuncuların Attığı Pikselleri Çiz
  pixelData.forEach((color, key) => {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  });

  // Izgara Çizgileri (Yakınlaşınca)
  if (scale > 10) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 0.05;
    for (let x = 0; x <= GRID_WIDTH; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GRID_HEIGHT);
      ctx.stroke();
    }
  }

  // Dünya Çerçevesi
  ctx.strokeStyle = "#3498db";
  ctx.lineWidth = 1 / scale;
  ctx.strokeRect(0, 0, GRID_WIDTH, GRID_HEIGHT);

  ctx.restore();
  zoomText.innerText = `${Math.round(scale * 25)}%`;
}

// Mouse Olayları (Pan & Click)
container.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    isDragging = true;
    hasMoved = false;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
  }
});

window.addEventListener('mousemove', (e) => {
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  const gridX = Math.floor((mouseX - offsetX) / scale);
  const gridY = Math.floor((mouseY - offsetY) / scale);

  if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
    coordsText.innerText = `X: ${gridX}, Y: ${gridY}`;
  }

  if (!isDragging) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  if (Math.abs(dx - offsetX) > 3 || Math.abs(dy - offsetY) > 3) {
    hasMoved = true;
  }

  offsetX = dx;
  offsetY = dy;
  draw();
});

window.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;

  if (!hasMoved) {
    const gridX = Math.floor((e.clientX - offsetX) / scale);
    const gridY = Math.floor((e.clientY - offsetY) / scale);

    if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
      setPixel(gridX, gridY, colorPicker.value);
    }
  }
});

// Zoom (Mouse Wheel)
container.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = 1.15;
  let newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
  newScale = Math.max(0.5, Math.min(60, newScale));

  const mouseX = e.clientX;
  const mouseY = e.clientY;

  offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
  offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);
  scale = newScale;

  draw();
}, { passive: false });

// Piksel Koyma ve Kaydetme
async function setPixel(x, y, color) {
  pixelData.set(`${x},${y}`, color);
  draw();

  try {
    await fetch('/api/pixels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y, color })
    });
  } catch (e) {
    console.error("Piksel kaydedilemedi:", e);
  }
}

// Başlangıç
resizeWindow();
loadPixels();
setInterval(loadPixels, 3000);
