const STORAGE_KEY = 'perfect-orbit-golf-v1';
const COURSE_DATA = [
  { dist: 300, par: 3, wind: 0 },
  { dist: 360, par: 4, wind: 1 },
  { dist: 430, par: 4, wind: 2 },
  { dist: 520, par: 5, wind: 3 }
];

const SKINS = [
  { name: 'Aero Cyan', body: '#7ee7ff', hat: '#7ad0ff', accent: '#6a7cff' },
  { name: 'Lime Oak', body: '#5fe6a7', hat: '#3ad39d', accent: '#8aeec0' },
  { name: 'Royal Rose', body: '#ff7aaa', hat: '#ff9a7a', accent: '#ffcc70' },
  { name: 'Solar Gold', body: '#f9cb56', hat: '#ffd166', accent: '#ff9d45' }
];

const UPGRADES = [
  { id: 'driver', label: 'Driver', cost: 40, description: '+5 power per level' },
  { id: 'control', label: 'Control', cost: 45, description: '+5 accuracy per level' },
  { id: 'swing', label: 'Swing Core', cost: 80, description: '+7 power per level' },
  { id: 'club', label: 'Pro Club', cost: 120, description: '+10% all shot quality' }
];

const DEFAULT_STATE = {
  power: 1,
  acc: 1,
  coins: 0,
  skin: 0,
  hole: 1,
  mute: false,
  upgrades: { driver: 0, control: 0, swing: 0, club: 0 },
  leaderboard: [{ name: 'Player', score: 120, date: 'today' }]
};

const game = {
  canvas: document.getElementById('gameCanvas'),
  ctx: null,
  state: loadState(),
  player: { x: 0, y: 0 },
  ball: { x: 0, y: 0, r: 9, vx: 0, vy: 0, moving: false },
  world: { cx: 0, cy: 0, radius: 0, holeX: 0, holeY: 0 },
  aim: { active: false, start: null, end: null },
  particles: [],
  celebration: [],
  camera: { x: 0, y: 0, zoom: 1 },
  lastTime: 0
};

const ui = {
  statPower: document.getElementById('statPower'),
  statAcc: document.getElementById('statAcc'),
  statCoins: document.getElementById('statCoins'),
  hudHole: document.getElementById('hudHole'),
  hudPar: document.getElementById('hudPar'),
  hudDistance: document.getElementById('hudDistance'),
  hudWind: document.getElementById('hudWind'),
  powerMeter: document.getElementById('powerMeter'),
  accMeter: document.getElementById('accMeter'),
  powerMeterText: document.getElementById('powerMeterText'),
  accMeterText: document.getElementById('accMeterText'),
  skinList: document.getElementById('skinList'),
  shopList: document.getElementById('shopList'),
  leaderboardList: document.getElementById('leaderboardList'),
  shotPowerValue: document.getElementById('shotPowerValue'),
  shotAccValue: document.getElementById('shotAccValue'),
  tutorialModal: document.getElementById('tutorialModal'),
  trainModal: document.getElementById('trainModal')
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        upgrades: { ...DEFAULT_STATE.upgrades, ...(parsed.upgrades || {}) },
        leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : DEFAULT_STATE.leaderboard
      };
    }
  } catch (err) {
    console.warn('Could not load state', err);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game.state));
}

function getCourse() {
  return COURSE_DATA[(game.state.hole - 1) % COURSE_DATA.length];
}

function upgradeCost(upgradeId, currentLevel) {
  const base = UPGRADES.find((item) => item.id === upgradeId);
  if (!base) return 999999;
  return Math.round(base.cost * (1 + currentLevel * 0.85));
}

function updateHUD() {
  const course = getCourse();
  ui.statPower.textContent = String(game.state.power);
  ui.statAcc.textContent = String(game.state.acc);
  ui.statCoins.textContent = String(game.state.coins);
  ui.hudHole.textContent = String(game.state.hole);
  ui.hudPar.textContent = String(course.par);
  ui.hudDistance.textContent = `${course.dist}m`;
  ui.hudWind.textContent = String(course.wind);

  const pPct = Math.min(100, (game.state.power / 12) * 100);
  const aPct = Math.min(100, (game.state.acc / 12) * 100);
  ui.powerMeter.style.width = `${pPct}%`;
  ui.accMeter.style.width = `${aPct}%`;
  ui.powerMeterText.textContent = `${Math.round(pPct)}%`;
  ui.accMeterText.textContent = `${Math.round(aPct)}%`;

  ui.shotPowerValue.textContent = String(game.state.power);
  ui.shotAccValue.textContent = String(game.state.acc);
  document.getElementById('muteBtn').textContent = game.state.mute ? '🔇' : '🔊';
}

function resizeCanvas() {
  const panel = document.querySelector('.course-panel');
  const rect = panel.getBoundingClientRect();
  game.canvas.width = Math.max(720, Math.floor(rect.width));
  game.canvas.height = Math.max(480, Math.floor(rect.height));
}

function setupWorld() {
  const w = game.canvas.width;
  const h = game.canvas.height;
  game.world.cx = w * 0.56;
  game.world.cy = h * 0.48;
  game.world.radius = Math.min(w, h) * 0.28;
  game.world.holeX = game.world.cx + game.world.radius * 1.3;
  game.world.holeY = game.world.cy + 8;
  playerReset();
  buildParticles();
}

function playerReset() {
  game.player.x = game.world.cx - game.world.radius * 0.8;
  game.player.y = game.world.cy + 18;
  game.ball.x = game.player.x + 34;
  game.ball.y = game.player.y - 7;
  game.ball.r = 9;
  game.ball.vx = 0;
  game.ball.vy = 0;
  game.ball.moving = false;
}

function buildParticles() {
  game.particles = [];
  for (let i = 0; i < 42; i += 1) {
    game.particles.push({
      angle: Math.random() * Math.PI * 2,
      radius: game.world.radius * (0.6 + Math.random() * 0.6),
      speed: 0.004 + Math.random() * 0.012,
      color: i % 2 === 0 ? 'rgba(126,231,255,0.18)' : 'rgba(139,92,246,0.12)'
    });
  }
}

function bindEvents() {
  const stage = document.querySelector('.course-panel');

  stage.addEventListener('pointerdown', (event) => {
    if (game.ball.moving) return;
    const p = getCanvasPoint(event);
    const d = Math.hypot(p.x - game.ball.x, p.y - game.ball.y);
    if (d < 120) {
      game.aim.active = true;
      game.aim.start = p;
      game.aim.end = p;
    }
  });

  stage.addEventListener('pointermove', (event) => {
    if (game.aim.active) {
      game.aim.end = getCanvasPoint(event);
    }
  });

  window.addEventListener('pointerup', () => {
    if (game.aim.active) {
      game.aim.active = false;
      shootFromAim();
    }
  });

  document.getElementById('shootBtn').addEventListener('click', () => {
    if (game.ball.moving) return;
    const dx = game.world.holeX - game.ball.x;
    const dy = game.world.holeY - game.ball.y;
    const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.12;
    const basePower = Math.min(260, Math.hypot(dx, dy) * 0.2 + 20) * getShotMultiplier();
    game.ball.vx = Math.cos(angle) * basePower;
    game.ball.vy = Math.sin(angle) * basePower;
    game.ball.moving = true;
    audioManager.playShoot();
  });

  document.getElementById('trainBtn').addEventListener('click', () => openTrainModal());
  document.getElementById('tutorialBtn').addEventListener('click', () => openTutorial());

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-close');
      const modal = document.getElementById(id);
      if (modal) modal.classList.add('hidden');
    });
  });

  document.getElementById('muteBtn').addEventListener('click', toggleMute);
  document.getElementById('powerDrillBtn').addEventListener('click', startPowerDrill);
  document.getElementById('accuracyDrillBtn').addEventListener('click', startAccuracyDrill);

  window.addEventListener('resize', () => {
    resizeCanvas();
    setupWorld();
  });
}

function getCanvasPoint(event) {
  const rect = game.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * game.canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * game.canvas.height
  };
}

function getShotMultiplier() {
  return 1 + (game.state.upgrades.driver * 0.18) + (game.state.upgrades.swing * 0.24) + (game.state.upgrades.club * 0.1);
}

function shootFromAim() {
  if (!game.aim.start || !game.aim.end) return;
  const dx = game.aim.start.x - game.aim.end.x;
  const dy = game.aim.start.y - game.aim.end.y;
  const drag = Math.hypot(dx, dy);
  if (drag < 8) {
    game.aim.start = null;
    game.aim.end = null;
    return;
  }

  const angle = Math.atan2(dy, dx);
  const power = Math.min(260, drag * (0.14 + game.state.power * 0.015)) * getShotMultiplier();
  const deviance = (1 - Math.min(1, game.state.acc / 12)) * (Math.random() - 0.5) * 0.3;
  const finalAngle = angle + deviance;

  game.ball.vx = Math.cos(finalAngle) * power;
  game.ball.vy = Math.sin(finalAngle) * power;
  game.ball.moving = true;
  game.aim.start = null;
  game.aim.end = null;
  audioManager.playShoot();
}

function loop(ts) {
  const delta = Math.min(32, ts - game.lastTime || 16);
  game.lastTime = ts;
  updateBall(delta);
  updateCamera();
  render();
  requestAnimationFrame(loop);
}

function updateBall(dt) {
  if (!game.ball.moving) return;

  const wind = getCourse().wind * 0.012;
  game.ball.vy += 0.22 * dt;
  game.ball.vx += wind * dt;
  game.ball.vx *= 0.995;
  game.ball.vy *= 0.993;

  game.ball.x += game.ball.vx * dt * 0.85;
  game.ball.y += game.ball.vy * dt * 0.85;

  const floorY = game.world.cy + game.world.radius * 0.35;
  if (game.ball.y + game.ball.r >= floorY) {
    game.ball.y = floorY - game.ball.r;
    if (Math.abs(game.ball.vy) > 0.9) {
      game.ball.vy *= -0.35;
      game.ball.vx *= 0.92;
    } else {
      game.ball.vy = 0;
      if (Math.abs(game.ball.vx) < 0.2) {
        game.ball.vx = 0;
        game.ball.moving = false;
        const distanceTravel = Math.hypot(game.ball.x - game.player.x, game.ball.y - game.player.y);
        if (distanceTravel > 12) {
          gainCoins(Math.max(0, Math.round(distanceTravel / 85)));
        }
      }
    }
  }

  const dx = game.ball.x - game.world.holeX;
  const dy = game.ball.y - game.world.holeY;
  if (Math.hypot(dx, dy) < 18) {
    finishHole();
  }
}

function finishHole() {
  if (game.ball.moving === false) return;
  const current = getCourse();
  const reward = Math.round(24 + current.dist / 10 + game.state.power * 2);
  gainCoins(reward);
  addLeaderboardEntry(reward);
  game.state.hole += 1;
  playerReset();
  updateHUD();
  buildLeaderboard();
  spawnCelebration();
  audioManager.playHole();
  saveState();
}

function gainCoins(amount) {
  game.state.coins += amount;
  updateHUD();
  saveState();
  audioManager.playCoin();
}

function addLeaderboardEntry(score) {
  const entry = {
    name: 'Player',
    score: score + game.state.coins,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  };
  game.state.leaderboard.push(entry);
  game.state.leaderboard.sort((a, b) => b.score - a.score);
  game.state.leaderboard = game.state.leaderboard.slice(0, 6);
  saveState();
}

function buildLeaderboard() {
  ui.leaderboardList.innerHTML = '';
  const entries = game.state.leaderboard.length ? game.state.leaderboard : [{ name: 'Player', score: 0, date: '—' }];
  entries.slice(0, 6).forEach((entry, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>#${idx + 1} ${entry.name}</span><strong>${entry.score}</strong>`;
    ui.leaderboardList.appendChild(li);
  });
}

function buildSkins() {
  ui.skinList.innerHTML = '';
  SKINS.forEach((skin, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `skin-item${index === game.state.skin ? ' selected' : ''}`;
    btn.innerHTML = `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <defs>
          <linearGradient id="skinGrad-${index}" x1="0" x2="1">
            <stop offset="0%" stop-color="${skin.body}" />
            <stop offset="100%" stop-color="${skin.accent}" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="42" height="42" rx="12" fill="url(#skinGrad-${index})" opacity="0.2"/>
        <circle cx="27" cy="18" r="8" fill="#f5d7ba" />
        <rect x="20" y="26" width="14" height="14" rx="4" fill="${skin.body}" />
        <rect x="22" y="12" width="10" height="5" rx="2" fill="${skin.hat}" />
        <line x1="34" y1="28" x2="44" y2="22" stroke="${skin.accent}" stroke-width="3" stroke-linecap="round" />
      </svg>
    `;
    btn.addEventListener('click', () => {
      game.state.skin = index;
      saveState();
      buildSkins();
    });
    ui.skinList.appendChild(btn);
  });
}

function buildShop() {
  ui.shopList.innerHTML = '';
  UPGRADES.forEach((item) => {
    const level = game.state.upgrades[item.id] || 0;
    const cost = upgradeCost(item.id, level);
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-copy">
        <div class="shop-name">${item.label} Lv.${level}</div>
        <div class="shop-desc">${item.description}</div>
      </div>
      <button class="shop-buy" ${game.state.coins >= cost ? '' : 'disabled'}>${cost}</button>
    `;
    row.querySelector('.shop-buy').addEventListener('click', () => buyUpgrade(item.id));
    ui.shopList.appendChild(row);
  });
}

function buyUpgrade(id) {
  const level = game.state.upgrades[id] || 0;
  const cost = upgradeCost(id, level);
  if (game.state.coins < cost) {
    audioManager.playError();
    return;
  }
  game.state.coins -= cost;
  game.state.upgrades[id] = level + 1;
  saveState();
  updateHUD();
  buildShop();
  audioManager.playTrain();
}

function openTutorial() {
  ui.tutorialModal.classList.remove('hidden');
  ui.tutorialModal.setAttribute('aria-hidden', 'false');
}

function openTrainModal() {
  ui.trainModal.classList.remove('hidden');
  ui.trainModal.setAttribute('aria-hidden', 'false');
}

function startPowerDrill() {
  const btn = document.getElementById('powerDrillBtn');
  const countEl = document.getElementById('powerDrillCount');
  let taps = 0;
  let active = true;

  btn.textContent = 'Tap!';
  countEl.textContent = '0';

  const tapHandler = () => {
    if (!active) return;
    taps += 1;
    countEl.textContent = String(taps);
  };

  btn.onclick = tapHandler;

  setTimeout(() => {
    active = false;
    const gained = Math.min(3, Math.floor(taps / 8));
    game.state.power = Math.min(12, game.state.power + gained);
    game.state.coins += gained * 3;
    btn.textContent = 'Start Power Drill';
    btn.onclick = startPowerDrill;
    audioManager.playTrain();
    saveState();
    updateHUD();
    buildShop();
  }, 3000);
}

function startAccuracyDrill() {
  const canvas = document.getElementById('accuracyCanvas');
  const ctx = canvas.getContext('2d');
  const resultEl = document.getElementById('accuracyDrillResult');
  const btn = document.getElementById('accuracyDrillBtn');

  let animFrame = 0;
  let running = true;

  function drawTarget() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#061b23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(20, 45);
    ctx.lineTo(canvas.width - 20, 45);
    ctx.stroke();

    const x = 32 + (Math.sin(animFrame * 0.1) * 0.5 + 0.5) * (canvas.width - 64);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x, 45, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7ee7ff';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 45, 6, 0, Math.PI * 2);
    ctx.fill();

    animFrame += 1;
    if (running) requestAnimationFrame(drawTarget);
  }

  drawTarget();
  btn.textContent = 'Click the moving target';

  canvas.onclick = (event) => {
    if (!running) return;
    running = false;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const diff = Math.abs(clickX - canvas.width / 2);
    const gain = diff < 18 ? 2 : diff < 35 ? 1 : 0;
    game.state.acc = Math.min(12, game.state.acc + gain);
    game.state.coins += gain * 2;
    resultEl.textContent = `${Math.round(diff)}px +${gain}`;
    saveState();
    updateHUD();
    buildShop();
    audioManager.playTrain();
    btn.textContent = 'Start Accuracy Drill';
  };
}

function spawnCelebration() {
  for (let i = 0; i < 28; i += 1) {
    game.celebration.push({
      x: game.world.holeX,
      y: game.world.holeY,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.8) * 5,
      life: 50 + Math.random() * 30,
      color: i % 2 === 0 ? 'rgba(126,231,255,0.9)' : 'rgba(139,92,246,0.9)'
    });
  }
}

function updateCelebration() {
  game.celebration = game.celebration.filter((part) => part.life > 0);
  game.celebration.forEach((part) => {
    part.x += part.vx;
    part.y += part.vy;
    part.vy += 0.12;
    part.life -= 1;
  });
}

function updateCamera() {
  const targetX = game.ball.x - game.canvas.width * 0.33;
  const targetY = game.ball.y - game.canvas.height * 0.42;
  game.camera.x += (targetX - game.camera.x) * 0.06;
  game.camera.y += (targetY - game.camera.y) * 0.06;
  const speed = Math.hypot(game.ball.vx, game.ball.vy);
  game.camera.zoom = 1 + Math.min(0.12, speed / 700);
}

function render() {
  const ctx = game.ctx;
  ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);

  const bg = ctx.createLinearGradient(0, 0, 0, game.canvas.height);
  bg.addColorStop(0, '#7ad3ff');
  bg.addColorStop(0.35, '#66b0d8');
  bg.addColorStop(0.75, '#246d49');
  bg.addColorStop(1, '#133d2a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

  drawParallax();

  ctx.save();
  ctx.translate(-game.camera.x, -game.camera.y);
  ctx.scale(game.camera.zoom, game.camera.zoom);
  drawGround();
  drawHole();
  drawParticles();
  drawGolfer();
  drawBall();
  drawAimPreview();
  drawCelebration();
  ctx.restore();
}

function drawParallax() {
  const ctx = game.ctx;
  const shift = game.camera.x * 0.12;
  const baseY = game.canvas.height - 170;

  for (let layer = 0; layer < 3; layer += 1) {
    const y = baseY + layer * 88;
    ctx.fillStyle = layer === 0 ? 'rgba(16, 69, 52, 0.45)' : layer === 1 ? 'rgba(12, 54, 42, 0.58)' : 'rgba(8, 40, 31, 0.75)';
    ctx.beginPath();
    ctx.moveTo(0, game.canvas.height);
    for (let x = -40; x <= game.canvas.width + 100; x += 80) {
      const wave = Math.sin((x + shift) * 0.02 + layer) * (22 + layer * 12);
      ctx.lineTo(x, y + wave);
    }
    ctx.lineTo(game.canvas.width, game.canvas.height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGround() {
  const ctx = game.ctx;
  const cx = game.world.cx;
  const cy = game.world.cy;
  const radius = game.world.radius;

  ctx.fillStyle = '#0b4a2a';
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius * 0.38, radius * 1.18, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1b8d57';
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius * 0.24, radius * 1.02, radius * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHole() {
  const ctx = game.ctx;
  const holeX = game.world.holeX;
  const holeY = game.world.holeY;

  ctx.fillStyle = '#070d12';
  ctx.beginPath();
  ctx.arc(holeX, holeY, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ff5e75';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(holeX - 4, holeY - 40);
  ctx.lineTo(holeX - 4, holeY - 8);
  ctx.stroke();

  ctx.fillStyle = '#ff5e75';
  ctx.beginPath();
  ctx.moveTo(holeX - 4, holeY - 40);
  ctx.lineTo(holeX + 16, holeY - 31);
  ctx.lineTo(holeX - 4, holeY - 21);
  ctx.fill();
}

function drawParticles() {
  const ctx = game.ctx;
  game.particles.forEach((p) => {
    p.angle += p.speed;
    const x = game.world.cx + Math.cos(p.angle) * p.radius;
    const y = game.world.cy + Math.sin(p.angle) * p.radius * 0.66;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, 2.1, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGolfer() {
  const skin = SKINS[game.state.skin];
  const t = performance.now() * 0.015;
  const sway = game.ball.moving ? Math.sin(t) * 3 : 0;
  const x = game.player.x;
  const y = game.player.y + sway;

  const ctx = game.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = skin.body;
  ctx.fillRect(-12, -4, 24, 18);

  ctx.fillStyle = '#f5d7ba';
  ctx.beginPath();
  ctx.arc(0, -18, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = skin.hat;
  ctx.fillRect(-14, -29, 28, 6);

  ctx.strokeStyle = '#eaf9ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(10, -2);
  ctx.lineTo(30, -16 + (game.ball.moving ? Math.sin(t * 3) * 7 : 0));
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-8, 18);
  ctx.lineTo(-14, 28 + Math.sin(t * 2) * 4);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(8, 18);
  ctx.lineTo(12, 30 - Math.sin(t * 2) * 4);
  ctx.stroke();

  ctx.fillStyle = skin.accent;
  ctx.fillRect(23, -18 + (game.ball.moving ? Math.sin(t * 3) * 4 : 0), 5, 2);
  ctx.restore();
}

function drawBall() {
  const ctx = game.ctx;
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(game.ball.x + 3, game.ball.y + game.ball.r + 8, game.ball.r + 8, game.ball.r * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f9fbff';
  ctx.beginPath();
  ctx.arc(game.ball.x, game.ball.y, game.ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#d7e5ef';
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

function drawAimPreview() {
  if (!game.aim.active || !game.aim.start || !game.aim.end) return;
  const ctx = game.ctx;
  const angle = Math.atan2(game.aim.start.y - game.aim.end.y, game.aim.start.x - game.aim.end.x);
  const drag = Math.min(220, Math.hypot(game.aim.start.x - game.aim.end.x, game.aim.start.y - game.aim.end.y));
  const len = drag * 0.8 + 30;

  ctx.save();
  ctx.setLineDash([7, 7]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.moveTo(game.ball.x, game.ball.y);
  ctx.lineTo(game.ball.x + Math.cos(angle) * len, game.ball.y + Math.sin(angle) * len);
  ctx.stroke();
  ctx.restore();

  const arc = document.getElementById('radialPowerArc');
  const pct = Math.min(1, drag / 220);
  const start = -120;
  const end = start + pct * 240;
  const r = 66;
  if (pct > 0.01) {
    const a1 = (start * Math.PI) / 180;
    const a2 = (end * Math.PI) / 180;
    const x1 = 90 + Math.cos(a1) * r;
    const y1 = 90 + Math.sin(a1) * r;
    const x2 = 90 + Math.cos(a2) * r;
    const y2 = 90 + Math.sin(a2) * r;
    const largeArc = end - start > 180 ? 1 : 0;
    arc.setAttribute('d', `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`);
  } else {
    arc.setAttribute('d', '');
  }
}

function drawCelebration() {
  game.celebration.forEach((p) => {
    const ctx = game.ctx;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  updateCelebration();
}

function toggleMute() {
  game.state.mute = !game.state.mute;
  saveState();
  audioManager.setMuted(game.state.mute);
  updateHUD();
}

function init() {
  game.ctx = game.canvas.getContext('2d');
  resizeCanvas();
  setupWorld();
  buildSkins();
  buildShop();
  buildLeaderboard();
  bindEvents();
  updateHUD();
  openTutorial();
  audioManager.setMuted(game.state.mute);
  if (!game.state.mute) audioManager.startMusic();
  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', init);
window.game = game;
