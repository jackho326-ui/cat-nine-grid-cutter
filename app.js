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

// ========== Tab Navigation ==========
const navTabs = document.getElementById('navTabs');
const tabBtns = navTabs?.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns?.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    // Update buttons
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Update panels
    tabPanels.forEach(panel => {
      panel.classList.remove('active');
      if (panel.id === `tab-${tabId}`) {
        panel.classList.add('active');
      }
    });
  });
});

// ========== 甄嬛传剧本生成器 ==========
const catCountRadios = document.querySelectorAll('input[name="catCount"]');
const catInputsContainer = document.getElementById('catInputs');
const catTraitsContainer = document.getElementById('catTraits');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const outputContent = document.getElementById('outputContent');
const outputEmpty = document.querySelector('.output-empty');

// Cat character templates for different numbers
const catCharacterData = {
  2: {
    roles: [
      { title: '贵妃', suffix: '娘娘' },
      { title: '答应', suffix: '妹妹' }
    ],
    palaceNames: ['储秀宫', '延禧宫'],
    conflicts: [
      '争宠夺食', '抢地盘', '争宠'
    ]
  },
  3: {
    roles: [
      { title: '皇后', suffix: '娘娘' },
      { title: '贵妃', suffix: '娘娘' },
      { title: '常在', suffix: '妹妹' }
    ],
    palaceNames: ['坤宁宫', '储秀宫', '延禧宫'],
    conflicts: ['争宠夺食', '三方角力', '结盟互撕']
  },
  4: {
    roles: [
      { title: '皇后', suffix: '娘娘' },
      { title: '贵妃', suffix: '娘娘' },
      { title: '嫔妃', suffix: '娘娘' },
      { title: '答应', suffix: '妹妹' }
    ],
    palaceNames: ['坤宁宫', '储秀宫', '承乾宫', '延禧宫'],
    conflicts: ['后宫争锋', '两派对立', '争宠夺食']
  },
  5: {
    roles: [
      { title: '皇后', suffix: '娘娘' },
      { title: '贵妃', suffix: '娘娘' },
      { title: '贵妃', suffix: '娘娘' },
      { title: '嫔妃', suffix: '娘娘' },
      { title: '答应', suffix: '妹妹' }
    ],
    palaceNames: ['坤宁宫', '储秀宫', '承乾宫', '钟粹宫', '延禧宫'],
    conflicts: ['后宫大乱', '五方混战', '争宠夺食']
  },
  6: {
    roles: [
      { title: '皇后', suffix: '娘娘' },
      { title: '贵妃', suffix: '娘娘' },
      { title: '贵妃', suffix: '娘娘' },
      { title: '嫔妃', suffix: '娘娘' },
      { title: '嫔妃', suffix: '娘娘' },
      { title: '答应', suffix: '妹妹' }
    ],
    palaceNames: ['坤宁宫', '储秀宫', '承乾宫', '钟粹宫', '延禧宫', '景仁宫'],
    conflicts: ['六宫大乱', '后宫大乱斗', '争宠夺食']
  }
};

const dogCharacterData = {
  titles: ['御前侍卫大将军', '大黄侍卫', '皇家猎犬', '御前带刀侍卫'],
  insults: ['你这没毛的', '粗鄙之物', '也敢在我面前放肆', '一条狗也配']
};

const palaceLifeDetails = [
  '每日清晨第一件事就是去猫爬架最高处巡视自己的领地',
  '饭点一到，准时在主人脚边用尾巴画符，不伺候就绝食',
  '午睡时喜欢把最暖和的纸箱据为己有',
  '深夜跑酷是宫廷夜巡的暗号',
  '对自动喂食器有执念，坚信那是新来的太监',
  '看到吸尘器就炸毛，认为是敌国入侵',
  '喜欢在键盘上踩奶，美其名曰批阅奏折',
  '对逗猫棒有复杂的感情，又爱又恨',
  '喜欢闻新拆封的快递，说是探查敌情',
  '在猫砂盆里埋东西的姿势特别庄严，像是在封印什么',
  '看到窗外的鸟就喵个不停，说是边疆不稳',
  '喜欢跳上柜子最高层俯视众生',
  '对透明水杯有执念，喜欢把杯子推下去验证重力',
  '闻到猫条的香味能在一秒之内瞬移到位',
  '喜欢在主人的枕头边上蹭来蹭去，说是留下自己的印记',
  '看到新来的猫咪就炸毛，说是宫中有新人入住了',
  '喜欢钻进纸箱里，说是微服私访',
  '每天舔毛要舔半小时，说是梳妆打扮',
  '看到猫薄荷就像中了邪，说是御赐灵药',
  '喜欢在窗台上晒太阳打盹，说是批阅奏折累了歇息片刻'
];

const dramaLines = {
  drama: {
    openings: [
      '本宫', '哀家', '臣妾', '本宫', '奴才我', '本宫'
    ],
    middle: [
      '终究是错付了', '这后宫之中，从不缺的便是争宠',
      '你以为你稳坐钓鱼台？天真！', '这宫里的猫，各有各的心思',
      '猫生如戏，全靠演技', '这一室之内，暗流涌动',
      '你以为你赢定了？好戏才刚开始呢', '后宫的风波，从来不会因为一只猫而停止',
      '她以为这样就能压我一头？做梦', '这猫爬架之上，自有规矩'
    ],
    endings: [
      '这后宫的猫生，终究是一场修行',
      '笑到最后的那只猫，才是真的赢家',
      '一猫一世界，一宫一江湖',
      '这深宫中的猫，各有各的道',
      '猫生苦短，争宠何必？不如一起睡个午觉',
      '后宫争斗，不过是一场关于罐头和阳光的战争'
    ]
  },
  comedy: {
    openings: [
      '本喵今日心情好', '朕今日龙颜大悦', '本宫饿了',
      '今天又是喵生圆满的一天', '喵~', '今日天气不错，适合睡午觉',
      '今天又是被主子宠幸的一天', '本喵又要开饭了'
    ],
    middle: [
      '但是饭碗里少了一块猫粮，天塌了',
      '结果被另一个兄弟按在地上摩擦',
      '她以为自己是老大？呵，可笑',
      '直到主人开了一个罐头',
      '然后就开始在客厅表演跑酷',
      '结果一不小心从猫爬架上摔了下来，还死不承认',
      '毕竟，谁让它们都是干饭喵呢',
      '这后宫之中，最硬的规矩就是——开饭了',
      '但是被抢了零食的那一刻，她的心碎了',
      '她决定用三天三夜来证明谁才是真命天子'
    ],
    endings: [
      '后宫的猫，终究是干饭喵',
      '争什么宠呢？不如一起去晒太阳',
      '这宫里的猫，最大的野心不过是——罐头自由',
      '后宫争斗结束了，因为它们都饿了',
      '原来，最好的感情，不过是各自舔各自的毛',
      '一猫一世界，一顿猫饭一个江湖'
    ]
  },
  romance: {
    openings: [
      '她第一眼看到他，就知道这只猫与众不同',
      '那个午后，阳光洒在猫爬架上，她看到了他',
      '她以为自己是这宫里最孤独的猫',
      '直到他推开了那扇门'
    ],
    middle: [
      '从此，她的心就像被猫薄荷迷了魂',
      '她开始每天等他在饭点出现',
      '他们一起晒太阳、一起睡觉、一起分享一个纸箱',
      '她偷偷舔他头上的毛，他假装不知道',
      '他会在她生气的时候蹭蹭她的下巴',
      '她以为他只是个干饭的，没想到他是个暖男',
      '他们之间的故事，从一碗猫饭开始',
      '在这个后宫里，只有他不会让她伤心'
    ],
    endings: [
      '后宫三千猫，唯他最宠她',
      '原来最甜的日常，不过是你在身边晒太阳',
      '从此，一猫一世界，一人一猫一宫',
      '爱情不需要争宠，只需要一碗猫饭的默契',
      '原来最好的感情，就是各舔各的毛但靠在一起睡',
      '后宫的故事再精彩，也比不过她靠在他身上的那个午后'
    ]
  }
};

// Generate dynamic input fields
function updateCatInputs(count) {
  const num = parseInt(count);
  let inputsHTML = '';
  let traitsHTML = '';
  for (let i = 0; i < num; i++) {
    inputsHTML += `<input type="text" class="cat-name-input" placeholder="猫${i+1} 的名字（如：橘子）" />`;
    traitsHTML += `<textarea class="cat-trait-input" placeholder="猫${i+1} 的性格特点（如：贪吃、粘人）" rows="1"></textarea>`;
  }
  catInputsContainer.innerHTML = inputsHTML;
  catTraitsContainer.innerHTML = traitsHTML;
}

// Listen for radio changes
catCountRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    updateCatInputs(radio.value);
  });
});

// Generate script
generateBtn.addEventListener('click', () => {
  const catNames = catInputsContainer.querySelectorAll('.cat-name-input');
  const catTraits = catTraitsContainer.querySelectorAll('.cat-trait-input');
  const storyStyle = document.querySelector('input[name="storyStyle"]:checked').value;
  const hasDog = document.getElementById('hasDog')?.checked || false;
  const data = catCharacterData[catNames.length] || catCharacterData[2];

  // Gather names
  const names = [];
  catNames.forEach(input => {
    const val = input.value.trim();
    if (val) names.push(val);
  });

  // Gather traits
  const traits = [];
  catTraits.forEach(input => {
    const val = input.value.trim();
    if (val) traits.push(val);
  });

  // Default names if empty
  while (names.length < catNames.length) {
    names.push(`猫${names.length + 1}`);
  }
  while (traits.length < catTraits.length) {
    traits.push('性格独特，自有千秋');
  }

  const script = generateZhenguanScript(names, traits, data, storyStyle, hasDog);

  // Display
  outputEmpty.style.display = 'none';
  outputContent.style.display = 'block';
  outputContent.innerHTML = `<pre style="margin:0;white-space:pre-wrap;line-height:1.8;font-size:0.95rem;color:var(--text);font-family:inherit;">${script}</pre>`;

  copyBtn.disabled = false;
  regenerateBtn.disabled = false;
});

// Copy script
copyBtn.addEventListener('click', () => {
  const text = outputContent.textContent || outputContent.innerText;
  navigator.clipboard.writeText(text).then(() => {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ 已复制！';
    setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
  });
});

// Regenerate
regenerateBtn.addEventListener('click', () => {
  generateBtn.click();
});

function generateZhenguanScript(names, traits, data, style, hasDog) {
  const n = names.length;
  const roleNames = data.roles;

  // Random helper
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const pickMany = (arr, count) => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  let script = '';

  // Title
  script += `📜 多猫家庭甄嬛传\n\n`;
  script += `🏰 场景：${pickMany(data.palaceNames, n).join(' ↔ ')}\n`;
  script += `👥 出场角色：`;
  for (let i = 0; i < n; i++) {
    const role = roleNames[i] || { title: '妃嫔', suffix: '妹妹' };
    script += `${names[i]}（${role.title}${role.suffix}）\n`;
  }
  if (hasDog) {
    const dogTitle = pick(dogCharacterData.titles);
    script += `🐕 ${dogTitle}（压轴反派）\n`;
  }
  script += `\n`;

  // Opening
  script += `【第一幕 · 开场】\n\n`;
  script += `${pick(dramaLines[style].openings)}\n`;

  // Introduce the setting
  if (n >= 3) {
    script += `这宫里的猫，平日里看着岁月静好，可每当饭点一到，便暗流涌动。`;
  } else {
    script += `这宫里的日子，看着平静，实则处处机锋。`;
  }
  script += `\n\n`;

  // Scene descriptions
  script += `【第二幕 · 后宫日常】\n\n`;
  const detailScene = pickMany(palaceLifeDetails, n * 2);
  for (let i = 0; i < n; i++) {
    script += `${names[i]}（${traits[i]}）\n`;
    script += `  · ${detailScene[i * 2]}\n`;
    script += `  · ${detailScene[i * 2 + 1]}\n\n`;
  }

  // Conflict scene
  script += `【第三幕 · ${pick(data.conflicts)}】\n\n`;
  if (n >= 3) {
    script += `这日，${pick(names)}在猫爬架上${pick(palaceLifeDetails)}。`;
    script += `不料${pick(names.filter((_, i) => i !== names.indexOf(pick(names.filter((_, i) => i !== names.indexOf(pick(names)))))))}恰好经过，${pick(dramaLines[style].middle)}。\n\n`;
    script += `${names[pick([0, n-1])]}冷冷一笑：「${pick(dramaLines[style].middle)}。」\n\n`;
  } else if (n === 2) {
    script += `${names[0]}正${pick(palaceLifeDetails)}。`;
    script += `${names[1]}端着猫碗走来，${pick(dramaLines[style].middle)}。\n\n`;
    script += `${names[0]}眯起眼睛：「${pick(dramaLines[style].middle)}。」`;
  }

  // Dog scene
  if (hasDog) {
    script += `\n【第四幕 · 狗入后宫】\n\n`;
    script += `正当众猫争执不下时，${pick(dogCharacterData.titles)}大摇大摆地走进了猫的世界。\n\n`;
    script += `${names[0]}怒道：「${pick(dogCharacterData.insults)}！」\n\n`;
    script += `然而，${pick(names)}默默走过去，蹭了蹭${pick(dogCharacterData.titles)}的腿。\n\n`;
    script += `众猫：「……」\n\n`;
    script += `${names[0]}叹了口气：「终究是错付了。」\n\n`;
  }

  // Ending
  script += `【终幕 · 结语】\n\n`;
  script += pick(dramaLines[style].endings);
  script += `\n\n`;

  // Moral
  if (style === 'comedy') {
    script += `💡 本剧寓意：后宫争斗千万条，干饭和谐第一条。`;
  } else if (style === 'drama') {
    script += `💡 本剧寓意：后宫风云变幻，唯有猫粮永存。`;
  } else {
    script += `💡 本剧寓意：后宫虽大，不过一猫一狗一世界。`;
  }
  script += `\n`;

  return script;
}

// ========== 漫画连环画生成器 ==========
const comicTabBtn = document.querySelector('[data-tab="comic"]');
const avatarGrid = document.getElementById('avatarGrid');
const avatarUploads = document.querySelectorAll('.avatar-upload');
const comicCatInputs = document.getElementById('comicCatInputs');
const comicCatTraits = document.getElementById('comicCatTraits');
const comicGenerateBtn = document.getElementById('comicGenerateBtn');
const comicDownloadBtn = document.getElementById('comicDownloadBtn');
const comicResults = document.getElementById('comicResults');

// Track uploaded avatars: { 0: dataURL, 1: dataURL, ... }
const avatarImages = {};

// Comic scene templates - 5 scenes
const comicScenes = [
  {
    title: '第一幕 · 后宫开场',
    desc: '猫咪们登场，展示后宫日常氛围'
  },
  {
    title: '第二幕 · 猫咪日常',
    desc: '每只猫咪在各自的岗位上忙碌'
  },
  {
    title: '第三幕 · 冲突爆发',
    desc: '矛盾出现，猫咪们开始争斗'
  },
  {
    title: '第四幕 · 高潮对决',
    desc: '戏剧性高潮，狗狗可能参战'
  },
  {
    title: '第五幕 · 温馨结局',
    desc: '一切归于平静，猫咪们和好'
  }
];

// Handle avatar uploads
avatarUploads.forEach(upload => {
  const index = parseInt(upload.dataset.index);
  const input = upload.querySelector('.avatar-input');
  const previewEl = document.getElementById(`avatarPreview${index}`);

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataURL = ev.target.result;
      avatarImages[index] = dataURL;

      // Show preview
      if (previewEl) {
        previewEl.style.display = 'block';
        previewEl.innerHTML = `<img src="${dataURL}" alt="猫${index+1}头像" />`;
      }
      // Hide upload
      upload.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
});

// Generate comic
comicGenerateBtn.addEventListener('click', async () => {
  const names = [];
  const traits = [];
  const nameInputs = comicCatInputs.querySelectorAll('.cat-name-input');
  const traitInputs = comicCatTraits.querySelectorAll('.cat-trait-input');

  nameInputs.forEach(input => {
    const val = input.value.trim();
    if (val) names.push(val);
  });
  traitInputs.forEach(input => {
    const val = input.value.trim();
    if (val) traits.push(val);
  });

  if (names.length === 0) {
    alert('请至少输入一只猫咪的名字！');
    return;
  }
  if (Object.keys(avatarImages).length === 0) {
    alert('请至少上传一张猫咪头像！');
    return;
  }

  // Default traits
  while (traits.length < names.length) {
    traits.push('性格独特，自有千秋');
  }

  const style = document.querySelector('input[name="comicStoryStyle"]:checked')?.value || 'drama';
  const hasDog = document.getElementById('comicHasDog')?.checked || false;

  // Disable button during generation
  comicGenerateBtn.disabled = true;
  comicGenerateBtn.textContent = '⏳ 生成中...';
  comicDownloadBtn.disabled = true;

  // Show results area
  comicResults.style.display = 'block';
  comicResults.innerHTML = '';
  const outputEmpty = document.querySelector('#tab-comic .output-empty');
  if (outputEmpty) outputEmpty.style.display = 'none';

  const n = names.length;
  const data = catCharacterData[n] || catCharacterData[2];

  // Generate scene descriptions using the script logic
  const sceneDescriptions = generateComicSceneDescriptions(names, traits, data, style, hasDog);

  // Create scene cards
  for (let i = 0; i < 5; i++) {
    const scene = comicScenes[i];
    const card = document.createElement('div');
    card.className = 'comic-scene-card';
    card.id = `comicScene${i}`;

    card.innerHTML = `
      <div class="scene-thumb">
        <div class="scene-loading" id="sceneLoading${i}">
          <div class="spinner"></div>
          <div>正在绘制...</div>
        </div>
      </div>
      <div class="scene-info">
        <div class="scene-number">Scene ${i + 1}</div>
        <div class="scene-title">${scene.title}</div>
        <div class="scene-status" id="sceneStatus${i}">等待生成中...</div>
        <div class="scene-prompt" id="scenePrompt${i}"></div>
      </div>
    `;

    comicResults.appendChild(card);
  }

  // Generate images one by one with delay for better UX
  const generatedImages = [];

  for (let i = 0; i < 5; i++) {
    try {
      const loadingEl = document.getElementById(`sceneLoading${i}`);
      const statusEl = document.getElementById(`sceneStatus${i}`);
      const promptEl = document.getElementById(`scenePrompt${i}`);
      const thumbEl = card.querySelector('.scene-thumb') || document.querySelector(`#comicScene${i} .scene-thumb`);

      const prompt = sceneDescriptions[i].prompt;
      if (promptEl) promptEl.textContent = `Prompt: ${prompt}`;
      if (statusEl) statusEl.textContent = '🎨 正在绘制中...';

      const imageUrl = await generateComicSceneImage(prompt, names, traits, hasDog, style, i);
      generatedImages.push(imageUrl);

      // Update card with result
      const sceneCard = document.getElementById(`comicScene${i}`);
      const thumb = sceneCard?.querySelector('.scene-thumb');
      if (thumb) {
        thumb.innerHTML = `<img src="${imageUrl}" alt="场景${i+1}" />`;
      }
      if (statusEl) {
        statusEl.textContent = `✅ 绘制完成 (${sceneDescriptions[i].sceneDesc})`;
      }

      // Wait a bit between requests for better reliability
      if (i < 4) {
        await new Promise(r => setTimeout(r, 2000));
      }

    } catch (err) {
      console.error(`Scene ${i} failed:`, err);
      const sceneCard = document.getElementById(`comicScene${i}`);
      const thumb = sceneCard?.querySelector('.scene-thumb');
      if (thumb) {
        thumb.innerHTML = `<div class="scene-loading" style="color: #ef4444;">❌ 生成失败<br><small>${err.message}</small></div>`;
      }
      const statusEl = document.getElementById(`sceneStatus${i}`);
      if (statusEl) statusEl.textContent = '❌ 生成失败';
    }
  }

  // Re-enable button
  comicGenerateBtn.disabled = false;
  comicGenerateBtn.textContent = '🎨 生成漫画连环画';

  if (generatedImages.length > 0) {
    comicDownloadBtn.disabled = false;
  }
});

// Generate comic scene image via Hermes gateway API
// The gateway runs locally on port 18789 and proxies to the image generation provider
async function generateComicSceneImage(sceneDesc, names, traits, hasDog, style, sceneIndex) {
  // Build the image prompt
  const catDesc = names.map((name, i) => {
    const avatarIndex = Object.keys(avatarImages).find(k => parseInt(k) <= i && avatarImages[parseInt(k)]);
    const avatarNote = avatarIndex ? ` [cat ${name} avatar reference]` : '';
    return name + avatarNote;
  }).join('、');

  const styleKeyword = {
    drama: 'dramatic manga',
    comedy: 'funny manga',
    romance: 'sweet manga'
  }[style] || 'manga';

  const dogNote = hasDog ? ', and a cute dog character in the scene' : '';

  const prompt = `A manga/comic illustration in ${styleKeyword} style, featuring cats: ${catDesc}. ${sceneDesc}.
    Each cat should have a distinct personality expression.
    Clean manga style, bold outlines, cel-shaded coloring, expressive anime-style cat faces.
    Panel-style composition${dogNote}. Chinese comic aesthetic, warm lighting, high detail.`;

  // Try the local Hermes gateway (port 18789)
  const gatewayUrl = 'http://localhost:18789/v1/images/generations';

  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'agnes-image-2.1-flash',
      prompt: prompt,
      size: '1024x1024',
      n: 1
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.data && data.data[0] && data.data[0].url) {
    return data.data[0].url;
  } else if (data.data && data.data[0] && data.data[0].b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  } else {
    throw new Error('无法解析图片结果');
  }
}

// Scene description generator
function generateComicSceneDescriptions(names, traits, data, style, hasDog) {
  const n = names.length;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const openers = dramaLines[style].openings;
  const middles = dramaLines[style].middle;
  const details = palaceLifeDetails;

  const scenes = [];

  // Scene 1: Opening
  let scene1Desc = '';
  if (n >= 3) {
    scene1Desc = `${names[0]}站在猫爬架最高处巡视领地，阳光从窗户洒进来。`;
    const others = names.slice(1).map((_, i) => ` ${names[1+i]}在${pick(details)}。`);
    scene1Desc += others.join('');
  } else {
    scene1Desc = `${names[0]}在${pick(details)}。${names[1]}在${pick(details)}。`;
  }
  scenes.push({
    sceneDesc: '后宫日常开场',
    prompt: `${pick(openers)}开场。${scene1Desc} 温馨宁静的午后，猫咪们在宫殿般的客厅里各据一方。`
  });

  // Scene 2: Daily life
  scenes.push({
    sceneDesc: '猫咪们的日常',
    prompt: `展示${n}只猫咪各自的日常活动场景。${names.map((nm,i)=>`${nm}(${traits[i]||'性格独特'})正在${pick(details)}。`).join('')} 多格漫画分镜，每只猫都有独特的表情和动作。`
  });

  // Scene 3: Conflict
  const opponentNames = names.filter((_, i) => i !== 0);
  scenes.push({
    sceneDesc: '冲突爆发',
    prompt: `戏剧性冲突场景。${pick(names)}和${pick(opponentNames)}为${pick(data.conflicts)}而争执。${pick(names)}怒目而视，${pick(names)}不屑地甩尾巴。${pick(middles)} 紧张的漫画分镜，夸张的表情。`
  });

  // Scene 4: Climax
  let dogIntro = '';
  let dogOutro = '';
  if (hasDog) {
    dogIntro = '🐕 ' + pick(dogCharacterData.titles) + '大摇大摆闯入猫的世界，所有猫震惊回头。';
    dogOutro = '狗狗摇着尾巴，仿佛局外人。';
  }
  scenes.push({
    sceneDesc: '高潮对决',
    prompt: `${dogIntro} ${pick(names)}和${pick(names)}正面交锋，夸张的漫画风格对峙画面。${pick(middles)} ${dogOutro} 戏剧性强烈的漫画分镜。`
  });

  // Scene 5: Ending
  scenes.push({
    sceneDesc: '温馨结局',
    prompt: `所有猫咪和狗狗(如果有的话)一起依偎在一起睡觉或玩耍的场景。${pick(names)}主动蹭了蹭${pick(names)}，${pick(middles)} ${pick(dramaLines[style].endings)} 温暖的阳光洒在猫咪们身上，温馨和谐。`
  });

  return scenes;
}

// Download all comic images
async function downloadAllComicImages() {
  const sceneCards = comicResults.querySelectorAll('.comic-scene-card');
  for (let i = 0; i < sceneCards.length; i++) {
    const img = sceneCards[i]?.querySelector('.scene-thumb img');
    if (img) {
      try {
        const response = await fetch(img.src);
        const blob = await response.blob();
        const ext = img.src.startsWith('data:') ? (img.src.includes('jpeg') ? '.jpg' : '.png') : '.png';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `漫画场景_${i+1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      } catch (err) {
        console.error(`Download scene ${i} failed:`, err);
      }
      // Small delay between downloads
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

comicDownloadBtn?.addEventListener('click', downloadAllComicImages);


// ========== Original code (九宫格切图) ==========

drawPlaceholder();
updateFilterBadge();
