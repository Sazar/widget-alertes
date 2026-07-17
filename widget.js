/* ============================================
   WIDGET ALERTES TWITCH — StreamElements
   widget.js
   ============================================ */

'use strict';

// ── Variables globales ────────────────────────
const alertQueue = [];
let isAlertPlaying = false;
let fieldData = {};

// Références DOM
const wrapper   = document.getElementById('alert-wrapper');
const box       = document.getElementById('alert-box');
const iconWrap  = document.getElementById('alert-icon-wrap');
const iconEl    = document.getElementById('alert-icon');
const username  = document.getElementById('alert-username');
const message   = document.getElementById('alert-message');
const subMsg    = document.getElementById('alert-sub-message');
const progressFill = document.getElementById('alert-progress-fill');
const soundEl   = document.getElementById('alert-sound');
const confettiC = document.getElementById('confetti-container');
const canvas    = document.getElementById('particles-canvas');

// ── Utilitaires ───────────────────────────────
function getField(key, fallback) {
  const v = fieldData[key];
  return (v !== undefined && v !== '') ? v : fallback;
}

function applyTheme() {
  const theme   = getField('theme', 'custom');
  const classes = ['theme-twitch','theme-neon','theme-fire','theme-rose','theme-minimal'];
  classes.forEach(c => wrapper.classList.remove(c));
  if (theme !== 'custom') {
    wrapper.classList.add('theme-' + theme);
  } else {
    // Variables CSS personnalisées
    const r = wrapper.style;
    r.setProperty('--accent-color',    getField('accentColor', '#9146ff'));
    r.setProperty('--accent-secondary', getField('accentSecondary', '#bf94ff'));
    r.setProperty('--glow-color',      getField('glowColor', 'rgba(145,70,255,0.4)'));
    r.setProperty('--bg-color',        getField('bgColor', 'rgba(15,10,30,0.92)'));
    r.setProperty('--border-color',    getField('borderColor', 'rgba(145,70,255,0.55)'));
  }
  wrapper.style.setProperty('--border-radius', getField('borderRadius', '16') + 'px');
  wrapper.style.setProperty('--font-title',   getField('fontTitle', 'Montserrat'));
  wrapper.style.setProperty('--font-message', getField('fontMessage', 'Inter'));
  wrapper.style.setProperty('--font-size-username', getField('fontSizeUsername', '22') + 'px');
  wrapper.style.setProperty('--font-size-message',  getField('fontSizeMessage', '14') + 'px');
  wrapper.style.setProperty('--color-username', getField('colorUsername', '#ffffff'));
  wrapper.style.setProperty('--color-message',  getField('colorMessage', 'rgba(255,255,255,0.85)'));

  // Position
  const pos = getField('position', 'bottom-center');
  const posClasses = ['pos-top-left','pos-top-center','pos-top-right','pos-bottom-left','pos-bottom-right','pos-center'];
  posClasses.forEach(c => wrapper.classList.remove(c));
  if (pos !== 'bottom-center') wrapper.classList.add('pos-' + pos);

  // Largeur
  wrapper.style.width = getField('widgetWidth', '680') + 'px';
}

// ── Particules ────────────────────────────────
function launchParticles(color1, color2) {
  if (getField('showParticles', 'yes') !== 'yes') return;
  const count = parseInt(getField('particleCount', '12'));
  canvas.width  = 120;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  let particles = Array.from({length: count}, () => ({
    x: 60, y: 60,
    vx: (Math.random() - 0.5) * 5,
    vy: (Math.random() - 0.5) * 5,
    r:  Math.random() * 4 + 2,
    life: 1,
    color: Math.random() > 0.5 ? color1 : color2
  }));
  function draw() {
    ctx.clearRect(0, 0, 120, 120);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x  += p.vx; p.y  += p.vy;
      p.vy += 0.15;
      p.life -= 0.025;
      ctx.globalAlpha = p.life;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    });
    if (particles.length > 0) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, 120, 120);
  }
  draw();
}

// ── Confetti ──────────────────────────────────
function launchConfetti(count = 60) {
  if (getField('showConfetti', 'no') !== 'yes') return;
  const colors = ['#9146ff','#00d4ff','#ff5fa0','#ffcc00','#00ffcc','#ff6b00'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = Math.random() * 8 + 6;
    piece.style.cssText = `
      left: ${Math.random()*100}vw;
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random()*colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${Math.random()*2+1.5}s;
      animation-delay: ${Math.random()*0.8}s;
      transform: rotate(${Math.random()*360}deg);
    `;
    confettiC.appendChild(piece);
    setTimeout(() => piece.remove(), 3500);
  }
}

// ── Son ───────────────────────────────────────
function playSound(url, volume = 0.7) {
  if (!url || url === '') return;
  soundEl.src    = url;
  soundEl.volume = Math.min(1, Math.max(0, parseFloat(volume)));
  soundEl.load();
  soundEl.play().catch(() => {});
}

// ── Icone selon le type ───────────────────────
const TYPE_CONFIG = {
  follower:  { emoji: '💜', label: 'Nouveau Follower !',  labelEn: 'New Follower!' },
  subscriber:{ emoji: '⭐', label: 'Nouveau Sub !',       labelEn: 'New Subscriber!' },
  resub:     { emoji: '🔄', label: 'Resub !',             labelEn: 'Resub!' },
  giftsub:   { emoji: '🎁', label: 'Gift Sub !',          labelEn: 'Gift Sub!' },
  cheer:     { emoji: '💎', label: 'Bits !',              labelEn: 'Bits!' },
  tip:       { emoji: '💰', label: 'Donation !',          labelEn: 'Donation!' },
  raid:      { emoji: '⚔️', label: 'Raid !',              labelEn: 'Raid!' },
  host:      { emoji: '📡', label: 'Host !',              labelEn: 'Host!' },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || { emoji: '🔔', label: 'Alerte !', labelEn: 'Alert!' };
}

// ── Construction du message ───────────────────
function buildAlertContent(data) {
  const lang      = getField('language', 'fr');
  const type      = data.type;
  const cfg       = getTypeConfig(type);
  const eventLabel = lang === 'fr' ? cfg.label : cfg.labelEn;
  const name      = data.username || data.name || 'Anonyme';

  let mainMsg  = '';
  let subMsgTx = '';
  let emojiOverride = null;

  switch (type) {
    case 'follower':
      mainMsg = getField('msgFollow', '{user} te follow ! 💜').replace('{user}', name);
      emojiOverride = getField('iconFollow', '💜');
      break;
    case 'subscriber':
      mainMsg = getField('msgSub', '{user} vient de sub !').replace('{user}', name);
      emojiOverride = getField('iconSub', '⭐');
      if (data.message) subMsgTx = '"' + data.message + '"';
      break;
    case 'resub':
      const months = data.amount || data.months || 1;
      mainMsg = getField('msgResub', '{user} resub x{months} mois !')
        .replace('{user}', name)
        .replace('{months}', months);
      emojiOverride = getField('iconResub', '🔄');
      if (data.message) subMsgTx = '"' + data.message + '"';
      break;
    case 'giftsub':
      const giftCount = data.amount || 1;
      mainMsg = getField('msgGiftSub', '{user} offre {count} sub(s) !')
        .replace('{user}', name)
        .replace('{count}', giftCount);
      emojiOverride = getField('iconGiftSub', '🎁');
      break;
    case 'cheer':
      const bits = data.amount || 0;
      mainMsg = getField('msgBits', '{user} envoie {bits} bits !')
        .replace('{user}', name)
        .replace('{bits}', bits);
      emojiOverride = getField('iconBits', '💎');
      break;
    case 'tip':
      const amount = (parseFloat(data.amount) || 0).toFixed(2);
      const currency = data.currency || getField('currency', '€');
      mainMsg = getField('msgTip', '{user} donne {amount}{currency} !')
        .replace('{user}', name)
        .replace('{amount}', amount)
        .replace('{currency}', currency);
      emojiOverride = getField('iconTip', '💰');
      if (data.message) subMsgTx = '"' + data.message + '"';
      break;
    case 'raid':
      const raiders = data.amount || data.raiders || 0;
      mainMsg = getField('msgRaid', '{user} raid avec {count} raiders !')
        .replace('{user}', name)
        .replace('{count}', raiders);
      emojiOverride = getField('iconRaid', '⚔️');
      break;
    case 'host':
      mainMsg = getField('msgHost', '{user} host le stream !').replace('{user}', name);
      emojiOverride = getField('iconHost', '📡');
      break;
    default:
      mainMsg = eventLabel + ' ' + name;
  }

  return { name, mainMsg, subMsgTx, emoji: emojiOverride || cfg.emoji };
}

// ── Affichage d'une alerte ─────────────────────
function showAlert(data) {
  applyTheme();

  const { name, mainMsg, subMsgTx, emoji } = buildAlertContent(data);
  const type     = data.type;
  const duration = parseInt(getField('alertDuration', '7')) * 1000;
  const animIn   = getField('animationIn', 'slideup');
  const animOut  = getField('animationOut', 'fade');
  const accent   = getComputedStyle(wrapper).getPropertyValue('--accent-color').trim() || '#9146ff';
  const secondary= getComputedStyle(wrapper).getPropertyValue('--accent-secondary').trim() || '#bf94ff';

  // Remplissage DOM
  username.textContent = name;
  message.textContent  = mainMsg;
  subMsg.textContent   = subMsgTx;
  subMsg.style.display = subMsgTx ? 'block' : 'none';

  // Icone
  const useAvatar = getField('showAvatar', 'no') === 'yes' && data.avatar;
  if (useAvatar) {
    iconEl.innerHTML = `<img src="${data.avatar}" alt="avatar">`;
    iconEl.classList.add('avatar-mode');
  } else {
    iconEl.innerHTML = emoji;
    iconEl.classList.remove('avatar-mode');
  }

  // Couleur de la boite selon type
  applyTypeColors(type);

  // Affichage
  wrapper.classList.remove('hidden');
  const inClass = 'animate-in-' + animIn;
  box.className = '';
  box.classList.add(inClass);

  // Particules & Confetti
  launchParticles(accent, secondary);
  if (['giftsub','tip','raid'].includes(type)) launchConfetti(50);
  if (type === 'cheer' && parseInt(data.amount) >= parseInt(getField('confettiBitsThreshold', '1000'))) launchConfetti(80);

  // Pulse glow
  if (getField('pulseGlow', 'yes') === 'yes') box.classList.add('pulse-glow');

  // Shake icone pour bits/cheer
  if (type === 'cheer' && getField('shakeIcon', 'yes') === 'yes') {
    setTimeout(() => { iconEl.classList.add('icon-shake'); setTimeout(() => iconEl.classList.remove('icon-shake'), 700); }, 200);
  }

  // Son
  const soundMap = {
    follower:   [getField('soundFollow', ''), getField('soundVolumeFollow', '0.7')],
    subscriber: [getField('soundSub', ''), getField('soundVolumeSub', '0.8')],
    resub:      [getField('soundResub', ''), getField('soundVolumeResub', '0.8')],
    giftsub:    [getField('soundGiftSub', ''), getField('soundVolumeGiftSub', '0.8')],
    cheer:      [getField('soundBits', ''), getField('soundVolumeBits', '0.75')],
    tip:        [getField('soundTip', ''), getField('soundVolumeTip', '0.9')],
    raid:       [getField('soundRaid', ''), getField('soundVolumeRaid', '0.8')],
    host:       [getField('soundHost', ''), getField('soundVolumeHost', '0.7')],
  };
  const [sUrl, sVol] = soundMap[type] || ['', '0.7'];
  if (sUrl) playSound(sUrl, sVol);

  // Barre de progression
  progressFill.style.transition = 'none';
  progressFill.style.transform  = 'scaleX(1)';
  void progressFill.offsetWidth;
  progressFill.style.transition = `transform ${duration/1000}s linear`;
  progressFill.style.transform  = 'scaleX(0)';

  // Masquage après durée
  const outClass = 'animate-out-' + animOut;
  setTimeout(() => {
    box.classList.remove(inClass, 'pulse-glow');
    box.classList.add(outClass);
    setTimeout(() => {
      wrapper.classList.add('hidden');
      box.className = '';
      isAlertPlaying = false;
      processQueue();
    }, 450);
  }, duration);
}

function applyTypeColors(type) {
  const colorMap = {
    follower:   [getField('colorFollow', ''), ''],
    subscriber: [getField('colorSub', ''), ''],
    resub:      [getField('colorResub', ''), ''],
    giftsub:    [getField('colorGiftSub', ''), ''],
    cheer:      [getField('colorBits', ''), ''],
    tip:        [getField('colorTip', ''), ''],
    raid:       [getField('colorRaid', ''), ''],
  };
  const [accentOverride] = colorMap[type] || [''];
  if (accentOverride) {
    box.style.setProperty('--accent-color', accentOverride);
    box.style.borderColor = accentOverride + '99';
    box.style.boxShadow   = `0 0 30px ${accentOverride}66, 0 8px 32px rgba(0,0,0,0.45)`;
  } else {
    box.style.removeProperty('--accent-color');
    box.style.removeProperty('border-color');
    box.style.removeProperty('box-shadow');
  }
}

// ── Queue d'alertes ───────────────────────────
function processQueue() {
  if (isAlertPlaying || alertQueue.length === 0) return;
  const queued = alertQueue.shift();
  isAlertPlaying = true;
  const delay = parseInt(getField('alertDelay', '0')) * 1000;
  setTimeout(() => showAlert(queued), delay);
}

function queueAlert(data) {
  const maxQueue = parseInt(getField('maxQueue', '10'));
  if (alertQueue.length >= maxQueue) {
    alertQueue.shift(); // Drop oldest if queue full
  }
  alertQueue.push(data);
  processQueue();
}

// ── StreamElements Event Listener ────────────
window.addEventListener('onEventReceived', function(obj) {
  const data = obj.detail;
  if (!data || !data.listener) return;

  const listener = data.listener;
  const evt      = data.event;
  if (!evt) return;

  // Filtres d'activation
  const filterMap = {
    'follower-latest':    { type: 'follower',   enabled: getField('enableFollow', 'yes') },
    'subscriber-latest':  { type: 'subscriber', enabled: getField('enableSub', 'yes') },
    'cheer-latest':       { type: 'cheer',      enabled: getField('enableBits', 'yes') },
    'tip-latest':         { type: 'tip',        enabled: getField('enableTip', 'yes') },
    'raid-latest':        { type: 'raid',       enabled: getField('enableRaid', 'yes') },
    'host-latest':        { type: 'host',       enabled: getField('enableHost', 'yes') },
  };

  const mapped = filterMap[listener];
  if (!mapped || mapped.enabled !== 'yes') return;

  let type = mapped.type;

  // Détection resub / giftsub
  if (listener === 'subscriber-latest') {
    if (evt.gifted || evt.isCommunityGift) type = 'giftsub';
    else if (evt.months && evt.months > 1)  type = 'resub';
  }

  // Filtre montant minimum pour bits
  if (type === 'cheer') {
    const minBits = parseInt(getField('minBits', '1'));
    if (parseInt(evt.amount) < minBits) return;
  }

  // Filtre montant minimum pour tips
  if (type === 'tip') {
    const minTip = parseFloat(getField('minTip', '0'));
    if (parseFloat(evt.amount) < minTip) return;
  }

  queueAlert({
    type,
    username: evt.displayName || evt.name || evt.sender,
    amount:   evt.amount,
    months:   evt.months,
    message:  evt.message,
    currency: evt.currency,
    avatar:   evt.avatar,
    raiders:  evt.raiders,
    gifted:   evt.gifted,
  });
});

// ── Réception des champs configurés ──────────
window.addEventListener('onWidgetLoad', function(obj) {
  if (obj && obj.detail && obj.detail.fieldData) {
    fieldData = obj.detail.fieldData;
  }
  applyTheme();
});

// ── Test depuis SE Editor ─────────────────────
window.addEventListener('onTestButtonClick', function(obj) {
  const testType = (obj && obj.detail) ? (obj.detail.testType || 'follower') : 'follower';
  const testData = {
    follower:   { type: 'follower',   username: 'TwitchUser42' },
    subscriber: { type: 'subscriber', username: 'SubFan99', message: 'Super stream !' },
    resub:      { type: 'resub',      username: 'FidèleViewer', amount: 6, message: 'Déjà 6 mois !' },
    giftsub:    { type: 'giftsub',    username: 'GiftKing', amount: 5 },
    cheer:      { type: 'cheer',      username: 'BitsQueen', amount: 500 },
    tip:        { type: 'tip',        username: 'DonatorPro', amount: 10, currency: '€', message: 'Merci pour le stream !' },
    raid:       { type: 'raid',       username: 'RaidLeader', amount: 150 },
    host:       { type: 'host',       username: 'FriendStreamer' },
  };
  const sample = testData[testType] || testData['follower'];
  queueAlert(sample);
});
