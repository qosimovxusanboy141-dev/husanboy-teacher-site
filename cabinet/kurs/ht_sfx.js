// Husanboy Teacher — Standalone Mobile-Safe Signature SFX + 100% Motivation & Golden Day Banner
// Loaded inside A1..C1.html (zero ConvolverNode, zero PinkNoise, respects enzo_sfx_enabled)
(function () {
  if (window.HT_SFX) return;
  var SFX_KEY = 'enzo_sfx_enabled';
  var COMBO_KEY = 'ht_perfect_combo_v1';
  var GOLDEN_KEY = 'ht_golden_day_notified_v1';
  var ctx = null;
  var bus = null;

  function enabled() {
    try { return localStorage.getItem(SFX_KEY) === '1'; } catch (_) { return false; }
  }

  function getBus() {
    if (!enabled()) return null;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) {
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 4;
        var master = ctx.createGain(); master.gain.value = 0.85;
        var delay = ctx.createDelay(0.5); delay.delayTime.value = 0.12;
        var wet = ctx.createGain(); wet.gain.value = 0.14;
        var input = ctx.createGain();
        input.connect(comp); input.connect(delay); delay.connect(wet); wet.connect(comp);
        comp.connect(master); master.connect(ctx.destination);
        bus = input;
      }
      if (ctx.state === 'suspended') ctx.resume().catch(function () {});
      return { ctx: ctx, bus: bus };
    } catch (_) { return null; }
  }

  function marimba(b, freq, delay, dur, vol) {
    var c = b.ctx, out = b.bus, t = c.currentTime + delay;
    var o1 = c.createOscillator(), g1 = c.createGain();
    o1.type = 'sine'; o1.frequency.setValueAtTime(freq, t);
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.linearRampToValueAtTime(vol, t + 0.008);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(g1); g1.connect(out);
    o1.start(t); o1.stop(t + dur + 0.02);
  }

  function celesta(b, freq, delay, dur, vol) {
    var c = b.ctx, out = b.bus, t = c.currentTime + delay;
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function woodTok(b, freq, delay, dur, vol) {
    var c = b.ctx, out = b.bus, t = c.currentTime + delay;
    var o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.72, t + dur);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function play(id, combo) {
    var b = getBus();
    if (!b) return;
    var lift = Math.pow(1.06, Math.min(6, Math.max(0, combo || 0)));
    try {
      if (id === 'sfx_correct') {
        marimba(b, 523.25 * lift, 0, 0.18, 0.16);
        marimba(b, 698.46 * lift, 0.075, 0.28, 0.18);
      } else if (id === 'sfx_wrong') {
        woodTok(b, 260, 0, 0.11, 0.14);
        woodTok(b, 196, 0.09, 0.14, 0.12);
      } else if (id === 'sfx_70_99_encourage') {
        marimba(b, 349.23, 0, 0.20, 0.16);
        marimba(b, 440.0, 0.09, 0.22, 0.16);
        marimba(b, 523.25, 0.18, 0.26, 0.17);
        celesta(b, 698.46, 0.27, 0.42, 0.11);
      } else if (id === 'sfx_100_perfect') {
        marimba(b, 349.23 * lift, 0, 0.22, 0.16);
        marimba(b, 440.0 * lift, 0.08, 0.24, 0.17);
        marimba(b, 523.25 * lift, 0.16, 0.28, 0.18);
        marimba(b, 698.46 * lift, 0.24, 0.45, 0.20);
        celesta(b, 1046.5 * lift, 0.32, 0.55, 0.12);
        celesta(b, 1396.91 * lift, 0.40, 0.65, 0.11);
      } else if (id === 'sfx_golden_day') {
        [349.23, 440, 523.25, 698.46, 880, 1046.5, 1396.91].forEach(function (n, i) {
          celesta(b, n, i * 0.06, 0.65, 0.12);
        });
      } else if (id === 'sfx_lesson_fail') {
        marimba(b, 392.0, 0, 0.20, 0.14);
        marimba(b, 349.23, 0.14, 0.22, 0.13);
        marimba(b, 293.66, 0.28, 0.34, 0.12);
      }
    } catch (_) {}
  }

  var toastEl = null;
  var hideTimer = null;

  function showMotivationBanner(pct, isGoldenDay) {
    pct = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    var basePts = Math.round(pct / 10);
    var maxPts = 13; // 10 base + 3 perfect bonus
    var combo = 0;
    try { combo = Number(sessionStorage.getItem(COMBO_KEY) || '0') || 0; } catch (_) {}

    var title = '';
    var body = '';
    var bg = 'linear-gradient(135deg,#0B2A4A,#1e3a8a)';
    var border = '#93c5fd';

    if (isGoldenDay) {
      play('sfx_golden_day', 0);
      title = '👑 OLTIN KUN! +15 EXTRA BONUS BALL!';
      body = 'Bugungi BARCHA mashqlarni 100% mukammal yopdingiz! Haqiqiy chempionsiz!';
      bg = 'linear-gradient(135deg,#78350f,#b45309,#065f46)';
      border = '#fbbf24';
    } else if (pct >= 100) {
      combo++;
      try { sessionStorage.setItem(COMBO_KEY, String(combo)); } catch (_) {}
      play('sfx_100_perfect', combo - 1);
      title = combo >= 2 ? ('🔥 ' + combo + '× COMBO! 100% Mukammal!') : '🏆 100% Mukammal natija!';
      body = '+10 ball + ⭐ 3 ta 100% Bonus = +13 ball qo‘lga kiritdingiz!';
      bg = 'linear-gradient(135deg,#064e3b,#15803d)';
      border = '#6ee7b7';
    } else if (pct >= 70) {
      try { sessionStorage.setItem(COMBO_KEY, '0'); } catch (_) {}
      play('sfx_70_99_encourage', 0);
      var diff = maxPts - basePts;
      title = '👏 ' + pct + '% bajardingiz (+' + basePts + ' ball)';
      body = 'Lekin 100% qilganingizda +' + maxPts + ' ball (+' + diff + ' ball ko‘proq) olardingiz! 🔄 Qayta urinib 100% qiling!';
      bg = 'linear-gradient(135deg,#0B2A4A,#1d4ed8)';
      border = '#fde68a';
    } else {
      try { sessionStorage.setItem(COMBO_KEY, '0'); } catch (_) {}
      play('sfx_lesson_fail', 0);
      title = '💪 ' + pct + '% (+' + basePts + ' ball)';
      body = 'Yana bir marta diqqat bilan ishlab 100% ga chiqing — to‘liq +' + maxPts + ' ball sizniki!';
      bg = 'linear-gradient(135deg,#7f1d1d,#9f1239)';
      border = '#fda4af';
    }

    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'ht-motiv-toast';
      toastEl.style.cssText = 'position:fixed;left:12px;right:12px;top:12px;z-index:99999;max-width:440px;margin:0 auto;border-radius:18px;padding:13px 16px;color:#fff;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,0.42);transition:opacity .28s ease,transform .28s ease;cursor:pointer;';
      toastEl.onclick = function () { toastEl.style.opacity = '0'; toastEl.style.pointerEvents = 'none'; };
      document.body.appendChild(toastEl);
    }
    toastEl.style.background = bg;
    toastEl.style.border = '2px solid ' + border;
    toastEl.innerHTML = '<div style="font-weight:900;font-size:15px;margin-bottom:3px;">' + title + '</div><div style="font-size:12.5px;line-height:1.4;opacity:0.96;">' + body + '</div>';
    toastEl.style.opacity = '1';
    toastEl.style.pointerEvents = 'auto';
    toastEl.style.transform = 'translateY(0)';

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (toastEl) {
        toastEl.style.opacity = '0';
        toastEl.style.pointerEvents = 'none';
      }
    }, isGoldenDay ? 6500 : 5200);
  }

  // Listen for sub-iframe score postMessages or direct calls
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'score' || d.type === 'subDone' || d.type === 'DONE' || typeof d.pct === 'number' || typeof d.score === 'number') {
      var p = typeof d.pct === 'number' ? d.pct : (typeof d.score === 'number' && d.score <= 100 ? d.score : null);
      if (p !== null) showMotivationBanner(p, false);
    }
  });

  // Also observe golden day completion if all tasks in current day hit 100%
  function checkGoldenDay(dayKey, scoresObj) {
    if (!scoresObj || typeof scoresObj !== 'object') return;
    var vals = Object.values(scoresObj).filter(function (v) { return typeof v === 'number'; });
    if (vals.length >= 4 && vals.every(function (v) { return v >= 100; })) {
      var today = new Date().toISOString().slice(0, 10) + '_' + dayKey;
      try {
        if (localStorage.getItem(GOLDEN_KEY) === today) return;
        localStorage.setItem(GOLDEN_KEY, today);
      } catch (_) {}
      setTimeout(function () { showMotivationBanner(100, true); }, 1100);
    }
  }

  window.HT_SFX = {
    play: play,
    showMotivationBanner: showMotivationBanner,
    checkGoldenDay: checkGoldenDay,
  };
})();
