const fileInput = document.querySelector('#fileInput');
const dropZone = document.querySelector('#dropZone');
const cutButton = document.querySelector('#cutButton');
const downloadAllButton = document.querySelector('#downloadAllButton');
const filterToggle = document.querySelector('#filterToggle');
const filterBadge = document.querySelector('#filterBadge');
const previewCanvas = document.querySelector('#previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
const grid = document.querySelector('#grid');
const stylePickerContainer = document.querySelector('#stylePicker');
const styleButtons = stylePickerContainer?.querySelectorAll('.style-btn');

let currentStyle = 'normal';
let sourceImage = null;
let pieces = [];

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function applyCatSunshineFilter(ctx, size) {
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const saturation = max === 0 ? 0 : (max - min) / max;

    const isWhiteCatHighlight = luma > 188 && saturation < 0.28;
    const isOrangeFur = r > g * 1.05 && g > b * 1.08 && r > 118;
    const isCalicoDarkPatch = luma < 96 && saturation < 0.55;

    let nr = r;
    let ng = g;
    let nb = b;

    nr = nr * 1.08 + 14;
    ng = ng * 1.05 + 10;
    nb = nb * 0.95 + 3;

    if (saturation < 0.22) {
      nr += 12;
      ng += 8;
      nb += 2;
    }

    if (isWhiteCatHighlight) {
      const highlightGuard = Math.max(0, luma - 188) * 0.18;
      nr = nr - highlightGuard + 10;
      ng = ng - highlightGuard + 7;
      nb = nb - highlightGuard - 2;
    }

    if (isOrangeFur) {
      nr = nr * 1.06 + 10;
      ng = ng * 1.04 + 8;
      nb = nb * 0.88;
    }

    if (isCalicoDarkPatch) {
      nr = nr * 1.08 + 12;
      ng = ng * 1.06 + 9;
      nb = nb * 1.02 + 5;
    }

    const newLuma = nr * 0.2126 + ng * 0.7152 + nb * 0.0722;
    if (newLuma > 170) {
      nr = nr * 1.02 + 4;
      ng = ng * 1.02 + 3;
      nb = nb * 0.98;
    } else if (newLuma < 86) {
      nr += 9;
      ng += 7;
      nb += 5;
    }

    data[i] = clamp(nr);
    data[i + 1] = clamp(ng);
    data[i + 2] = clamp(nb);
  }

  ctx.putImageData(imageData, 0, 0);

  const gradient = ctx.createRadialGradient(size * 0.18, size * 0.12, 0, size * 0.18, size * 0.12, size * 0.78);
  gradient.addColorStop(0, 'rgba(255, 226, 150, 0.22)');
  gradient.addColorStop(0.44, 'rgba(255, 199, 118, 0.09)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
}

function drawPlaceholder() {
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.fillStyle = '#fff7ed';
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.font = '86px system-ui';
  previewCtx.textAlign = 'center';
  previewCtx.textBaseline = 'middle';
  previewCtx.fillText('🐱', previewCanvas.width / 2, previewCanvas.height / 2 - 24);
  previewCtx.fillStyle = '#8a6b5d';
  previewCtx.font = '24px Microsoft YaHei, sans-serif';
  previewCtx.fillText('等待上传猫咪照片', previewCanvas.width / 2, previewCanvas.height / 2 + 62);
}

function drawImageCover(ctx, image, size, withFilter = false) {
  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, x, y, width, height);

  if (withFilter) {
    applyCatSunshineFilter(ctx, size);
  }
}

function isFilterEnabled() {
  return Boolean(filterToggle?.checked);
}

function updateFilterBadge() {
  filterBadge?.classList.toggle('active', isFilterEnabled() && Boolean(sourceImage));
}

function redrawPreview() {
  if (!sourceImage) {
    drawPlaceholder();
    updateFilterBadge();
    return;
  }
  drawImageCover(previewCtx, sourceImage, previewCanvas.width, isFilterEnabled());
  updateFilterBadge();
}

function resetGridAfterFilterChange() {
  pieces = [];
  downloadAllButton.disabled = true;
  if (sourceImage) {
    grid.className = 'grid empty';
    grid.innerHTML = '<p>滤镜已更新，点击"切成九宫格"生成新的暖阳切图。</p>';
  }
}

function loadImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('请选择一张图片文件喵～');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      sourceImage = image;
      redrawPreview();
      cutButton.disabled = false;
      downloadAllButton.disabled = true;
      pieces = [];
      grid.className = 'grid empty';
      grid.innerHTML = '<p>点击"切成九宫格"生成 9 张图片。</p>';
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// ========== Style-specific drawing functions ==========

function drawCatEars(ctx, size) {
  const earHeight = size * 0.12;
  const earColor = '#f97316';
  const innerEarColor = '#fca5a5';

  ctx.save();

  // Left ear
  ctx.fillStyle = earColor;
  ctx.beginPath();
  ctx.moveTo(size * 0.08, 0);
  ctx.lineTo(size * 0.15, -earHeight);
  ctx.lineTo(size * 0.28, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = innerEarColor;
  ctx.beginPath();
  ctx.moveTo(size * 0.11, 0);
  ctx.lineTo(size * 0.16, -earHeight * 0.65);
  ctx.lineTo(size * 0.24, 0);
  ctx.closePath();
  ctx.fill();

  // Right ear
  ctx.fillStyle = earColor;
  ctx.beginPath();
  ctx.moveTo(size * 0.72, 0);
  ctx.lineTo(size * 0.85, -earHeight);
  ctx.lineTo(size * 0.92, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = innerEarColor;
  ctx.beginPath();
  ctx.moveTo(size * 0.76, 0);
  ctx.lineTo(size * 0.84, -earHeight * 0.65);
  ctx.lineTo(size * 0.89, 0);
  ctx.closePath();
  ctx.fill();

  // Whisker dots
  ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
  const whiskerY = size * 0.32;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(size * 0.04 + i * 3, whiskerY + i * 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.96 - i * 3, whiskerY + i * 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPolaroidBottom(ctx, size) {
  const padding = size * 0.06;
  const bottomHeight = size * 0.18;

  ctx.save();
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(padding, size - bottomHeight, size - padding * 2, bottomHeight);

  ctx.fillStyle = '#d4d4d4';
  ctx.font = `${size * 0.038}px monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  ctx.fillText(date, size - padding * 1.5, size - padding * 0.5);
  ctx.restore();
}

const watermarkTexts = [
  '07:00 AM',
  'Cream & Orange',
  'Unemployed but Happy',
  'Powered by Catnip',
  'Nap Enthusiast',
  'Professional Cuddler',
  'Purrfectionist',
  'Whisker Wizard',
  'Chaos Coordinator',
  'Soft Boy / Soft Cat',
  'Main Character Energy',
  'Feline Good Vibes',
  'Zero Productivity, Maximum Cuties',
  'Existentially Feline',
  'Paw-sitively Magical',
  'Cat Dad Energy',
  'Serving Looks & Zoomies',
  'Born to Nap',
  'Professional Lap Warmer',
  'CEO of Cat Videos'
];

function drawWatermark(ctx, size, index) {
  if (index !== 5) return;

  ctx.save();

  const text = watermarkTexts[Math.floor(Math.random() * watermarkTexts.length)];

  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 8);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.font = `bold ${size * 0.065}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.fillText(text, 0, 0);

  // Tiny sparkle accent
  ctx.rotate(Math.PI / 8);
  ctx.translate(0, size * 0.38);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `${size * 0.028}px monospace`;
  ctx.fillText('✦  cat-grid ✦', 0, 0);

  ctx.restore();
}

function cutIntoNine() {
  if (!sourceImage) return;

  const outputSize = 900;
  const tileSize = outputSize / 3;

  const squareCanvas = document.createElement('canvas');
  squareCanvas.width = outputSize;
  squareCanvas.height = outputSize;
  const squareCtx = squareCanvas.getContext('2d');
  drawImageCover(squareCtx, sourceImage, outputSize, isFilterEnabled());

  pieces = [];
  grid.className = 'grid';
  grid.innerHTML = '';

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const index = row * 3 + col + 1;

      const tileCanvas = document.createElement('canvas');
      let drawOffsetY = 0;

      if (currentStyle === 'ears') {
        const earExtra = Math.floor(tileSize * 0.12);
        tileCanvas.width = tileSize;
        tileCanvas.height = tileSize + earExtra;
        drawOffsetY = earExtra;
      } else if (currentStyle === 'polaroid') {
        const bottomExtra = Math.floor(tileSize * 0.18);
        tileCanvas.width = tileSize;
        tileCanvas.height = tileSize + bottomExtra;
        drawOffsetY = Math.floor(tileSize * 0.04);
      } else {
        tileCanvas.width = tileSize;
        tileCanvas.height = tileSize;
      }

      const tileCtx = tileCanvas.getContext('2d');

      // Fill background for styled tiles
      if (currentStyle === 'ears') {
        tileCtx.fillStyle = '#f97316';
        tileCtx.fillRect(0, 0, tileSize, drawOffsetY);
      } else if (currentStyle === 'polaroid') {
        tileCtx.fillStyle = '#ffffff';
        tileCtx.fillRect(0, 0, tileSize, tileCanvas.height);
      }

      tileCtx.drawImage(
        squareCanvas,
        col * tileSize,
        row * tileSize,
        tileSize,
        tileSize,
        0,
        drawOffsetY,
        tileSize,
        tileSize
      );

      // Apply style decorations
      if (currentStyle === 'ears') {
        drawCatEars(tileCtx, tileSize);
      } else if (currentStyle === 'polaroid') {
        drawPolaroidBottom(tileCtx, tileSize);
      } else if (currentStyle === 'watermark') {
        drawWatermark(tileCtx, tileSize, index);
      }

      const dataUrl = tileCanvas.toDataURL('image/png');
      pieces.push({ index, dataUrl });

      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.innerHTML = `
        <img src="${dataUrl}" alt="九宫格第 ${index} 张" />
        <a download="cat-grid-${currentStyle}-${index}.png" href="${dataUrl}">下载 ${index}</a>
      `;
      grid.appendChild(tile);
    }
  }

  downloadAllButton.disabled = false;
}

function downloadAll() {
  pieces.forEach((piece, i) => {
    setTimeout(() => {
      const link = document.createElement('a');
      link.download = `cat-grid-${currentStyle}-${piece.index}.png`;
      link.href = piece.dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }, i * 120);
  });
}

// Style button switching
styleButtons?.forEach(btn => {
  btn.addEventListener('click', () => {
    styleButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentStyle = btn.dataset.style;
    // Reset grid when style changes
    if (sourceImage) {
      pieces = [];
      downloadAllButton.disabled = true;
      grid.className = 'grid empty';
      grid.innerHTML = `<p>已切换到"${btn.textContent}"样式，点击"切成九宫格"重新生成。</p>`;
    }
  });
});

fileInput.addEventListener('change', event => loadImage(event.target.files[0]));
cutButton.addEventListener('click', cutIntoNine);
downloadAllButton.addEventListener('click', downloadAll);
filterToggle?.addEventListener('change', () => {
  redrawPreview();
  resetGridAfterFilterChange();
});

['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', event => {
  loadImage(event.dataTransfer.files[0]);
});

drawPlaceholder();
updateFilterBadge();
