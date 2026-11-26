(function () {
  const stage = document.getElementById('hub-stage');
  const tabBtns = [...document.querySelectorAll('#hub-tabs .tab-btn')];
  let currentTab = 'map';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function speak(text, rate = 0.95) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text || ''));
      u.lang = 'en-US';
      u.rate = rate;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }
  function stopSpeak() {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
  }

  function normEng(s) {
    return String(s || '')
      .replace(/[’‘`´ʻʼ]/g, "'")
      .replace(/\bcan't\b/gi, 'cannot')
      .replace(/\bwon't\b/gi, 'will not')
      .replace(/\b(\w+)n't\b/gi, '$1 not')
      .replace(/\bi'm\b/gi, 'i am')
      .replace(/\b(\w+)'re\b/gi, '$1 are')
      .replace(/\b(\w+)'ve\b/gi, '$1 have')
      .replace(/\b(\w+)'ll\b/gi, '$1 will')
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // -------------------- 1. MAP LABELING --------------------
  let mapIdx = 0;
  let mapAns = {};
  let mapChecked = false;
  let mapShowScript = false;

  function renderMap() {
    const m = window.HT_MAPS[mapIdx];
    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">${esc(m.level)}</span>
          <h3 style="margin-top:8px;font-size:21px;">🗺️ ${esc(m.title)}</h3>
          <div style="font-size:13px;color:var(--muted);">${esc(m.subtitle)}</div>
        </div>
        <div style="display:flex;gap:6px;">
          ${window.HT_MAPS.map((x, i) => `<button class="btn btn-sm ${i === mapIdx ? 'btn-primary' : 'btn-ghost'}" data-map-switch="${i}">Xarita ${i + 1}</button>`).join('')}
        </div>
      </div>

      <div class="audio-bar">
        <button class="btn btn-primary btn-sm" id="map-play">🔊 Audioni tinglash (1×)</button>
        <button class="btn btn-ghost btn-sm" id="map-slow">🐢 Sekin (0.8×)</button>
        <button class="btn btn-ghost btn-sm" id="map-stop">⏹ To‘xtatish</button>
        <button class="btn btn-ghost btn-sm" id="map-script-btn">${mapShowScript ? '🙈 Matnni yashirish' : '📄 Audio matni'}</button>
      </div>
      ${mapShowScript ? `<div class="passage" style="font-size:14px;">${esc(m.script)}</div>` : ''}

      <div class="map-layout">
        <div>${m.svg}</div>
        <div>
          ${m.questions.map((q, qi) => {
            const pick = mapAns[qi];
            const ok = mapChecked && pick === q.ans;
            return `
              <div class="q-item">
                <div class="q-label">${esc(q.label)}</div>
                <div class="opt-row">
                  ${m.options.map((op) => {
                    let cls = 'opt-btn';
                    if (mapChecked) {
                      if (op === q.ans) cls += ' right';
                      else if (op === pick) cls += ' wrong';
                    } else if (op === pick) cls += ' selected';
                    return `<button class="${cls}" data-map-q="${qi}" data-map-op="${op}">${op}</button>`;
                  }).join('')}
                </div>
                ${mapChecked ? `<div class="fb-box ${ok ? 'ok' : 'no'}"><b>${ok ? '✅ To‘g‘ri!' : `❌ To‘g‘ri javob: ${q.ans}`}</b> — ${esc(q.exp)}</div>` : ''}
              </div>
            `;
          }).join('')}
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="btn btn-primary" id="map-check">Tekshirish ✓</button>
            <button class="btn btn-ghost" id="map-reset">🔄 Qayta</button>
          </div>
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-map-switch]').forEach((b) => b.onclick = () => {
      stopSpeak(); mapIdx = Number(b.dataset.mapSwitch); mapAns = {}; mapChecked = false; mapShowScript = false; renderMap();
    });
    stage.querySelector('#map-play').onclick = () => speak(m.script, 0.95);
    stage.querySelector('#map-slow').onclick = () => speak(m.script, 0.78);
    stage.querySelector('#map-stop').onclick = stopSpeak;
    stage.querySelector('#map-script-btn').onclick = () => { mapShowScript = !mapShowScript; renderMap(); };
    stage.querySelectorAll('[data-map-q]').forEach((b) => b.onclick = () => {
      if (mapChecked) return;
      mapAns[Number(b.dataset.mapQ)] = b.dataset.mapOp;
      renderMap();
    });
    stage.querySelector('#map-check').onclick = () => { mapChecked = true; renderMap(); };
    stage.querySelector('#map-reset').onclick = () => { mapAns = {}; mapChecked = false; renderMap(); };
  }

  // -------------------- 2. CEFR DICTATION --------------------
  let dicLv = 'ALL';
  let dicIdx = 0;
  let dicTyped = '';
  let dicRes = null;

  function renderDictation() {
    const pool = dicLv === 'ALL' ? window.HT_DICTATION : window.HT_DICTATION.filter((d) => d.lv === dicLv);
    const cur = pool[dicIdx % pool.length];
    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <h3 style="font-size:21px;">✍️ CEFR Dictation (${(dicIdx % pool.length) + 1} / ${pool.length})</h3>
          <div style="font-size:13px;color:var(--muted);">Audioni tinglang va eshitgan gapingizni yozing (kichik harf/nuqta uchun xato demaydi).</div>
        </div>
        <div style="display:flex;gap:6px;">
          ${['ALL', 'A1-A2', 'B1', 'B2-C1'].map((lv) => `<button class="btn btn-sm ${dicLv === lv ? 'btn-primary' : 'btn-ghost'}" data-dlv="${lv}">${lv === 'ALL' ? 'Hammasi' : lv}</button>`).join('')}
        </div>
      </div>

      <div class="audio-bar">
        <span class="pill">${esc(cur.lv)}</span>
        <button class="btn btn-primary btn-sm" id="dic-play">🔊 Tinglash (1×)</button>
        <button class="btn btn-ghost btn-sm" id="dic-slow">🐢 Sekin (0.75×)</button>
      </div>

      <textarea class="input-box" id="dic-inp" rows="2" placeholder="Eshitgan inglizcha gapingizni shu yerga yozing...">${esc(dicTyped)}</textarea>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
        <button class="btn btn-primary" id="dic-check">Tekshirish ✓</button>
        <button class="btn btn-ghost" id="dic-next">Keyingi gap →</button>
      </div>
      ${dicRes ? `
        <div class="fb-box ${dicRes.ok ? 'ok' : 'no'}" style="margin-top:14px;">
          <b>${dicRes.ok ? '✅ Ajoyib! 100% to‘g‘ri yozdingiz!' : '❌ Yana diqqat bilan tekshiring:'}</b><br/>
          <b>To‘g‘ri gap:</b> ${esc(cur.en)}<br/>
          <i>🇺🇿 ${esc(cur.uz)}</i>
        </div>
      ` : ''}
    `;

    stage.querySelectorAll('[data-dlv]').forEach((b) => b.onclick = () => {
      dicLv = b.dataset.dlv; dicIdx = 0; dicTyped = ''; dicRes = null; renderDictation();
    });
    stage.querySelector('#dic-play').onclick = () => speak(cur.en, 0.95);
    stage.querySelector('#dic-slow').onclick = () => speak(cur.en, 0.72);
    stage.querySelector('#dic-inp').oninput = (e) => { dicTyped = e.target.value; };
    stage.querySelector('#dic-check').onclick = () => {
      dicRes = { ok: normEng(dicTyped) === normEng(cur.en) };
      renderDictation();
    };
    stage.querySelector('#dic-next').onclick = () => {
      dicIdx = (dicIdx + 1) % pool.length; dicTyped = ''; dicRes = null; renderDictation();
    };
  }

  // -------------------- 3. MULTILEVEL LISTENING --------------------
  let lisIdx = 0, lisAns = {}, lisChecked = false, lisShowScript = false;
  function renderListening() {
    const item = window.HT_LISTENING[lisIdx];
    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">${esc(item.level)}</span>
          <h3 style="margin-top:8px;font-size:21px;">🎧 ${esc(item.title)}</h3>
        </div>
        <div style="display:flex;gap:6px;">
          ${window.HT_LISTENING.map((_, i) => `<button class="btn btn-sm ${i === lisIdx ? 'btn-primary' : 'btn-ghost'}" data-lis="${i}">Mashq ${i + 1}</button>`).join('')}
        </div>
      </div>
      <div class="audio-bar">
        <button class="btn btn-primary btn-sm" id="lis-play">🔊 Audioni tinglash</button>
        <button class="btn btn-ghost btn-sm" id="lis-slow">🐢 Sekin (0.8×)</button>
        <button class="btn btn-ghost btn-sm" id="lis-stop">⏹ To‘xtatish</button>
        <button class="btn btn-ghost btn-sm" id="lis-sc">${lisShowScript ? '🙈 Matnni yashirish' : '📄 Transcript'}</button>
      </div>
      ${lisShowScript ? `<div class="passage">${esc(item.script)}</div>` : ''}
      ${item.questions.map((q, qi) => {
        const pick = lisAns[qi];
        const ok = lisChecked && pick === q.ans;
        return `
          <div class="q-item">
            <div class="q-label">${esc(q.q)}</div>
            <div class="opt-row">
              ${q.opts.map((op, oi) => {
                let cls = 'opt-btn';
                if (lisChecked) {
                  if (oi === q.ans) cls += ' right';
                  else if (oi === pick) cls += ' wrong';
                } else if (oi === pick) cls += ' selected';
                return `<button class="${cls}" data-lq="${qi}" data-lo="${oi}">${esc(op)}</button>`;
              }).join('')}
            </div>
            ${lisChecked ? `<div class="fb-box ${ok ? 'ok' : 'no'}"><b>${ok ? '✅ To‘g‘ri!' : '❌ Xato:'}</b> ${esc(q.exp)}</div>` : ''}
          </div>
        `;
      }).join('')}
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-primary" id="lis-check">Tekshirish ✓</button>
        <button class="btn btn-ghost" id="lis-reset">🔄 Qayta</button>
      </div>
    `;
    stage.querySelectorAll('[data-lis]').forEach((b) => b.onclick = () => {
      stopSpeak(); lisIdx = Number(b.dataset.lis); lisAns = {}; lisChecked = false; lisShowScript = false; renderListening();
    });
    stage.querySelector('#lis-play').onclick = () => speak(item.script, 0.95);
    stage.querySelector('#lis-slow').onclick = () => speak(item.script, 0.78);
    stage.querySelector('#lis-stop').onclick = stopSpeak;
    stage.querySelector('#lis-sc').onclick = () => { lisShowScript = !lisShowScript; renderListening(); };
    stage.querySelectorAll('[data-lq]').forEach((b) => b.onclick = () => {
      if (lisChecked) return;
      lisAns[Number(b.dataset.lq)] = Number(b.dataset.lo); renderListening();
    });
    stage.querySelector('#lis-check').onclick = () => { lisChecked = true; renderListening(); };
    stage.querySelector('#lis-reset').onclick = () => { lisAns = {}; lisChecked = false; renderListening(); };
  }

  // -------------------- 4. CEFR & IELTS READING LIBRARY --------------------
  let rdIdx = 0, rdAns = {}, rdChecked = false, rdTrack = 'cefr', rdLib = 'intermediate';
  const RD_IELTS = [
    { id: 'starter', label: 'Starter', file: 'library/reading/starter.html' },
    { id: 'beginner', label: 'Beginner', file: 'library/reading/beginner.html' },
    { id: 'elementary', label: 'Elementary', file: 'library/reading/elementary.html' },
    { id: 'pre-intermediate', label: 'Pre-Int', file: 'library/reading/pre-intermediate.html' },
    { id: 'intermediate', label: 'Intermediate (50)', file: 'library/reading/intermediate.html' },
    { id: 'upper-intermediate', label: 'Upper-Int', file: 'library/reading/upper-intermediate.html' },
  ];
  const RD_CEFR = [
    { id: 'starter', label: 'Starter', file: 'library/cefr-reading/starter.html' },
    { id: 'elementary', label: 'Elementary', file: 'library/cefr-reading/elementary.html' },
    { id: 'pre-intermediate', label: 'Pre-Int', file: 'library/cefr-reading/pre-intermediate.html' },
    { id: 'intermediate', label: 'Intermediate', file: 'library/cefr-reading/intermediate.html' },
    { id: 'upper-intermediate', label: 'Upper-Int', file: 'library/cefr-reading/upper-intermediate.html' },
  ];
  function renderReading() {
    const list = rdTrack === 'ielts' ? RD_IELTS : RD_CEFR;
    const activeLib = rdTrack === 'quick' ? { id: 'quick', label: 'Tezkor CEFR', file: '' } : (list.find((x) => x.id === rdLib) || list[0]);
    const barHtml = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
        <div>
          <span class="pill">📖 CEFR / MULTILEVEL (5) + IELTS READING (6)</span>
          <h3 style="margin-top:8px;font-size:21px;">📖 ${rdTrack === 'ielts' ? 'IELTS Reading' : rdTrack === 'cefr' ? 'CEFR / Multilevel Reading' : 'Tezkor CEFR Reading'}: ${esc(activeLib.label)}</h3>
        </div>
        ${activeLib.file ? `<a class="btn btn-gold btn-sm" href="${activeLib.file}" target="_blank" rel="noopener">↗ To‘liq ekranda ochish</a>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        <button class="btn btn-sm ${rdTrack === 'cefr' ? 'btn-gold' : 'btn-ghost'}" data-rdtrack="cefr">🇺🇿 CEFR / Multilevel (5 daraja)</button>
        <button class="btn btn-sm ${rdTrack === 'ielts' ? 'btn-gold' : 'btn-ghost'}" data-rdtrack="ielts">🎓 IELTS Reading (6 daraja)</button>
        <button class="btn btn-sm ${rdTrack === 'quick' ? 'btn-gold' : 'btn-ghost'}" data-rdtrack="quick">⚡ Tezkor mashq</button>
      </div>
      ${rdTrack !== 'quick' ? `
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
          ${list.map((x) => `<button class="btn btn-sm ${x.id === activeLib.id ? 'btn-primary' : 'btn-ghost'}" data-rdlib="${x.id}">${esc(x.label)}</button>`).join('')}
        </div>
      ` : ''}
    `;
    if (activeLib.file) {
      stage.innerHTML = barHtml + `<iframe src="${activeLib.file}" title="Reading ${esc(activeLib.label)}" style="width:100%;height:760px;border:1px solid var(--border);border-radius:16px;background:#fff;"></iframe>`;
      stage.querySelectorAll('[data-rdtrack]').forEach((b) => b.onclick = () => { rdTrack = b.dataset.rdtrack; renderReading(); });
      stage.querySelectorAll('[data-rdtrack]').forEach((b) => b.onclick = () => { rdTrack = b.dataset.rdtrack; renderReading(); });
    stage.querySelectorAll('[data-rdlib]').forEach((b) => b.onclick = () => { rdLib = b.dataset.rdlib; renderReading(); });
      return;
    }

    const item = window.HT_READING[rdIdx];
    stage.innerHTML = barHtml + `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">${esc(item.level)}</span>
          <h3 style="margin-top:8px;font-size:19px;">${esc(item.title)}</h3>
        </div>
        <div style="display:flex;gap:6px;">
          ${window.HT_READING.map((_, i) => `<button class="btn btn-sm ${i === rdIdx ? 'btn-primary' : 'btn-ghost'}" data-rd="${i}">Matn ${i + 1}</button>`).join('')}
        </div>
      </div>
      <div class="passage">${esc(item.passage)}</div>
      ${item.questions.map((q, qi) => {
        const pick = rdAns[qi];
        const ok = rdChecked && pick === q.ans;
        return `
          <div class="q-item">
            <div class="q-label">${esc(q.q)}</div>
            <div class="opt-row">
              ${q.opts.map((op, oi) => {
                let cls = 'opt-btn';
                if (rdChecked) {
                  if (oi === q.ans) cls += ' right';
                  else if (oi === pick) cls += ' wrong';
                } else if (oi === pick) cls += ' selected';
                return `<button class="${cls}" data-rq="${qi}" data-ro="${oi}">${esc(op)}</button>`;
              }).join('')}
            </div>
            ${rdChecked ? `<div class="fb-box ${ok ? 'ok' : 'no'}">${esc(q.exp)}</div>` : ''}
          </div>
        `;
      }).join('')}
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-primary" id="rd-check">Tekshirish ✓</button>
        <button class="btn btn-ghost" id="rd-reset">🔄 Qayta</button>
      </div>
    `;
    stage.querySelectorAll('[data-rdtrack]').forEach((b) => b.onclick = () => { rdTrack = b.dataset.rdtrack; renderReading(); });
    stage.querySelectorAll('[data-rdlib]').forEach((b) => b.onclick = () => { rdLib = b.dataset.rdlib; renderReading(); });
    stage.querySelectorAll('[data-rd]').forEach((b) => b.onclick = () => {
      rdIdx = Number(b.dataset.rd); rdAns = {}; rdChecked = false; renderReading();
    });
    stage.querySelectorAll('[data-rq]').forEach((b) => b.onclick = () => {
      if (rdChecked) return;
      rdAns[Number(b.dataset.rq)] = Number(b.dataset.ro); renderReading();
    });
    stage.querySelector('#rd-check').onclick = () => { rdChecked = true; renderReading(); };
    stage.querySelector('#rd-reset').onclick = () => { rdAns = {}; rdChecked = false; renderReading(); };
  }

  // -------------------- 5. PLACEMENT TEST --------------------
  let plAns = {}, plChecked = false;
  function renderPlacement() {
    const total = window.HT_PLACEMENT.length;
    let score = 0;
    if (plChecked) window.HT_PLACEMENT.forEach((q, i) => { if (plAns[i] === q.ans) score++; });
    const estLevel = score >= 11 ? 'C1 (Advanced)' : score >= 9 ? 'B2 (Upper-Intermediate)' : score >= 6 ? 'B1 (Intermediate)' : score >= 3 ? 'A2 (Elementary)' : 'A1 (Beginner)';
    stage.innerHTML = `
      <h3 style="font-size:21px;margin-bottom:4px;">🧪 2 Daqiqalik Daraja Aniqlash Testi (A1 → C1)</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;">12 ta savolni yeching va o‘z darajangizni darhol bilib oling.</p>
      ${plChecked ? `
        <div class="fb-box ok" style="margin-bottom:16px;font-size:15px;">
          🏆 <b>Natijangiz: ${score} / ${total}</b> — Taxminiy darajangiz: <b style="color:#fbbf24;">${estLevel}</b>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center;">
            <input class="input-box" id="cert-name" style="max-width:240px;padding:8px 12px;font-size:13px;" placeholder="Sertifikat uchun ismingiz..." />
            <button class="btn btn-gold btn-sm" id="cert-dl">📜 HD Sertifikat yuklab olish (PNG)</button>
            <a href="#enroll" class="btn btn-primary btn-sm">🎁 Bepul 1-dars</a>
          </div>
        </div>
      ` : ''}
      ${window.HT_PLACEMENT.map((q, qi) => `
        <div class="q-item">
          <div class="q-label"><span style="color:var(--gold);margin-right:6px;">[${q.lv}]</span>${esc(q.q)}</div>
          <div class="opt-row">
            ${q.opts.map((op, oi) => {
              let cls = 'opt-btn';
              if (plChecked) {
                if (oi === q.ans) cls += ' right';
                else if (oi === plAns[qi]) cls += ' wrong';
              } else if (oi === plAns[qi]) cls += ' selected';
              return `<button class="${cls}" data-pq="${qi}" data-po="${oi}">${esc(op)}</button>`;
            }).join('')}
          </div>
        </div>
      `).join('')}
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-primary" id="pl-check">Darajamni aniqlash 🏆</button>
        <button class="btn btn-ghost" id="pl-reset">🔄 Qayta</button>
      </div>
    `;
    stage.querySelectorAll('[data-pq]').forEach((b) => b.onclick = () => {
      if (plChecked) return;
      plAns[Number(b.dataset.pq)] = Number(b.dataset.po); renderPlacement();
    });
    stage.querySelector('#pl-check').onclick = () => { plChecked = true; renderPlacement(); };
    stage.querySelector('#pl-reset').onclick = () => { plAns = {}; plChecked = false; renderPlacement(); };
    const dlBtn = stage.querySelector('#cert-dl');
    if (dlBtn) {
      dlBtn.onclick = () => {
        const nm = (stage.querySelector('#cert-name').value || '').trim() || 'Husanboy Teacher O‘quvchisi';
        downloadCertPng(nm, estLevel, `${score} / ${total}`);
      };
    }
  }

  function downloadCertPng(studentName, levelLabel, scoreText) {
    const c = document.createElement('canvas');
    c.width = 1080; c.height = 1350;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 1080, 1350);
    g.addColorStop(0, '#04091a'); g.addColorStop(0.55, '#0B2A4A'); g.addColorStop(1, '#064e3b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1350);
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 10; ctx.strokeRect(48, 48, 984, 1254);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6ee7b7'; ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText('HUSANBOY TEACHER • OPEN CEFR PLATFORM', 540, 170);
    ctx.fillStyle = '#fbbf24'; ctx.font = '900 68px system-ui, sans-serif';
    ctx.fillText('DARAJA SERTIFIKATI', 540, 285);
    ctx.font = '130px system-ui, sans-serif'; ctx.fillText('🎓', 540, 460);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 56px system-ui, sans-serif';
    ctx.fillText(studentName.slice(0, 28), 540, 600);
    ctx.fillStyle = '#fde68a'; ctx.font = 'bold 46px system-ui, sans-serif';
    ctx.fillText(levelLabel, 540, 690);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(180, 760, 720, 170);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText(`Natija: ${scoreText}`, 540, 845);
    ctx.fillStyle = '#a7f3d0'; ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 540, 905);
    ctx.fillStyle = '#6ee7b7'; ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.fillText('📢 @xusanboy_teacher  •  🤖 @Husanboy_Teacher_Assisstant_bot', 540, 1210);
    const a = document.createElement('a');
    a.download = `Husanboy_Teacher_Sertifikat.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  }

  // -------------------- 8. MULTILEVEL & IELTS WRITING LIBRARY --------------------
  let wrIdx = 0, wrText = '', wrShowModel = false, wrTimerSec = 40 * 60, wrInterval = null, wrLib = 'multilevel';
  const WR_LIBS = [
    { id: 'starter', label: 'Starter', file: 'library/writing/starter.html' },
    { id: 'elementary', label: 'Elementary', file: 'library/writing/elementary.html' },
    { id: 'pre-intermediate', label: 'Pre-Int', file: 'library/writing/pre-intermediate.html' },
    { id: 'intermediate', label: 'Intermediate', file: 'library/writing/intermediate.html' },
    { id: 'upper-intermediate', label: 'Upper-Int', file: 'library/writing/upper-intermediate.html' },
    { id: 'multilevel', label: 'Multilevel Full', file: 'library/writing/multilevel.html' },
    { id: 'quick', label: 'Tezkor Lab', file: '' },
  ];
  function renderWriting() {
    const activeW = WR_LIBS.find((x) => x.id === wrLib) || WR_LIBS[5];
    const barHtml = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">📝 IELTS & MULTILEVEL WRITING KUTUBXONASI • 6 DARAJA</span>
          <h3 style="margin-top:8px;font-size:21px;">📝 Writing: ${esc(activeW.label)}</h3>
        </div>
        ${activeW.file ? `<a class="btn btn-gold btn-sm" href="${activeW.file}" target="_blank" rel="noopener">↗ To‘liq ekranda ochish</a>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
        ${WR_LIBS.map((x) => `<button class="btn btn-sm ${x.id === wrLib ? 'btn-primary' : 'btn-ghost'}" data-wrlib="${x.id}">${esc(x.label)}</button>`).join('')}
      </div>
    `;
    if (activeW.file) {
      stage.innerHTML = barHtml + `<iframe src="${activeW.file}" title="IELTS Writing ${esc(activeW.label)}" style="width:100%;height:760px;border:1px solid var(--border);border-radius:16px;background:#fff;"></iframe>`;
      stage.querySelectorAll('[data-wrlib]').forEach((b) => b.onclick = () => { wrLib = b.dataset.wrlib; renderWriting(); });
      return;
    }

    const w = window.HT_WRITING[wrIdx];
    const words = wrText.trim() ? wrText.trim().split(/\s+/).length : 0;
    const pct = Math.min(100, Math.round((words / w.minWords) * 100));
    const mm = String(Math.floor(wrTimerSec / 60)).padStart(2, '0');
    const ss = String(wrTimerSec % 60).padStart(2, '0');
    stage.innerHTML = barHtml + `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">${esc(w.task)}</span>
          <h3 style="margin-top:8px;font-size:19px;">${esc(w.title)}</h3>
        </div>
        <div style="display:flex;gap:6px;">
          ${window.HT_WRITING.map((x, i) => `<button class="btn btn-sm ${i === wrIdx ? 'btn-primary' : 'btn-ghost'}" data-wr="${i}">Task ${i + 1}</button>`).join('')}
        </div>
      </div>
      <div class="passage" style="white-space:pre-line;font-size:14px;">${esc(w.prompt)}</div>
      <div class="audio-bar" style="justify-content:space-between;">
        <div style="display:flex;gap:8px;align-items:center;">
          <b>⏱ ${mm}:${ss}</b>
          <button class="btn btn-primary btn-sm" id="wr-tbtn">${wrInterval ? '⏸ Pauza' : '▶ Taymer'}</button>
          <button class="btn btn-ghost btn-sm" id="wr-treset">🔄</button>
        </div>
        <div>
          <b style="color:${words >= w.minWords ? '#6ee7b7' : '#fbbf24'};">${words} / ${w.minWords}+ so‘z (${pct}%)</b>
        </div>
      </div>
      <div style="margin-bottom:10px;display:flex;flex-wrap:wrap;gap:6px;">
        ${window.HT_LINKING_WORDS.map((lw) => `<button class="opt-btn" style="font-size:12px;padding:6px 10px;" title="${esc(lw.uz)}" data-lw="${esc(lw.en)}">+ ${esc(lw.en)}</button>`).join('')}
      </div>
      <textarea class="input-box" id="wr-area" rows="8" placeholder="Inshoingizni ingliz tilida shu yerga yozing...">${esc(wrText)}</textarea>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
        <button class="btn btn-gold btn-sm" id="wr-model-btn">${wrShowModel ? '🙈 Namuna inshoni yashirish' : '⭐ Band 8.0 Namuna inshoni ko‘rish'}</button>
        <button class="btn btn-ghost btn-sm" id="wr-say">🔊 Namuna inshoni eshitish</button>
      </div>
      ${wrShowModel ? `<div class="fb-box ok" style="margin-top:12px;white-space:pre-line;"><b>⭐ Band 8.0 Model Answer:</b>\n\n${esc(w.model)}</div>` : ''}
    `;
    stage.querySelectorAll('[data-wrlib]').forEach((b) => b.onclick = () => { wrLib = b.dataset.wrlib; renderWriting(); });
    stage.querySelectorAll('[data-wr]').forEach((b) => b.onclick = () => { wrIdx = Number(b.dataset.wr); wrShowModel = false; renderWriting(); });
    stage.querySelector('#wr-area').oninput = (e) => { wrText = e.target.value; renderWriting(); const a = stage.querySelector('#wr-area'); a.focus(); a.setSelectionRange(a.value.length, a.value.length); };
    stage.querySelectorAll('[data-lw]').forEach((b) => b.onclick = () => { wrText = (wrText ? wrText + ' ' : '') + b.dataset.lw + ' '; renderWriting(); });
    stage.querySelector('#wr-model-btn').onclick = () => { wrShowModel = !wrShowModel; renderWriting(); };
    stage.querySelector('#wr-say').onclick = () => speak(w.model, 0.92);
    stage.querySelector('#wr-tbtn').onclick = () => {
      if (wrInterval) { clearInterval(wrInterval); wrInterval = null; renderWriting(); return; }
      wrInterval = setInterval(() => { if (wrTimerSec > 0) wrTimerSec--; else { clearInterval(wrInterval); wrInterval = null; } if (currentTab === 'writing') renderWriting(); }, 1000);
      renderWriting();
    };
    stage.querySelector('#wr-treset').onclick = () => { if (wrInterval) { clearInterval(wrInterval); wrInterval = null; } wrTimerSec = 40 * 60; renderWriting(); };
  }

  // -------------------- 9. MULTILEVEL SPEAKING SIMULATOR --------------------
  let spIdx = 0, spShowModel = false, spRec = null, spAudioUrl = '', spRecording = false, spSec = 0, spTimer = null, spLib = 'multilevel40';
  const SP_LIBS = [
    { id: 'multilevel40', label: '🎤 Multilevel 40 Savol', file: 'library/speaking/multilevel-40.html' },
    { id: 'suhbat500', label: '💬 500 ta Suhbat', file: 'library/speaking/suhbat-500.html' },
    { id: 'sim', label: '🎙️ Ovoz Yozish Lab', file: '' },
  ];
  function renderSpeaking() {
    const activeS = SP_LIBS.find((x) => x.id === spLib) || SP_LIBS[0];
    const topBar = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">🎙️ SPEAKING & JONLI MULOQOT MARKAZI</span>
          <h3 style="margin-top:8px;font-size:21px;">${esc(activeS.label)}</h3>
        </div>
        ${activeS.file ? `<a class="btn btn-gold btn-sm" href="${activeS.file}" target="_blank" rel="noopener">↗ To‘liq ekranda ochish</a>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
        ${SP_LIBS.map((x) => `<button class="btn btn-sm ${x.id === spLib ? 'btn-primary' : 'btn-ghost'}" data-splib="${x.id}">${esc(x.label)}</button>`).join('')}
      </div>
    `;
    if (activeS.file) {
      stage.innerHTML = topBar + `<iframe src="${activeS.file}" title="${esc(activeS.label)}" style="width:100%;height:760px;border:1px solid var(--border);border-radius:16px;background:#fff;"></iframe>`;
      stage.querySelectorAll('[data-splib]').forEach((b) => b.onclick = () => { spLib = b.dataset.splib; renderSpeaking(); });
      return;
    }
    const s = window.HT_SPEAKING[spIdx];
    stage.innerHTML = topBar + `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">${esc(s.part)}</span>
          <h3 style="margin-top:8px;font-size:19px;">🎙️ ${esc(s.title)}</h3>
        </div>
        <div style="display:flex;gap:6px;">
          ${window.HT_SPEAKING.map((_, i) => `<button class="btn btn-sm ${i === spIdx ? 'btn-primary' : 'btn-ghost'}" data-sp="${i}">Part ${i + 1}</button>`).join('')}
        </div>
      </div>
      <div class="passage" style="white-space:pre-line;">${esc(s.cue.join('\n'))}</div>
      <div class="audio-bar">
        <button class="btn btn-ghost btn-sm" id="sp-prep">⏳ Tayyorlanish (${s.prepSec}s)</button>
        <button class="btn btn-primary btn-sm" id="sp-rec-btn">${spRecording ? '⏹ Yozishni to‘xtatish' : '🎤 Ovoz yozish (' + s.speakSec + 's)'}</button>
        ${spSec > 0 ? `<b style="color:var(--gold);">⏱ ${spSec}s</b>` : ''}
        <button class="btn btn-gold btn-sm" id="sp-mod-btn">${spShowModel ? '🙈 Namunani yashirish' : '⭐ Band 8.0 Namuna'}</button>
        <button class="btn btn-ghost btn-sm" id="sp-say">🔊 Namunani eshitish</button>
      </div>
      ${spAudioUrl ? `<div class="q-item"><div class="q-label">🎧 Sizning yozgan ovozingiz:</div><audio controls src="${spAudioUrl}" style="width:100%;"></audio></div>` : ''}
      ${spShowModel ? `<div class="fb-box ok"><b>⭐ Band 8.0 Namuna javob:</b><br/><br/>${esc(s.model)}</div>` : ''}
    `;
    stage.querySelectorAll('[data-splib]').forEach((b) => b.onclick = () => { spLib = b.dataset.splib; renderSpeaking(); });
    stage.querySelectorAll('[data-sp]').forEach((b) => b.onclick = () => { spIdx = Number(b.dataset.sp); spShowModel = false; spAudioUrl = ''; if (spTimer) clearInterval(spTimer); spSec = 0; renderSpeaking(); });
    stage.querySelector('#sp-mod-btn').onclick = () => { spShowModel = !spShowModel; renderSpeaking(); };
    stage.querySelector('#sp-say').onclick = () => speak(s.model, 0.94);
    stage.querySelector('#sp-prep').onclick = () => {
      if (spTimer) clearInterval(spTimer);
      spSec = s.prepSec;
      spTimer = setInterval(() => { spSec--; if (spSec <= 0) { clearInterval(spTimer); spTimer = null; } if (currentTab === 'speaking') renderSpeaking(); }, 1000);
      renderSpeaking();
    };
    stage.querySelector('#sp-rec-btn').onclick = async () => {
      if (spRecording && spRec) { spRec.stop(); spRecording = false; if (spTimer) { clearInterval(spTimer); spTimer = null; } return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks = [];
        spRec = new MediaRecorder(stream);
        spRec.ondataavailable = (ev) => chunks.push(ev.data);
        spRec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          spAudioUrl = URL.createObjectURL(new Blob(chunks, { type: spRec.mimeType || 'audio/webm' }));
          spRecording = false;
          renderSpeaking();
        };
        spRec.start();
        spRecording = true;
        spSec = s.speakSec;
        if (spTimer) clearInterval(spTimer);
        spTimer = setInterval(() => { spSec--; if (spSec <= 0 && spRec && spRecording) { spRec.stop(); clearInterval(spTimer); } if (currentTab === 'speaking') renderSpeaking(); }, 1000);
        renderSpeaking();
      } catch (_) {
        alert('Mikrofonga ruxsat berilmadi. Brauzer sozlamasidan mikrofonni yoqing.');
      }
    };
  }

  // -------------------- 10. CEFR / MULTILEVEL BALL KALKULYATORI --------------------
  let calc = { l: 55, r: 58, w: 52, s: 56 };
  function renderCalc() {
    const avg = Math.round(((Number(calc.l) || 0) + (Number(calc.r) || 0) + (Number(calc.w) || 0) + (Number(calc.s) || 0)) / 4);
    const level = avg >= 65 ? 'C1 (Advanced — 100% DTM imtiyoz! 🏆)' : avg >= 51 ? 'B2 (Upper-Intermediate — 100% DTM imtiyoz! ✅)' : avg >= 38 ? 'B1 (Intermediate — B2 uchun ' + (51 - avg) + ' ball qoldi)' : 'A2 / Boshlang‘ich (B1 uchun ' + (38 - avg) + ' ball qoldi)';
    stage.innerHTML = `
      <h3 style="font-size:21px;margin-bottom:4px;">🧮 CEFR / Multilevel Ball Kalkulyatori (0–75)</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;">Har bir ko‘nikma ballini kiriting — umumiy Multilevel darajangiz va DTM imtiyoz holati darhol hisoblanadi.</p>
      <div class="grid-2" style="margin-bottom:14px;">
        ${[['l', '🎧 Listening (0–75)'], ['r', '📖 Reading (0–75)'], ['w', '📝 Writing (0–75)'], ['s', '🎙️ Speaking (0–75)']].map(([k, lb]) => `
          <div class="q-item" style="margin:0;">
            <div class="q-label">${lb}</div>
            <input type="number" min="0" max="75" class="input-box" data-ck="${k}" value="${calc[k]}" />
          </div>
        `).join('')}
      </div>
      <div class="fb-box ${avg >= 51 ? 'ok' : 'no'}" style="font-size:16px;">
        📊 <b>Umumiy o‘rtacha ball:</b> <b style="color:#fbbf24;font-size:22px;">${avg} / 75</b><br/>
        🎓 <b>Daraja:</b> <b>${level}</b>
      </div>
    `;
    stage.querySelectorAll('[data-ck]').forEach((inp) => inp.oninput = (e) => {
      calc[inp.dataset.ck] = Math.max(0, Math.min(75, Number(e.target.value) || 0));
      renderCalc();
      const el = stage.querySelector(`[data-ck="${inp.dataset.ck}"]`);
      el.focus();
    });
  }

  // -------------------- PDF / CHOP ETISH HELPER --------------------
  function printCheatSheet(title, bodyHtml) {
    const w = window.open('', '_blank', 'width=920,height=760');
    if (!w) { alert('Brauzer pop-up oynasini blokladi. Ruxsat bering.'); return; }
    w.document.write(`<!doctype html><html lang="uz"><head><meta charset="UTF-8"/><title>${esc(title)} — Husanboy Teacher</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;padding:28px 34px;line-height:1.5;}
        .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0B2A4A;padding-bottom:12px;margin-bottom:20px;}
        .hdr h1{font-size:22px;margin:0;color:#0B2A4A;}
        .hdr .brand{font-size:13px;font-weight:700;color:#047857;}
        table{width:100%;border-collapse:collapse;font-size:13px;}
        th,td{border:1px solid #cbd5e1;padding:7px 10px;text-align:left;}
        th{background:#f1f5f9;color:#0B2A4A;}
        .card{border:1px solid #cbd5e1;border-radius:10px;padding:12px 14px;margin-bottom:10px;page-break-inside:avoid;}
        .ftr{margin-top:22px;padding-top:10px;border-top:1px solid #cbd5e1;font-size:12px;color:#475569;text-align:center;}
      </style></head><body>
      <div class="hdr"><h1>${esc(title)}</h1><div class="brand">Husanboy Teacher • @xusanboy_teacher</div></div>
      ${bodyHtml}
      <div class="ftr">Husanboy Teacher — Open CEFR & Multilevel Platform • 📢 @xusanboy_teacher • 🤖 @Husanboy_Teacher_Assisstant_bot</div>
      <script>window.onload=function(){window.print();};</script>
      </body></html>`);
    w.document.close();
  }

  // -------------------- 6. IRREGULAR VERBS --------------------
  let verbQuery = '';
  function renderVerbs() {
    const q = verbQuery.toLowerCase().trim();
    const list = q
      ? window.HT_IRREGULAR_VERBS.filter((v) => v.some((x) => x.toLowerCase().includes(q)))
      : window.HT_IRREGULAR_VERBS;
    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <h3 style="font-size:21px;">⚡ Noto‘g‘ri Fe’llar (${list.length} ta)</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <input class="input-box" id="verb-search" style="max-width:260px;" placeholder="Qidirish (go, went, bormoq)..." value="${esc(verbQuery)}" />
          <button class="btn btn-gold btn-sm" id="verb-pdf">📄 PDF / Chop etish</button>
        </div>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>V1 (Asosiy)</th><th>V2 (O‘tgan)</th><th>V3 (Sifatdosh)</th><th>O‘zbekcha</th><th>Ovoz</th></tr></thead>
          <tbody>
            ${list.map(([v1, v2, v3, uz]) => `
              <tr>
                <td><b>${esc(v1)}</b></td>
                <td>${esc(v2)}</td>
                <td>${esc(v3)}</td>
                <td style="color:#cbd5e1;">${esc(uz)}</td>
                <td><button class="btn btn-ghost btn-sm" data-say="${esc(v1 + ', ' + v2.split('/')[0] + ', ' + v3.split('/')[0])}">🔊</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    const inp = stage.querySelector('#verb-search');
    inp.oninput = (e) => { verbQuery = e.target.value; renderVerbs(); const n = stage.querySelector('#verb-search'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
    stage.querySelectorAll('[data-say]').forEach((b) => b.onclick = () => speak(b.dataset.say, 0.85));
    stage.querySelector('#verb-pdf').onclick = () => {
      const rows = list.map(([v1, v2, v3, uz]) => `<tr><td><b>${esc(v1)}</b></td><td>${esc(v2)}</td><td>${esc(v3)}</td><td>${esc(uz)}</td></tr>`).join('');
      printCheatSheet(`Noto‘g‘ri Fe’llar Jadvali (${list.length} ta)`, `<table><thead><tr><th>V1</th><th>V2</th><th>V3</th><th>O‘zbekcha</th></tr></thead><tbody>${rows}</tbody></table>`);
    };
  }

  // -------------------- 7. 12 TENSES --------------------
  function renderTenses() {
    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <h3 style="font-size:21px;">🧭 Ingliz tilidagi 12 ta Zamon Shpargalkasi</h3>
        <button class="btn btn-gold btn-sm" id="tense-pdf">📄 PDF / Chop etish</button>
      </div>
      <div class="grid-2">
        ${window.HT_TENSES.map((t) => `
          <div class="q-item" style="margin:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <b style="font-size:16px;color:var(--gold);">${esc(t.name)}</b>
              <button class="btn btn-ghost btn-sm" data-tsay="${esc(t.ex)}">🔊 Misol</button>
            </div>
            <div style="margin:6px 0;font-family:monospace;font-size:14px;color:#6ee7b7;font-weight:800;">${esc(t.formula)}</div>
            <div style="font-size:13px;color:#e2e8f0;">📌 ${esc(t.use)}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px;">🔑 Kalit so‘zlar: <i>${esc(t.signals)}</i></div>
            <div style="font-size:13px;color:#93c5fd;margin-top:6px;">💬 «${esc(t.ex)}»</div>
          </div>
        `).join('')}
      </div>
    `;
    stage.querySelectorAll('[data-tsay]').forEach((b) => b.onclick = () => speak(b.dataset.tsay, 0.92));
    stage.querySelector('#tense-pdf').onclick = () => {
      const cards = window.HT_TENSES.map((t) => `<div class="card"><b>${esc(t.name)}</b> — <code>${esc(t.formula)}</code><br/>📌 ${esc(t.use)}<br/>🔑 <i>${esc(t.signals)}</i><br/>💬 «${esc(t.ex)}»</div>`).join('');
      printCheatSheet('Ingliz tilidagi 12 ta Zamon Shpargalkasi', cards);
    };
  }

  // -------------------- 11. 15-DAQIQALIK CEFR MINI-MOCK --------------------
  let mkStarted = false, mkFinished = false, mkSec = 15 * 60, mkTimer = null, mkAns = {}, mkShowScript = false;
  function buildMockQuestions() {
    const l0 = window.HT_LISTENING[0];
    const r0 = window.HT_READING[0];
    const gqs = window.HT_PLACEMENT.slice(4, 8);
    const out = [];
    l0.questions.slice(0, 3).forEach((q, i) => out.push({ sec: '🎧 Listening', q: q.q, opts: q.opts, ans: q.ans, exp: q.exp, key: 'l' + i }));
    r0.questions.slice(0, 3).forEach((q, i) => out.push({ sec: '📖 Reading', q: q.q, opts: q.opts, ans: q.ans, exp: q.exp, key: 'r' + i }));
    gqs.forEach((q, i) => out.push({ sec: '⚡ CEFR Grammar [' + q.lv + ']', q: q.q, opts: q.opts, ans: q.ans, exp: 'To‘g‘ri variant: ' + q.opts[q.ans], key: 'g' + i }));
    return out;
  }
  function renderMiniMock() {
    const l0 = window.HT_LISTENING[0];
    const r0 = window.HT_READING[0];
    const qs = buildMockQuestions();
    const mm = String(Math.floor(mkSec / 60)).padStart(2, '0');
    const ss = String(mkSec % 60).padStart(2, '0');

    if (!mkStarted) {
      stage.innerHTML = `
        <span class="pill">⏱ 15 DAQIQA • 10 SAVOL • CEFR</span>
        <h3 style="font-size:22px;margin:10px 0 6px;">⏱ 15-daqiqalik CEFR Mini-Mock Imtihoni</h3>
        <p style="font-size:14px;color:var(--muted);margin-bottom:16px;">Haqiqiy Multilevel/CEFR muhitida o‘zingizni sinab ko‘ring: <b>3 ta Listening</b> + <b>3 ta Reading</b> + <b>4 ta Grammar</b> savoli. Yakunda darajangiz va HD sertifikatingiz chiqadi.</p>
        <button class="btn btn-primary" id="mk-start">▶ Imtihonni boshlash (15:00)</button>
      `;
      stage.querySelector('#mk-start').onclick = () => {
        mkStarted = true; mkFinished = false; mkSec = 15 * 60; mkAns = {}; mkShowScript = false;
        if (mkTimer) clearInterval(mkTimer);
        mkTimer = setInterval(() => {
          if (mkSec > 0) mkSec--;
          else { clearInterval(mkTimer); mkTimer = null; mkFinished = true; }
          if (currentTab === 'mock') renderMiniMock();
        }, 1000);
        renderMiniMock();
      };
      return;
    }

    let score = 0;
    if (mkFinished) qs.forEach((q, i) => { if (mkAns[i] === q.ans) score++; });
    const lv = score >= 9 ? 'C1 (Advanced)' : score >= 7 ? 'B2 (Upper-Intermediate)' : score >= 5 ? 'B1 (Intermediate)' : score >= 3 ? 'A2 (Elementary)' : 'A1 (Beginner)';

    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">⏱ CEFR MINI-MOCK</span>
          <h3 style="font-size:21px;margin-top:6px;">Listening + Reading + Grammar (10 savol)</h3>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <b style="font-size:18px;color:${mkSec <= 120 ? '#fca5a5' : '#fbbf24'};">⏱ ${mm}:${ss}</b>
          <button class="btn btn-ghost btn-sm" id="mk-reset">🔄 Qayta</button>
        </div>
      </div>

      ${mkFinished ? `
        <div class="fb-box ok" style="margin-bottom:16px;font-size:15px;">
          🏆 <b>Mini-Mock Natijasi: ${score} / ${qs.length}</b> — Taxminiy daraja: <b style="color:#fbbf24;">${lv}</b>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center;">
            <input class="input-box" id="mk-cert-name" style="max-width:240px;padding:8px 12px;font-size:13px;" placeholder="Sertifikat uchun ismingiz..." />
            <button class="btn btn-gold btn-sm" id="mk-cert-dl">📜 HD Sertifikat yuklab olish (PNG)</button>
          </div>
        </div>
      ` : ''}

      <div class="audio-bar">
        <button class="btn btn-primary btn-sm" id="mk-play">🔊 Listening Audioni tinglash</button>
        <button class="btn btn-ghost btn-sm" id="mk-slow">🐢 Sekin (0.8×)</button>
        <button class="btn btn-ghost btn-sm" id="mk-stop">⏹ To‘xtatish</button>
        ${mkFinished ? `<button class="btn btn-ghost btn-sm" id="mk-sc">${mkShowScript ? '🙈 Transcript yashirish' : '📄 Listening matni'}</button>` : ''}
      </div>
      ${mkFinished && mkShowScript ? `<div class="passage" style="font-size:13px;">${esc(l0.script)}</div>` : ''}

      <div class="passage" style="font-size:14px;"><b>📖 Reading Matni (${esc(r0.title)}):</b><br/><br/>${esc(r0.passage)}</div>

      ${qs.map((q, qi) => {
        const pick = mkAns[qi];
        const ok = mkFinished && pick === q.ans;
        return `
          <div class="q-item">
            <div class="q-label"><span style="color:var(--gold);margin-right:6px;">${qi + 1}. [${esc(q.sec)}]</span>${esc(q.q)}</div>
            <div class="opt-row">
              ${q.opts.map((op, oi) => {
                let cls = 'opt-btn';
                if (mkFinished) {
                  if (oi === q.ans) cls += ' right';
                  else if (oi === pick) cls += ' wrong';
                } else if (oi === pick) cls += ' selected';
                return `<button class="${cls}" data-mq="${qi}" data-mo="${oi}">${esc(op)}</button>`;
              }).join('')}
            </div>
            ${mkFinished ? `<div class="fb-box ${ok ? 'ok' : 'no'}">${ok ? '✅ To‘g‘ri!' : '❌ Xato:'} ${esc(q.exp)}</div>` : ''}
          </div>
        `;
      }).join('')}

      ${!mkFinished ? `<button class="btn btn-primary" id="mk-finish">Imtihonni yakunlash va tekshirish ✓</button>` : ''}
    `;

    stage.querySelector('#mk-play').onclick = () => speak(l0.script, 0.95);
    stage.querySelector('#mk-slow').onclick = () => speak(l0.script, 0.78);
    stage.querySelector('#mk-stop').onclick = stopSpeak;
    const scBtn = stage.querySelector('#mk-sc');
    if (scBtn) scBtn.onclick = () => { mkShowScript = !mkShowScript; renderMiniMock(); };
    stage.querySelectorAll('[data-mq]').forEach((b) => b.onclick = () => {
      if (mkFinished) return;
      mkAns[Number(b.dataset.mq)] = Number(b.dataset.mo); renderMiniMock();
    });
    const finBtn = stage.querySelector('#mk-finish');
    if (finBtn) finBtn.onclick = () => {
      if (mkTimer) { clearInterval(mkTimer); mkTimer = null; }
      mkFinished = true; renderMiniMock();
    };
    stage.querySelector('#mk-reset').onclick = () => {
      if (mkTimer) { clearInterval(mkTimer); mkTimer = null; }
      stopSpeak(); mkStarted = false; mkFinished = false; mkSec = 15 * 60; mkAns = {}; renderMiniMock();
    };
    const dlBtn = stage.querySelector('#mk-cert-dl');
    if (dlBtn) {
      dlBtn.onclick = () => {
        const nm = (stage.querySelector('#mk-cert-name').value || '').trim() || 'Husanboy Teacher O‘quvchisi';
        downloadCertPng(nm, `Mini-Mock • ${lv}`, `${score} / ${qs.length}`);
      };
    }
  }

  // -------------------- 12. 60-SONIYALIK WORD SPRINT --------------------
  let spgActive = false, spgDone = false, spgSec = 60, spgTimer = null;
  let spgScore = 0, spgTotal = 0, spgCur = null, spgOpts = [], spgFlash = '';
  function getSprintBest() {
    try { return Number(localStorage.getItem('ht_sprint_best') || '0') || 0; } catch (_) { return 0; }
  }
  function saveSprintBest(val) {
    try { if (val > getSprintBest()) localStorage.setItem('ht_sprint_best', String(val)); } catch (_) {}
  }
  function pickNextSprintWord() {
    const pool = window.HT_WORD_SPRINT || [];
    const item = pool[Math.floor(Math.random() * pool.length)];
    spgCur = item;
    spgOpts = item.opts.map((t, i) => ({ text: t, ok: i === item.ans })).sort(() => Math.random() - 0.5);
  }
  function renderWordSprint() {
    const best = getSprintBest();
    if (!spgActive && !spgDone) {
      stage.innerHTML = `
        <span class="pill">🎮 60 SONIYA • TEZKOR SO‘Z O‘YINI</span>
        <h3 style="font-size:22px;margin:10px 0 6px;">🎮 60-soniyalik Word Sprint</h3>
        <p style="font-size:14px;color:var(--muted);margin-bottom:14px;">60 soniya ichida nechta inglizcha so‘z va iboraning tarjimasini to‘g‘ri topa olasiz? Shaxsiy rekordingiz avtomatik saqlanadi!</p>
        <div class="fb-box ok" style="margin-bottom:16px;">🏆 <b>Sizning shaxsiy rekordingiz:</b> <b style="color:#fbbf24;font-size:18px;">${best} ball</b></div>
        <button class="btn btn-primary" id="spg-start">🚀 O‘yinni boshlash (60s)</button>
      `;
      stage.querySelector('#spg-start').onclick = () => {
        spgActive = true; spgDone = false; spgSec = 60; spgScore = 0; spgTotal = 0; spgFlash = '';
        pickNextSprintWord();
        if (spgTimer) clearInterval(spgTimer);
        spgTimer = setInterval(() => {
          spgSec--;
          if (spgSec <= 0) {
            clearInterval(spgTimer); spgTimer = null; spgActive = false; spgDone = true;
            saveSprintBest(spgScore);
          }
          if (currentTab === 'sprint') renderWordSprint();
        }, 1000);
        renderWordSprint();
      };
      return;
    }

    if (spgDone) {
      stage.innerHTML = `
        <span class="pill">🏁 VAQT TUGADI!</span>
        <h3 style="font-size:24px;margin:10px 0;">🏆 Natijangiz: <span style="color:#fbbf24;">${spgScore}</span> / ${spgTotal} to‘g‘ri</h3>
        <p style="font-size:15px;color:#a7f3d0;margin-bottom:16px;">Shaxsiy rekord: <b>${getSprintBest()} ball</b></p>
        <button class="btn btn-primary" id="spg-again">🔄 Yana o‘ynash (60s)</button>
      `;
      stage.querySelector('#spg-again').onclick = () => { spgDone = false; renderWordSprint(); };
      return;
    }

    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;">
        <span class="pill">⏱ ${spgSec} soniya</span>
        <div style="font-size:15px;"><b>✅ Ball: <span style="color:#6ee7b7;">${spgScore}</span></b> &nbsp;•&nbsp; 🏆 Rekord: <b style="color:#fbbf24;">${best}</b></div>
      </div>
      <div class="q-item" style="text-align:center;padding:24px 18px;">
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px;">TO‘G‘RI TARJIMANI TANLANG:</div>
        <div style="font-size:30px;font-weight:900;color:#ffffff;margin-bottom:10px;">${esc(spgCur.en)}</div>
        <button class="btn btn-ghost btn-sm" id="spg-say" style="margin-bottom:16px;">🔊 Talaffuzni eshitish</button>
        <div class="opt-row" style="justify-content:center;">
          ${spgOpts.map((o, i) => `<button class="opt-btn" style="font-size:15px;padding:12px 18px;" data-spgo="${i}">${esc(o.text)}</button>`).join('')}
        </div>
        ${spgFlash ? `<div style="margin-top:12px;font-size:14px;font-weight:700;color:${spgFlash.startsWith('✅') ? '#6ee7b7' : '#fca5a5'};">${esc(spgFlash)}</div>` : ''}
      </div>
    `;
    stage.querySelector('#spg-say').onclick = () => speak(spgCur.en, 0.92);
    stage.querySelectorAll('[data-spgo]').forEach((b) => b.onclick = () => {
      const picked = spgOpts[Number(b.dataset.spgo)];
      spgTotal++;
      if (picked.ok) { spgScore++; spgFlash = `✅ To‘g‘ri! (${spgCur.en})`; saveSprintBest(spgScore); addXp(5, 'Word Sprint'); }
      else { const right = spgOpts.find((x) => x.ok); spgFlash = `❌ ${spgCur.en} = ${right ? right.text : ''}`; sfx('wrong'); }
      pickNextSprintWord();
      renderWordSprint();
    });
  }

  // -------------------- XP ENGINE + SIGNATURE F-MAJOR MARIMBA SFX --------------------
  let sfxOn = (function () { try { return localStorage.getItem('ht_site_sfx') !== '0'; } catch (_) { return true; } })();
  let sfxCtx = null;
  function sfx(kind) {
    if (!sfxOn) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!sfxCtx) sfxCtx = new AC();
      if (sfxCtx.state === 'suspended') sfxCtx.resume().catch(() => {});
      const tone = (f, d, v, delay) => {
        const t = sfxCtx.currentTime + delay;
        const o = sfxCtx.createOscillator(), g = sfxCtx.createGain();
        o.type = kind === 'wrong' ? 'triangle' : 'sine';
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(v, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(sfxCtx.destination);
        o.start(t); o.stop(t + d + 0.02);
      };
      if (kind === 'ok') { tone(523.25, 0.16, 0.09, 0); tone(698.46, 0.24, 0.10, 0.07); }
      else if (kind === 'win') { tone(349.23, 0.16, 0.09, 0); tone(523.25, 0.18, 0.10, 0.08); tone(698.46, 0.28, 0.11, 0.16); tone(1046.5, 0.35, 0.08, 0.24); }
      else if (kind === 'wrong') { tone(240, 0.12, 0.08, 0); tone(190, 0.14, 0.07, 0.08); }
      else { tone(523.25, 0.05, 0.04, 0); }
    } catch (_) {}
  }

  let xpToastTimer = null;
  function getXp() { try { return Number(localStorage.getItem('ht_site_xp') || '0') || 0; } catch (_) { return 0; } }
  function rankOf(xp) { return xp >= 350 ? '🏆 IELTS Legend' : xp >= 150 ? '🔥 CEFR Master' : xp >= 50 ? '📘 Bilimdon' : '🌱 Yangi'; }
  function updateXpHud() {
    const el = document.getElementById('xp-hud');
    if (el) { const xp = getXp(); el.textContent = `⚡ ${xp} XP • ${rankOf(xp)}`; }
  }
  function addXp(pts, label) {
    const next = getXp() + pts;
    try { localStorage.setItem('ht_site_xp', String(next)); } catch (_) {}
    updateXpHud();
    sfx(pts >= 15 ? 'win' : 'ok');
    const toast = document.getElementById('xp-toast');
    if (toast) {
      toast.textContent = `⚡ +${pts} XP${label ? ' • ' + label : ''} (${rankOf(next)})`;
      toast.classList.add('show');
      if (xpToastTimer) clearTimeout(xpToastTimer);
      xpToastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
    }
  }

  const sfxBtn = document.getElementById('sfx-toggle');
  if (sfxBtn) {
    sfxBtn.textContent = sfxOn ? '🔊' : '🔇';
    sfxBtn.onclick = () => {
      sfxOn = !sfxOn;
      try { localStorage.setItem('ht_site_sfx', sfxOn ? '1' : '0'); } catch (_) {}
      sfxBtn.textContent = sfxOn ? '🔊' : '🔇';
      if (sfxOn) sfx('ok');
    };
  }
  updateXpHud();

  // -------------------- 13. ERROR SPOTTING (XATONI TOP!) --------------------
  let errIdx = 0, errPick = null;
  function renderErrors() {
    const list = window.HT_ERROR_SPOTTING || [];
    const cur = list[errIdx % list.length];
    const ok = errPick !== null && errPick === cur.wrong;
    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
        <div>
          <span class="pill">🧩 CEFR GRAMMAR TRAP • ${(errIdx % list.length) + 1} / ${list.length}</span>
          <h3 style="margin-top:8px;font-size:21px;">🧩 Xato yozilgan so‘zni bosing!</h3>
        </div>
        <button class="btn btn-primary btn-sm" id="err-next">Keyingi gap →</button>
      </div>
      <div class="q-item" style="text-align:center;padding:24px 16px;">
        <div class="err-sentence">
          ${cur.words.map((w, i) => {
            let cls = 'err-word';
            if (errPick !== null) {
              if (i === cur.wrong) cls += ' right';
              else if (i === errPick) cls += ' wrong';
            }
            return `<button class="${cls}" data-ew="${i}">${esc(w)}</button>`;
          }).join('')}
        </div>
        ${errPick !== null ? `
          <div class="fb-box ${ok ? 'ok' : 'no'}" style="text-align:left;max-width:640px;margin:14px auto 0;">
            <b>${ok ? '✅ Barakalla! Xatoni aniq topdingiz (+10 XP)!' : '❌ Xato so‘z: «' + esc(cur.words[cur.wrong]) + '»'}</b><br/>
            <b>To‘g‘ri gap:</b> ${esc(cur.fix)} <button class="btn btn-ghost btn-sm" id="err-say" style="margin-left:6px;">🔊</button><br/>
            <i>📌 Qoida: ${esc(cur.exp)}</i>
          </div>
        ` : `<div style="font-size:13px;color:var(--muted);">Yuqoridagi gapdagi bitta grammatik xato so‘zni bosib toping.</div>`}
      </div>
    `;
    stage.querySelectorAll('[data-ew]').forEach((b) => b.onclick = () => {
      if (errPick !== null) return;
      errPick = Number(b.dataset.ew);
      if (errPick === cur.wrong) addXp(10, 'Xatoni Top');
      else sfx('wrong');
      renderErrors();
    });
    const sayB = stage.querySelector('#err-say');
    if (sayB) sayB.onclick = () => speak(cur.fix, 0.92);
    stage.querySelector('#err-next').onclick = () => { errIdx = (errIdx + 1) % list.length; errPick = null; sfx('tap'); renderErrors(); };
  }

  // -------------------- 14. 3D FLIP FLASHCARDS --------------------
  let fcIdx = 0, fcFlip = false;
  function getFcDone() { try { return JSON.parse(localStorage.getItem('ht_fc_done') || '[]'); } catch (_) { return []; } }
  function renderFlashcards() {
    const list = window.HT_FLASHCARDS || [];
    const cur = list[fcIdx % list.length];
    const done = getFcDone();
    const isDone = done.includes(cur.en);
    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;">
        <div>
          <span class="pill">🃏 3D INTERAKTIV KARTOCHKALAR • ${done.length} / ${list.length} YODLANDI</span>
          <h3 style="margin-top:8px;font-size:21px;">🃏 Phrasal Verbs & Idioms (B1–C1)</h3>
        </div>
        <span style="font-size:13px;color:var(--gold);font-weight:800;">${(fcIdx % list.length) + 1} / ${list.length}</span>
      </div>
      <div class="flip-scene">
        <div class="flip-card ${fcFlip ? 'is-flipped' : ''}" id="fc-card">
          <div class="flip-face">
            <span class="result-badge">${esc(cur.tag)}</span>
            <div style="font-size:30px;font-weight:900;color:#fff;margin:8px 0;">${esc(cur.en)}</div>
            <div style="font-size:13px;color:var(--muted);">Tarjimasini ko‘rish uchun kartochkani bosing ↻</div>
          </div>
          <div class="flip-face flip-back">
            <span class="result-badge">🇺🇿 TARJIMA VA MISOL</span>
            <div style="font-size:23px;font-weight:900;color:var(--gold-soft);margin:6px 0 10px;">${esc(cur.uz)}</div>
            <div style="font-size:14.5px;color:#e2e8f0;max-width:420px;">💬 «${esc(cur.ex)}»</div>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px;">
        <button class="btn btn-ghost btn-sm" id="fc-prev">← Oldingi</button>
        <button class="btn btn-ghost btn-sm" id="fc-say">🔊 Talaffuz</button>
        <button class="btn ${isDone ? 'btn-primary' : 'btn-gold'} btn-sm" id="fc-done">${isDone ? '✅ Yodlangan' : '☐ Yodladim (+10 XP)'}</button>
        <button class="btn btn-primary btn-sm" id="fc-next">Keyingi →</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px;padding-top:14px;border-top:1px solid var(--border);">
        <a class="btn btn-gold btn-sm" href="library/vocab/iboralar-30.html" target="_blank" rel="noopener">🗣️ Kundalik Iboralar (30+ & Test)</a>
        <a class="btn btn-ghost btn-sm" href="library/vocab/kunlik-450.html" target="_blank" rel="noopener">📘 450 Kunlik Lug‘at Darslari</a>
      </div>
    `;
    stage.querySelector('#fc-card').onclick = () => { fcFlip = !fcFlip; sfx('tap'); renderFlashcards(); };
    stage.querySelector('#fc-say').onclick = () => speak(fcFlip ? cur.ex : cur.en, 0.9);
    stage.querySelector('#fc-done').onclick = () => {
      const next = isDone ? done.filter((x) => x !== cur.en) : [...done, cur.en];
      try { localStorage.setItem('ht_fc_done', JSON.stringify(next)); } catch (_) {}
      if (!isDone) addXp(10, 'Flashcard yodlandi');
      renderFlashcards();
    };
    stage.querySelector('#fc-prev').onclick = () => { fcFlip = false; fcIdx = (fcIdx - 1 + list.length) % list.length; sfx('tap'); renderFlashcards(); };
    stage.querySelector('#fc-next').onclick = () => { fcFlip = false; fcIdx = (fcIdx + 1) % list.length; sfx('tap'); renderFlashcards(); };
  }

  // -------------------- ✨ WORD OF THE DAY (3D HERO CARD) --------------------
  (function initWordOfDay() {
    const box = document.getElementById('wod-content');
    const list = window.HT_WORD_OF_DAY || [];
    if (!box || !list.length) return;
    const dayIdx = Math.floor(Date.now() / 86400000) % list.length;
    const w = list[dayIdx];
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div><b style="font-size:19px;color:#fff;">${esc(w.en)}</b> <span style="font-size:12px;color:var(--gold-soft);">${esc(w.ipa)}</span></div>
        <button class="btn btn-ghost btn-sm" id="wod-say" type="button" style="min-height:30px;padding:0 10px;">🔊</button>
      </div>
      <div style="font-size:13.5px;color:#a7f3d0;font-weight:700;margin-top:3px;">🇺🇿 ${esc(w.uz)}</div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:4px;">💬 «${esc(w.ex)}»</div>
    `;
    const btn = document.getElementById('wod-say');
    if (btn) btn.onclick = () => speak(`${w.en}. ${w.ex}`, 0.9);
  })();

  // -------------------- 3D PERSPECTIVE TILT CARDS --------------------
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (0.5 - y) * 11;
      const ry = (x - 0.5) * 13;
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  });

  // -------------------- 3D CELESTIAL INTERACTIVE BACKGROUND CANVAS --------------------
  (function init3DCanvas() {
    const cv = document.getElementById('bg-3d');
    if (!cv) return;
    const c = cv.getContext('2d');
    let W = 0, H = 0, mx = 0, my = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.4);
    const stars = Array.from({ length: 75 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random() * 1.4 + 0.2,
      r: Math.random() * 1.6 + 0.5,
      gold: Math.random() > 0.65,
    }));
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', (e) => {
      mx = (e.clientX / Math.max(1, W) - 0.5) * 2;
      my = (e.clientY / Math.max(1, H) - 0.5) * 2;
    });
    let t = 0;
    function frame() {
      requestAnimationFrame(frame);
      if (document.hidden) return;
      t += 0.004;
      c.clearRect(0, 0, W, H);

      // Subtle 3D orbital golden rings
      c.save();
      c.translate(W * 0.72 + mx * 18, H * 0.26 + my * 14);
      c.strokeStyle = 'rgba(251, 191, 36, 0.09)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.ellipse(0, 0, 210, 74, t * 0.6, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = 'rgba(16, 185, 129, 0.09)';
      c.beginPath();
      c.ellipse(0, 0, 165, 58, -t * 0.8 + 0.9, 0, Math.PI * 2);
      c.stroke();
      c.restore();

      // 3D depth starfield
      for (const s of stars) {
        s.z -= 0.0012;
        if (s.z <= 0.15) { s.z = 1.6; s.x = (Math.random() - 0.5) * 2; s.y = (Math.random() - 0.5) * 2; }
        const px = W * 0.5 + (s.x / s.z) * (W * 0.55) + mx * (28 / s.z);
        const py = H * 0.5 + (s.y / s.z) * (H * 0.55) + my * (22 / s.z);
        if (px < -10 || px > W + 10 || py < -10 || py > H + 10) continue;
        const alpha = Math.min(0.85, (1.6 - s.z) * 0.6);
        c.fillStyle = s.gold ? `rgba(253, 230, 138, ${alpha.toFixed(2)})` : `rgba(186, 230, 253, ${alpha.toFixed(2)})`;
        c.beginPath();
        c.arc(px, py, s.r / s.z, 0, Math.PI * 2);
        c.fill();
      }
    }
    requestAnimationFrame(frame);
  })();

  function renderTab(name) {
    stopSpeak();
    currentTab = name;
    tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    if (name === 'map') renderMap();
    else if (name === 'dictation') renderDictation();
    else if (name === 'listening') renderListening();
    else if (name === 'reading') renderReading();
    else if (name === 'writing') renderWriting();
    else if (name === 'speaking') renderSpeaking();
    else if (name === 'errors') renderErrors();
    else if (name === 'flashcards') renderFlashcards();
    else if (name === 'mock') renderMiniMock();
    else if (name === 'sprint') renderWordSprint();
    else if (name === 'placement') renderPlacement();
    else if (name === 'calc') renderCalc();
    else if (name === 'verbs') renderVerbs();
    else if (name === 'tenses') renderTenses();
  }

  window.HT_SELECT_TAB = renderTab;
  tabBtns.forEach((b) => b.onclick = () => { sfx('tap'); renderTab(b.dataset.tab); });
  renderTab('reading');

  // Enrollment form -> Telegram
  document.getElementById('enroll-form').onsubmit = function (e) {
    e.preventDefault();
    const name = document.getElementById('en-name').value.trim();
    const phone = document.getElementById('en-phone').value.trim();
    const course = document.getElementById('en-course').value;
    const text = `Assalomu alaykum! Saytdan bepul 1-sinov darsiga yozilmoqchiman:\n👤 Ism: ${name}\n📞 Tel: ${phone}\n🎓 Yo‘nalish: ${course}`;
    window.open('https://t.me/sakinatim_bol?text=' + encodeURIComponent(text), '_blank', 'noopener');
  };
})();
