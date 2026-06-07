const fileInput = document.querySelector('#fileInput');
const dropZone = document.querySelector('#dropZone');
const cutButton = document.querySelector('#cutButton');
const downloadAllButton = document.querySelector('#downloadAllButton');
const filterToggle = document.querySelector('#filterToggle');
const filterBadge = document.querySelector('#filterBadge');
const previewCanvas = document.querySelector('#previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
const grid = document.querySelector('#grid');

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

    // 日系阳光底色：提亮、轻微降蓝、增加暖黄。
    nr = nr * 1.08 + 14;
    ng = ng * 1.05 + 10;
    nb = nb * 0.95 + 3;

    // 低饱和区域给一点奶油暖色，适合白猫和浅色背景。
    if (saturation < 0.22) {
      nr += 12;
      ng += 8;
      nb += 2;
    }

    // 白猫：保留高光，不让毛发直接爆白，同时加一点奶油暖调。
    if (isWhiteCatHighlight) {
      const highlightGuard = Math.max(0, luma - 188) * 0.18;
      nr = nr - highlightGuard + 10;
      ng = ng - highlightGuard + 7;
      nb = nb - highlightGuard - 2;
    }

    // 橘猫：加强金橘和阳光感，但控制红色不过分溢出。
    if (isOrangeFur) {
      nr = nr * 1.06 + 10;
      ng = ng * 1.04 + 8;
      nb = nb * 0.88;
    }

    // 三花深色斑块：略提阴影，避免黑/棕色块过沉。
    if (isCalicoDarkPatch) {
      nr = nr * 1.08 + 12;
      ng = ng * 1.06 + 9;
      nb = nb * 1.02 + 5;
    }

    // 柔和胶片曲线：亮部更通透，暗部轻微抬升。
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

  // 叠加一点柔和金色光晕，制造 INS 日系暖阳感。
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
    grid.innerHTML = '<p>滤镜已更新，点击“切成九宫格”生成新的暖阳切图。</p>';
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
      grid.innerHTML = '<p>点击“切成九宫格”生成 9 张图片。</p>';
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
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
      tileCanvas.width = tileSize;
      tileCanvas.height = tileSize;
      const tileCtx = tileCanvas.getContext('2d');

      tileCtx.drawImage(
        squareCanvas,
        col * tileSize,
        row * tileSize,
        tileSize,
        tileSize,
        0,
        0,
        tileSize,
        tileSize
      );

      const dataUrl = tileCanvas.toDataURL('image/png');
      pieces.push({ index, dataUrl });

      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.innerHTML = `
        <img src="${dataUrl}" alt="九宫格第 ${index} 张" />
        <a download="cat-grid-${index}.png" href="${dataUrl}">下载 ${index}</a>
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
      link.download = `cat-grid-${piece.index}.png`;
      link.href = piece.dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }, i * 120);
  });
}

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
