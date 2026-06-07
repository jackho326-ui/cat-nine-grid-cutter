const fileInput = document.querySelector('#fileInput');
const dropZone = document.querySelector('#dropZone');
const cutButton = document.querySelector('#cutButton');
const downloadAllButton = document.querySelector('#downloadAllButton');
const previewCanvas = document.querySelector('#previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
const grid = document.querySelector('#grid');

let sourceImage = null;
let pieces = [];

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

function drawImageCover(ctx, image, size) {
  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, x, y, width, height);
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
      drawImageCover(previewCtx, sourceImage, previewCanvas.width);
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
  drawImageCover(squareCtx, sourceImage, outputSize);

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
