(function () {
  const stage = document.getElementById('hub-stage');
  const tabBtns = [...document.querySelectorAll('#hub-tabs .tab-btn')];
  let currentTab = 'reading';

  const ICO = {
    vol: '<svg class="ico" style="width:14px;height:14px;" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    stop: '<svg class="ico" style="width:13px;height:13px;" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    ext: '<svg class="ico" style="width:14px;height:14px;" viewBox="0 0 24 24"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>',
    dl: '<svg class="ico" style="width:14px;height:14px;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    reset: '<svg class="ico" style="width:14px;height:14px;" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    mic: '<svg class="ico" style="width:14px;height:14px;" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>',
    doc: '<svg class="ico" style="width:14px;height:14px;" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    arrow: '<svg class="ico" style="width:14px;height:14px;" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>'
  };

  function getActiveTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function embedSrc(file) {
    return `${file}?embed=1&theme=${getActiveTheme()}`;
  }

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

  // Silent tactile UX: no synthesized oscillator beeps
  function sfx() {}
  function addXp() {}
  window.HT_SFX = sfx;
  window.HT_ADD_XP = addXp;
  window.HT_SFX_ON = () => false;

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
          <h3 style="margin-top:8px;font-size:19px;font-weight:700;color:var(--ink);">${esc(m.title)}</h3>
          <div style="font-size:13px;color:var(--muted);">${esc(m.subtitle)}</div>
        </div>
        <div style="display:flex;gap:6px;">
          ${window.HT_MAPS.map((x, i) => `<button class="btn btn-sm ${i === mapIdx ? 'btn-primary' : 'btn-ghost'}" data-map-switch="${i}">Xarita ${i + 1}</button>`).join('')}
        </div>
      </div>

      <div class="audio-bar">
        <button class="btn btn-primary btn-sm" id="map-play">${ICO.vol}<span>Audioni tinglash (1x)</span></button>
        <button class="btn btn-ghost btn-sm" id="map-slow"><span>Sekin (0.8x)</span></button>
        <button class="btn btn-ghost btn-sm" id="map-stop">${ICO.stop}<span>To‘xtatish</span></button>
        <button class="btn btn-ghost btn-sm" id="map-script-btn">${ICO.doc}<span>${mapShowScript ? 'Matnni yashirish' : 'Audio matni'}</span></button>
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
                ${mapChecked ? `<div class="fb-box ${ok ? 'ok' : 'no'}"><b>${ok ? 'To‘g‘ri:' : `To‘g‘ri javob: ${q.ans}`}</b> — ${esc(q.exp)}</div>` : ''}
              </div>
            `;
          }).join('')}
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="btn btn-primary" id="map-check">Tekshirish</button>
            <button class="btn btn-ghost" id="map-reset">${ICO.reset}<span>Qayta</span></button>
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
          <h3 style="font-size:19px;font-weight:700;color:var(--ink);">CEFR Dictation (${(dicIdx % pool.length) + 1} / ${pool.length})</h3>
          <div style="font-size:13px;color:var(--muted);">Audioni tinglang va eshitgan gapingizni yozing.</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${['ALL', 'A1-A2', 'B1', 'B2-C1'].map((lv) => `<button class="btn btn-sm ${dicLv === lv ? 'btn-primary' : 'btn-ghost'}" data-dlv="${lv}">${lv === 'ALL' ? 'Barchasi' : lv}</button>`).join('')}
        </div>
      </div>

      <div class="audio-bar">
        <span class="pill">${esc(cur.lv)}</span>
        <button class="btn btn-primary btn-sm" id="dic-play">${ICO.vol}<span>Tinglash (1x)</span></button>
        <button class="btn btn-ghost btn-sm" id="dic-slow"><span>Sekin (0.75x)</span></button>
      </div>

      <textarea class="input-box" id="dic-inp" rows="2" placeholder="Eshitgan inglizcha gapingizni shu yerga yozing...">${esc(dicTyped)}</textarea>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
        <button class="btn btn-primary" id="dic-check">Tekshirish</button>
        <button class="btn btn-ghost" id="dic-next"><span>Keyingi gap</span>${ICO.arrow}</button>
      </div>
      ${dicRes ? `
        <div class="fb-box ${dicRes.ok ? 'ok' : 'no'}" style="margin-top:14px;">
          <b>${dicRes.ok ? 'To‘g‘ri yozdingiz.' : 'Asl matn bilan solishtiring:'}</b><br/>
          <b>To‘g‘ri gap:</b> ${esc(cur.en)}<br/>
          <span style="color:var(--muted);">Tarjima: ${esc(cur.uz)}</span>
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
          <h3 style="margin-top:8px;font-size:19px;font-weight:700;color:var(--ink);">${esc(item.title)}</h3>
        </div>
        <div style="display:flex;gap:6px;">
          ${window.HT_LISTENING.map((_, i) => `<button class="btn btn-sm ${i === lisIdx ? 'btn-primary' : 'btn-ghost'}" data-lis="${i}">Mashq ${i + 1}</button>`).join('')}
        </div>
      </div>
      <div class="audio-bar">
        <button class="btn btn-primary btn-sm" id="lis-play">${ICO.vol}<span>Audioni tinglash</span></button>
        <button class="btn btn-ghost btn-sm" id="lis-slow"><span>Sekin (0.8x)</span></button>
        <button class="btn btn-ghost btn-sm" id="lis-stop">${ICO.stop}<span>To‘xtatish</span></button>
        <button class="btn btn-ghost btn-sm" id="lis-sc">${ICO.doc}<span>${lisShowScript ? 'Matnni yashirish' : 'Transcript'}</span></button>
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
            ${lisChecked ? `<div class="fb-box ${ok ? 'ok' : 'no'}"><b>${ok ? 'To‘g‘ri:' : 'Izoh:'}</b> ${esc(q.exp)}</div>` : ''}
          </div>
        `;
      }).join('')}
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-primary" id="lis-check">Tekshirish</button>
        <button class="btn btn-ghost" id="lis-reset">${ICO.reset}<span>Qayta</span></button>
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
          <span class="pill">CEFR (5) · IELTS READING (6)</span>
          <h3 style="margin-top:8px;font-size:19px;font-weight:700;color:var(--ink);">${rdTrack === 'ielts' ? 'IELTS Reading' : rdTrack === 'cefr' ? 'CEFR / Multilevel Reading' : 'Tezkor CEFR Reading'}: ${esc(activeLib.label)}</h3>
        </div>
        ${activeLib.file ? `<a class="btn btn-gold btn-sm" href="${activeLib.file}" target="_blank" rel="noopener"><span>Alohida sahifada ochish</span>${ICO.ext}</a>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        <button class="btn btn-sm ${rdTrack === 'cefr' ? 'btn-primary' : 'btn-ghost'}" data-rdtrack="cefr">CEFR / Multilevel (5 daraja)</button>
        <button class="btn btn-sm ${rdTrack === 'ielts' ? 'btn-primary' : 'btn-ghost'}" data-rdtrack="ielts">IELTS Reading (6 daraja)</button>
        <button class="btn btn-sm ${rdTrack === 'quick' ? 'btn-primary' : 'btn-ghost'}" data-rdtrack="quick">Qisqa matn mashqi</button>
      </div>
      ${rdTrack !== 'quick' ? `
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
          ${list.map((x) => `<button class="btn btn-sm ${x.id === activeLib.id ? 'btn-gold' : 'btn-ghost'}" data-rdlib="${x.id}">${esc(x.label)}</button>`).join('')}
        </div>
      ` : ''}
    `;
    if (activeLib.file) {
      stage.innerHTML = barHtml + `<iframe src="${embedSrc(activeLib.file)}" title="Reading ${esc(activeLib.label)}" style="width:100%;height:740px;border:1px solid var(--border);border-radius:10px;background:var(--bg);"></iframe>`;
      stage.querySelectorAll('[data-rdtrack]').forEach((b) => b.onclick = () => { rdTrack = b.dataset.rdtrack; renderReading(); });
      stage.querySelectorAll('[data-rdlib]').forEach((b) => b.onclick = () => { rdLib = b.dataset.rdlib; renderReading(); });
      return;
    }

    const item = window.HT_READING[rdIdx];
    stage.innerHTML = barHtml + `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">${esc(item.level)}</span>
          <h3 style="margin-top:8px;font-size:18px;font-weight:700;color:var(--ink);">${esc(item.title)}</h3>
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
        <button class="btn btn-primary" id="rd-check">Tekshirish</button>
        <button class="btn btn-ghost" id="rd-reset">${ICO.reset}<span>Qayta</span></button>
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
      <h3 style="font-size:19px;font-weight:700;color:var(--ink);margin-bottom:4px;">Daraja aniqlash testi (A1 → C1)</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;">12 ta savolga javob bering va joriy CEFR darajangizni aniqlang.</p>
      ${plChecked ? `
        <div class="fb-box ok" style="margin-bottom:16px;font-size:14.5px;">
          <b>Natija: ${score} / ${total}</b> · Taxminiy daraja: <b style="color:var(--brand);">${estLevel}</b>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center;">
            <input class="input-box" id="cert-name" style="max-width:240px;padding:7px 11px;font-size:13px;" placeholder="Ism va familiyangiz" />
            <button class="btn btn-primary btn-sm" id="cert-dl">${ICO.dl}<span>Sertifikatni yuklab olish (PNG)</span></button>
            <a href="#enroll" class="btn btn-ghost btn-sm">Bepul 1-sinov darsi</a>
          </div>
        </div>
      ` : ''}
      ${window.HT_PLACEMENT.map((q, qi) => `
        <div class="q-item">
          <div class="q-label"><span style="font-family:var(--font-mono);font-size:12px;color:var(--brand);margin-right:8px;">[${q.lv}]</span>${esc(q.q)}</div>
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
        <button class="btn btn-primary" id="pl-check">Natijani hisoblash</button>
        <button class="btn btn-ghost" id="pl-reset">${ICO.reset}<span>Qayta</span></button>
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

  function loadImgSafe(src) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }

  async function downloadCertPng(studentName, levelLabel, scoreText) {
    const [photoImg, qrImg] = await Promise.all([
      loadImgSafe('./teacher-portrait.jpg'),
      loadImgSafe('./site-qr.png')
    ]);
    const c = document.createElement('canvas');
    c.width = 1080; c.height = 1350;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 1080, 1350);

    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, 984, 1254);
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 4;
    ctx.strokeRect(64, 64, 952, 1222);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#60a5fa';
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.fillText('HUSANBOY TEACHER AKADEMIYASI', 540, 155);

    ctx.fillStyle = '#fafafa';
    ctx.font = '700 64px Inter, system-ui, sans-serif';
    ctx.fillText('SERTIFIKAT', 540, 240);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillText('CEFR · MULTILEVEL · IELTS AKADEMIK SINOVI', 540, 290);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillText('Ushbu sertifikat egasi:', 540, 400);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 54px Inter, system-ui, sans-serif';
    ctx.fillText(String(studentName || 'O‘quvchi').slice(0, 30), 540, 472);

    ctx.fillStyle = '#111114';
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(120, 540, 840, 260, 18); else ctx.rect(120, 540, 840, 260);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#60a5fa';
    ctx.font = '700 44px Inter, system-ui, sans-serif';
    ctx.fillText(levelLabel, 540, 625);
    ctx.fillStyle = '#4ade80';
    ctx.font = '700 48px Inter, system-ui, sans-serif';
    ctx.fillText(`Natija: ${scoreText}`, 540, 705);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillText(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 540, 765);

    ctx.fillStyle = '#111114';
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(120, 870, 840, 340, 18); else ctx.rect(120, 870, 840, 340);
    ctx.fill(); ctx.stroke();

    if (photoImg) {
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(156, 930, 160, 200, 14); else ctx.rect(156, 930, 160, 200);
      ctx.clip();
      ctx.drawImage(photoImg, 156, 930, 160, 200);
      ctx.restore();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '600 20px Inter, system-ui, sans-serif';
    ctx.fillText('MUALLIF VA USTOZ', 348, 968);
    ctx.fillStyle = '#fafafa';
    ctx.font = '700 34px Inter, system-ui, sans-serif';
    ctx.fillText('Qosimov Husanboy', 348, 1014);
    ctx.fillStyle = '#60a5fa';
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillText('@xusanboy_teacher', 348, 1062);
    ctx.fillStyle = '#d4d4d8';
    ctx.fillText('@Qosimov_Xusanboy', 348, 1102);
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('+998 88 997 77 46', 348, 1142);

    if (qrImg) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(732, 930, 190, 190, 12); else ctx.rect(732, 930, 190, 190);
      ctx.fill();
      ctx.drawImage(qrImg, 744, 942, 166, 166);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '500 18px Inter, system-ui, sans-serif';
      ctx.fillText('Platformani ochish', 827, 1154);
    }

    const a = document.createElement('a');
    a.download = 'Husanboy_Teacher_Sertifikat.png';
    a.href = c.toDataURL('image/png');
    a.click();
  }
  window.HT_DOWNLOAD_CERT = downloadCertPng;

  // -------------------- 8. MULTILEVEL & IELTS WRITING LIBRARY --------------------
  let wrIdx = 0, wrText = '', wrShowModel = false, wrTimerSec = 40 * 60, wrInterval = null, wrLib = 'multilevel';
  const WR_LIBS = [
    { id: 'starter', label: 'Starter', file: 'library/writing/starter.html' },
    { id: 'elementary', label: 'Elementary', file: 'library/writing/elementary.html' },
    { id: 'pre-intermediate', label: 'Pre-Int', file: 'library/writing/pre-intermediate.html' },
    { id: 'intermediate', label: 'Intermediate', file: 'library/writing/intermediate.html' },
    { id: 'upper-intermediate', label: 'Upper-Int', file: 'library/writing/upper-intermediate.html' },
    { id: 'multilevel', label: 'Multilevel Full', file: 'library/writing/multilevel.html' },
    { id: 'quick', label: 'Insho mashqi', file: '' },
  ];
  function renderWriting() {
    const activeW = WR_LIBS.find((x) => x.id === wrLib) || WR_LIBS[5];
    const barHtml = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">WRITING KUTUBXONASI · 6 DARAJA</span>
          <h3 style="margin-top:8px;font-size:19px;font-weight:700;color:var(--ink);">Writing: ${esc(activeW.label)}</h3>
        </div>
        ${activeW.file ? `<a class="btn btn-gold btn-sm" href="${activeW.file}" target="_blank" rel="noopener"><span>Alohida sahifada ochish</span>${ICO.ext}</a>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
        ${WR_LIBS.map((x) => `<button class="btn btn-sm ${x.id === wrLib ? 'btn-primary' : 'btn-ghost'}" data-wrlib="${x.id}">${esc(x.label)}</button>`).join('')}
      </div>
    `;
    if (activeW.file) {
      stage.innerHTML = barHtml + `<iframe src="${embedSrc(activeW.file)}" title="IELTS Writing ${esc(activeW.label)}" style="width:100%;height:740px;border:1px solid var(--border);border-radius:10px;background:var(--bg);"></iframe>`;
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
          <h3 style="margin-top:8px;font-size:18px;font-weight:700;color:var(--ink);">${esc(w.title)}</h3>
        </div>
        <div style="display:flex;gap:6px;">
          ${window.HT_WRITING.map((x, i) => `<button class="btn btn-sm ${i === wrIdx ? 'btn-primary' : 'btn-ghost'}" data-wr="${i}">Task ${i + 1}</button>`).join('')}
        </div>
      </div>
      <div class="passage" style="white-space:pre-line;font-size:14px;">${esc(w.prompt)}</div>
      <div class="audio-bar" style="justify-content:space-between;">
        <div style="display:flex;gap:8px;align-items:center;">
          <b style="font-family:var(--font-mono);color:var(--ink);">${mm}:${ss}</b>
          <button class="btn btn-primary btn-sm" id="wr-tbtn">${wrInterval ? 'Pauza' : 'Taymerni yoqish'}</button>
          <button class="btn btn-ghost btn-sm" id="wr-treset">${ICO.reset}</button>
        </div>
        <div>
          <b style="font-family:var(--font-mono);color:${words >= w.minWords ? 'var(--ok)' : 'var(--brand)'};">${words} / ${w.minWords}+ so‘z (${pct}%)</b>
        </div>
      </div>
      <div style="margin-bottom:10px;display:flex;flex-wrap:wrap;gap:6px;">
        ${window.HT_LINKING_WORDS.map((lw) => `<button class="opt-btn" style="font-size:12px;padding:5px 10px;" title="${esc(lw.uz)}" data-lw="${esc(lw.en)}">+ ${esc(lw.en)}</button>`).join('')}
      </div>
      <textarea class="input-box" id="wr-area" rows="8" placeholder="Inshoingizni ingliz tilida shu yerga yozing...">${esc(wrText)}</textarea>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
        <button class="btn btn-gold btn-sm" id="wr-model-btn">${wrShowModel ? 'Namuna inshoni yashirish' : 'Band 8.0 namuna insho'}</button>
        <button class="btn btn-ghost btn-sm" id="wr-say">${ICO.vol}<span>Namunani tinglash</span></button>
      </div>
      ${wrShowModel ? `<div class="fb-box ok" style="margin-top:12px;white-space:pre-line;"><b>Band 8.0 Model Answer:</b>\n\n${esc(w.model)}</div>` : ''}
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
    { id: 'multilevel40', label: 'Multilevel: 40 Savol', file: 'library/speaking/multilevel-40.html' },
    { id: 'suhbat500', label: '500 ta Suhbat', file: 'library/speaking/suhbat-500.html' },
    { id: 'sim', label: 'Ovoz yozish mashqi', file: '' },
  ];
  function renderSpeaking() {
    const activeS = SP_LIBS.find((x) => x.id === spLib) || SP_LIBS[0];
    const topBar = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">SPEAKING AMALIYOTI</span>
          <h3 style="margin-top:8px;font-size:19px;font-weight:700;color:var(--ink);">${esc(activeS.label)}</h3>
        </div>
        ${activeS.file ? `<a class="btn btn-gold btn-sm" href="${activeS.file}" target="_blank" rel="noopener"><span>Alohida sahifada ochish</span>${ICO.ext}</a>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
        ${SP_LIBS.map((x) => `<button class="btn btn-sm ${x.id === spLib ? 'btn-primary' : 'btn-ghost'}" data-splib="${x.id}">${esc(x.label)}</button>`).join('')}
      </div>
    `;
    if (activeS.file) {
      stage.innerHTML = topBar + `<iframe src="${embedSrc(activeS.file)}" title="${esc(activeS.label)}" style="width:100%;height:740px;border:1px solid var(--border);border-radius:10px;background:var(--bg);"></iframe>`;
      stage.querySelectorAll('[data-splib]').forEach((b) => b.onclick = () => { spLib = b.dataset.splib; renderSpeaking(); });
      return;
    }
    const s = window.HT_SPEAKING[spIdx];
    stage.innerHTML = topBar + `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div>
          <span class="pill">${esc(s.part)}</span>
          <h3 style="margin-top:8px;font-size:18px;font-weight:700;color:var(--ink);">${esc(s.title)}</h3>
        </div>
        <div style="display:flex;gap:6px;">
          ${window.HT_SPEAKING.map((_, i) => `<button class="btn btn-sm ${i === spIdx ? 'btn-primary' : 'btn-ghost'}" data-sp="${i}">Part ${i + 1}</button>`).join('')}
        </div>
      </div>
      <div class="passage" style="white-space:pre-line;">${esc(s.cue.join('\n'))}</div>
      <div class="audio-bar">
        <button class="btn btn-ghost btn-sm" id="sp-prep">Tayyorlanish (${s.prepSec}s)</button>
        <button class="btn btn-primary btn-sm" id="sp-rec-btn">${ICO.mic}<span>${spRecording ? 'Yozishni to‘xtatish' : 'Ovoz yozish (' + s.speakSec + 's)'}</span></button>
        ${spSec > 0 ? `<b style="font-family:var(--font-mono);color:var(--brand);">${spSec}s</b>` : ''}
        <button class="btn btn-gold btn-sm" id="sp-mod-btn">${spShowModel ? 'Namunani yashirish' : 'Band 8.0 namuna'}</button>
        <button class="btn btn-ghost btn-sm" id="sp-say">${ICO.vol}<span>Namunani tinglash</span></button>
      </div>
      ${spAudioUrl ? `<div class="q-item"><div class="q-label">Yozib olingan javobingiz:</div><audio controls src="${spAudioUrl}" style="width:100%;"></audio></div>` : ''}
      ${spShowModel ? `<div class="fb-box ok"><b>Band 8.0 Model Answer:</b><br/><br/>${esc(s.model)}</div>` : ''}
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
        const mime = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/mp4')) ? 'audio/mp4' : '';
        spRec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        spRec.ondataavailable = (ev) => chunks.push(ev.data);
        spRec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          spAudioUrl = URL.createObjectURL(new Blob(chunks, { type: spRec.mimeType || 'audio/mp4' }));
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
    const level = avg >= 65 ? 'C1 (Advanced — 100% OTM imtiyozi)' : avg >= 51 ? 'B2 (Upper-Intermediate — OTM imtiyozi)' : avg >= 38 ? 'B1 (Intermediate — B2 uchun ' + (51 - avg) + ' ball qoldi)' : 'A2 / Boshlang‘ich (B1 uchun ' + (38 - avg) + ' ball qoldi)';
    stage.innerHTML = `
      <h3 style="font-size:19px;font-weight:700;color:var(--ink);margin-bottom:4px;">CEFR / Multilevel ball kalkulyatori (0–75)</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;">To‘rtta bo‘lim ballarini kiriting — o‘rtacha natija va daraja avtomatik hisoblanadi.</p>
      <div class="grid-2" style="margin-bottom:14px;">
        ${[['l', 'Listening (0–75)'], ['r', 'Reading (0–75)'], ['w', 'Writing (0–75)'], ['s', 'Speaking (0–75)']].map(([k, lb]) => `
          <div class="q-item" style="margin:0;">
            <div class="q-label">${lb}</div>
            <input type="number" min="0" max="75" class="input-box" data-ck="${k}" value="${calc[k]}" />
          </div>
        `).join('')}
      </div>
      <div class="fb-box ${avg >= 51 ? 'ok' : 'no'}" style="font-size:15px;">
        <b>O‘rtacha ball:</b> <b style="font-family:var(--font-mono);color:var(--brand);font-size:20px;">${avg} / 75</b><br/>
        <b>Natija:</b> ${level}
      </div>
    `;
    stage.querySelectorAll('[data-ck]').forEach((inp) => inp.oninput = (e) => {
      calc[inp.dataset.ck] = Math.max(0, Math.min(75, Number(e.target.value) || 0));
      renderCalc();
      const el = stage.querySelector(`[data-ck="${inp.dataset.ck}"]`);
      el.focus();
    });
  }

  // -------------------- PDF / PRINT HELPER --------------------
  function printCheatSheet(title, bodyHtml) {
    const w = window.open('', '_blank', 'width=920,height=760');
    if (!w) { alert('Brauzer pop-up oynasini blokladi. Ruxsat bering.'); return; }
    w.document.write(`<!doctype html><html lang="uz"><head><meta charset="UTF-8"/><title>${esc(title)} — Husanboy Teacher</title>
      <style>
        body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#09090b;padding:28px 34px;line-height:1.5;}
        .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #09090b;padding-bottom:12px;margin-bottom:20px;}
        .hdr h1{font-size:20px;margin:0;color:#09090b;}
        .hdr .brand{font-size:12.5px;font-weight:600;color:#52525b;}
        table{width:100%;border-collapse:collapse;font-size:13px;}
        th,td{border:1px solid #d4d4d8;padding:7px 10px;text-align:left;}
        th{background:#f4f4f5;color:#09090b;}
        .card{border:1px solid #d4d4d8;border-radius:8px;padding:12px 14px;margin-bottom:10px;page-break-inside:avoid;}
        .ftr{margin-top:22px;padding-top:10px;border-top:1px solid #d4d4d8;font-size:12px;color:#52525b;text-align:center;}
      </style></head><body>
      <div class="hdr"><h1>${esc(title)}</h1><div class="brand">Husanboy Teacher · @xusanboy_teacher</div></div>
      ${bodyHtml}
      <div class="ftr">Husanboy Teacher — CEFR & Multilevel Platform · @xusanboy_teacher · @Husanboy_Teacher_Assisstant_bot</div>
      <script>window.onload=function(){window.print();};<\/script>
      </body></html>`);
    w.document.close();
  }

  // -------------------- 6. IRREGULAR VERBS (MOBILE-SAFE TABLE) --------------------
  let verbQuery = '';
  function renderVerbs() {
    const q = verbQuery.toLowerCase().trim();
    const list = q
      ? window.HT_IRREGULAR_VERBS.filter((v) => v.some((x) => x.toLowerCase().includes(q)))
      : window.HT_IRREGULAR_VERBS;
    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <h3 style="font-size:19px;font-weight:700;color:var(--ink);">Noto‘g‘ri fe’llar (${list.length} ta)</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;flex:1;justify-content:flex-end;min-width:220px;">
          <input class="input-box" id="verb-search" style="max-width:250px;" placeholder="Qidirish (go, went, bormoq)..." value="${esc(verbQuery)}" />
          <button class="btn btn-gold btn-sm" id="verb-pdf">${ICO.dl}<span>PDF / Chop etish</span></button>
        </div>
      </div>
      <div class="tbl-wrap">
        <table class="verbs-table">
          <thead><tr><th>V1 · V2 · V3</th><th>O‘zbekcha</th><th style="width:52px;text-align:right;">Audio</th></tr></thead>
          <tbody>
            ${list.map(([v1, v2, v3, uz]) => `
              <tr>
                <td><b style="color:var(--ink);">${esc(v1)}</b> <span style="color:var(--muted);">· ${esc(v2)} · ${esc(v3)}</span></td>
                <td>${esc(uz)}</td>
                <td style="text-align:right;"><button class="btn btn-ghost btn-sm" aria-label="Tinglash" data-say="${esc(v1 + ', ' + v2.split('/')[0] + ', ' + v3.split('/')[0])}">${ICO.vol}</button></td>
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
        <h3 style="font-size:19px;font-weight:700;color:var(--ink);">Ingliz tilidagi 12 ta zamon</h3>
        <button class="btn btn-gold btn-sm" id="tense-pdf">${ICO.dl}<span>PDF / Chop etish</span></button>
      </div>
      <div class="grid-2">
        ${window.HT_TENSES.map((t) => `
          <div class="q-item" style="margin:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <b style="font-size:15.5px;color:var(--ink);">${esc(t.name)}</b>
              <button class="btn btn-ghost btn-sm" data-tsay="${esc(t.ex)}">${ICO.vol}<span>Misol</span></button>
            </div>
            <div style="margin:6px 0;font-family:var(--font-mono);font-size:13px;color:var(--brand);font-weight:600;">${esc(t.formula)}</div>
            <div style="font-size:13px;color:var(--fg);">${esc(t.use)}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px;">Kalit so‘zlar: <i>${esc(t.signals)}</i></div>
            <div style="font-size:13px;color:var(--ink);margin-top:6px;">“${esc(t.ex)}”</div>
          </div>
        `).join('')}
      </div>
    `;
    stage.querySelectorAll('[data-tsay]').forEach((b) => b.onclick = () => speak(b.dataset.tsay, 0.92));
    stage.querySelector('#tense-pdf').onclick = () => {
      const cards = window.HT_TENSES.map((t) => `<div class="card"><b>${esc(t.name)}</b> — <code>${esc(t.formula)}</code><br/>${esc(t.use)}<br/><i>${esc(t.signals)}</i><br/>“${esc(t.ex)}”</div>`).join('');
      printCheatSheet('Ingliz tilidagi 12 ta Zamon', cards);
    };
  }

  // -------------------- 11. 15-MINUTE CEFR MINI-MOCK --------------------
  let mkStarted = false, mkFinished = false, mkSec = 15 * 60, mkTimer = null, mkAns = {}, mkShowScript = false;
  function buildMockQuestions() {
    const l0 = window.HT_LISTENING[0];
    const r0 = window.HT_READING[0];
    const gqs = window.HT_PLACEMENT.slice(4, 8);
    const out = [];
    l0.questions.slice(0, 3).forEach((q, i) => out.push({ sec: 'Listening', q: q.q, opts: q.opts, ans: q.ans, exp: q.exp, key: 'l' + i }));
    r0.questions.slice(0, 3).forEach((q, i) => out.push({ sec: 'Reading', q: q.q, opts: q.opts, ans: q.ans, exp: q.exp, key: 'r' + i }));
    gqs.forEach((q, i) => out.push({ sec: 'Grammar · ' + q.lv, q: q.q, opts: q.opts, ans: q.ans, exp: 'To‘g‘ri variant: ' + q.opts[q.ans], key: 'g' + i }));
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
        <span class="pill">15 DAQIQA · 10 SAVOL · CEFR</span>
        <h3 style="font-size:20px;font-weight:700;color:var(--ink);margin:10px 0 6px;">15 daqiqalik CEFR Mini-Mock imtihoni</h3>
        <p style="font-size:14px;color:var(--muted);margin-bottom:16px;">3 ta Listening, 3 ta Reading va 4 ta Grammar savolidan iborat tezkor diagnostika. Yakunda natija va PNG sertifikat taqdim etiladi.</p>
        <button class="btn btn-primary" id="mk-start">Imtihonni boshlash (15:00)</button>
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
          <span class="pill">CEFR MINI-MOCK</span>
          <h3 style="font-size:19px;font-weight:700;color:var(--ink);margin-top:6px;">Listening + Reading + Grammar (10 savol)</h3>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <b style="font-family:var(--font-mono);font-size:17px;color:${mkSec <= 120 ? 'var(--err)' : 'var(--ink)'};">${mm}:${ss}</b>
          <button class="btn btn-ghost btn-sm" id="mk-reset">${ICO.reset}<span>Qayta</span></button>
        </div>
      </div>

      ${mkFinished ? `
        <div class="fb-box ok" style="margin-bottom:16px;font-size:14.5px;">
          <b>Mini-Mock natijasi: ${score} / ${qs.length}</b> · Daraja: <b style="color:var(--brand);">${lv}</b>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center;">
            <input class="input-box" id="mk-cert-name" style="max-width:240px;padding:7px 11px;font-size:13px;" placeholder="Ism va familiyangiz" />
            <button class="btn btn-primary btn-sm" id="mk-cert-dl">${ICO.dl}<span>Sertifikatni yuklab olish (PNG)</span></button>
          </div>
        </div>
      ` : ''}

      <div class="audio-bar">
        <button class="btn btn-primary btn-sm" id="mk-play">${ICO.vol}<span>Listening audioni tinglash</span></button>
        <button class="btn btn-ghost btn-sm" id="mk-slow"><span>Sekin (0.8x)</span></button>
        <button class="btn btn-ghost btn-sm" id="mk-stop">${ICO.stop}<span>To‘xtatish</span></button>
        ${mkFinished ? `<button class="btn btn-ghost btn-sm" id="mk-sc">${mkShowScript ? 'Transcriptni yashirish' : 'Listening matni'}</button>` : ''}
      </div>
      ${mkFinished && mkShowScript ? `<div class="passage" style="font-size:13px;">${esc(l0.script)}</div>` : ''}

      <div class="passage" style="font-size:14px;"><b style="color:var(--ink);">Reading matni (${esc(r0.title)}):</b><br/><br/>${esc(r0.passage)}</div>

      ${qs.map((q, qi) => {
        const pick = mkAns[qi];
        const ok = mkFinished && pick === q.ans;
        return `
          <div class="q-item">
            <div class="q-label"><span style="font-family:var(--font-mono);font-size:12px;color:var(--brand);margin-right:8px;">${qi + 1}. [${esc(q.sec)}]</span>${esc(q.q)}</div>
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
            ${mkFinished ? `<div class="fb-box ${ok ? 'ok' : 'no'}"><b>${ok ? 'To‘g‘ri:' : 'Izoh:'}</b> ${esc(q.exp)}</div>` : ''}
          </div>
        `;
      }).join('')}

      ${!mkFinished ? `<button class="btn btn-primary" id="mk-finish">Imtihonni yakunlash va tekshirish</button>` : ''}
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
        downloadCertPng(nm, `Mini-Mock · ${lv}`, `${score} / ${qs.length}`);
      };
    }
  }

  // -------------------- 12. 60-SECOND WORD SPRINT --------------------
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
        <span class="pill">60 SONIYA · LEKSIK TEZLIK</span>
        <h3 style="font-size:20px;font-weight:700;color:var(--ink);margin:10px 0 6px;">60 soniyalik Word Sprint</h3>
        <p style="font-size:14px;color:var(--muted);margin-bottom:14px;">Bir daqiqa ichida nechta inglizcha so‘z va iboraning aniq tarjimasini topa olishingizni sinab ko‘ring.</p>
        <div class="fb-box ok" style="margin-bottom:16px;">Shaxsiy eng yuqori natijangiz: <b style="font-family:var(--font-mono);color:var(--brand);">${best} ball</b></div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
          <button class="btn btn-primary" id="spg-start">Sinovni boshlash (60s)</button>
          <a class="btn btn-ghost" href="library/vocab/test-450.html"><span>450 kunlik test tizimi</span>${ICO.ext}</a>
        </div>
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
        <span class="pill">VAQT YAKUNLANDI</span>
        <h3 style="font-size:22px;font-weight:700;color:var(--ink);margin:10px 0;">Natijangiz: <span style="color:var(--brand);">${spgScore}</span> / ${spgTotal} to‘g‘ri</h3>
        <p style="font-size:14px;color:var(--muted);margin-bottom:14px;">Shaxsiy rekord: <b>${getSprintBest()} ball</b></p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;align-items:center;">
          <input class="input-box" id="spg-cert-name" style="max-width:240px;padding:7px 11px;font-size:13px;" placeholder="Ism va familiyangiz" />
          <button class="btn btn-gold btn-sm" id="spg-cert-dl">${ICO.dl}<span>Sertifikatni yuklab olish</span></button>
        </div>
        <button class="btn btn-primary" id="spg-again">${ICO.reset}<span>Qayta boshlash (60s)</span></button>
      `;
      stage.querySelector('#spg-again').onclick = () => { spgDone = false; renderWordSprint(); };
      const spgCertBtn = stage.querySelector('#spg-cert-dl');
      if (spgCertBtn) {
        spgCertBtn.onclick = () => {
          const nm = (stage.querySelector('#spg-cert-name').value || '').trim() || 'Husanboy Teacher O‘quvchisi';
          downloadCertPng(nm, 'Word Sprint (60 soniya)', `${spgScore} ta to‘g‘ri`);
        };
      }
      return;
    }

    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;">
        <span class="pill">${spgSec} soniya</span>
        <div style="font-size:14px;font-family:var(--font-mono);">Ball: <b style="color:var(--ok);">${spgScore}</b> · Rekord: <b>${best}</b></div>
      </div>
      <div class="q-item" style="text-align:center;padding:24px 18px;">
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;">To‘g‘ri tarjimani tanlang</div>
        <div style="font-size:28px;font-weight:700;color:var(--ink);margin-bottom:10px;">${esc(spgCur.en)}</div>
        <button class="btn btn-ghost btn-sm" id="spg-say" style="margin-bottom:16px;">${ICO.vol}<span>Talaffuzni tinglash</span></button>
        <div class="opt-row" style="justify-content:center;">
          ${spgOpts.map((o, i) => `<button class="opt-btn" style="font-size:14px;padding:10px 16px;" data-spgo="${i}">${esc(o.text)}</button>`).join('')}
        </div>
        ${spgFlash ? `<div style="margin-top:12px;font-size:13.5px;font-weight:600;color:${spgFlash.startsWith('To‘g‘ri') ? 'var(--ok)' : 'var(--err)'};">${esc(spgFlash)}</div>` : ''}
      </div>
    `;
    stage.querySelector('#spg-say').onclick = () => speak(spgCur.en, 0.92);
    stage.querySelectorAll('[data-spgo]').forEach((b) => b.onclick = () => {
      const picked = spgOpts[Number(b.dataset.spgo)];
      spgTotal++;
      if (picked.ok) { spgScore++; spgFlash = `To‘g‘ri: ${spgCur.en}`; saveSprintBest(spgScore); }
      else { const right = spgOpts.find((x) => x.ok); spgFlash = `To‘g‘ri javob: ${spgCur.en} — ${right ? right.text : ''}`; }
      pickNextSprintWord();
      renderWordSprint();
    });
  }

  // -------------------- 13. ERROR SPOTTING (GRAMMAR TRAPS) --------------------
  let errIdx = 0, errPick = null;
  function renderErrors() {
    const list = window.HT_ERROR_SPOTTING || [];
    const cur = list[errIdx % list.length];
    const ok = errPick !== null && errPick === cur.wrong;
    stage.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
        <div>
          <span class="pill">GRAMMAR TRAP · ${(errIdx % list.length) + 1} / ${list.length}</span>
          <h3 style="margin-top:8px;font-size:19px;font-weight:700;color:var(--ink);">Gapdagi grammatik xato so‘zni toping</h3>
        </div>
        <button class="btn btn-primary btn-sm" id="err-next"><span>Keyingi gap</span>${ICO.arrow}</button>
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
            <b>${ok ? 'To‘g‘ri topdingiz.' : 'Xato so‘z: «' + esc(cur.words[cur.wrong]) + '»'}</b><br/>
            <b>To‘g‘ri shakl:</b> ${esc(cur.fix)} <button class="btn btn-ghost btn-sm" id="err-say" style="margin-left:6px;">${ICO.vol}</button><br/>
            <span style="color:var(--muted);">Qoida: ${esc(cur.exp)}</span>
          </div>
        ` : `<div style="font-size:13px;color:var(--muted);">Yuqoridagi gapdan xato qo‘llangan so‘zni bosing.</div>`}
      </div>
    `;
    stage.querySelectorAll('[data-ew]').forEach((b) => b.onclick = () => {
      if (errPick !== null) return;
      errPick = Number(b.dataset.ew);
      renderErrors();
    });
    const sayB = stage.querySelector('#err-say');
    if (sayB) sayB.onclick = () => speak(cur.fix, 0.92);
    stage.querySelector('#err-next').onclick = () => { errIdx = (errIdx + 1) % list.length; errPick = null; renderErrors(); };
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
          <span class="pill">KARTOCHKALAR · ${done.length} / ${list.length} O‘ZLASHTIRILDI</span>
          <h3 style="margin-top:8px;font-size:19px;font-weight:700;color:var(--ink);">Phrasal Verbs va Idioms (B1–C1)</h3>
        </div>
        <span style="font-family:var(--font-mono);font-size:13px;color:var(--muted);font-weight:600;">${(fcIdx % list.length) + 1} / ${list.length}</span>
      </div>
      <div class="flip-scene">
        <div class="flip-card ${fcFlip ? 'is-flipped' : ''}" id="fc-card">
          <div class="flip-face">
            <span class="result-badge">${esc(cur.tag)}</span>
            <div style="font-size:26px;font-weight:700;color:var(--ink);margin:10px 0 6px;">${esc(cur.en)}</div>
            <div style="font-size:12.5px;color:var(--muted);">Tarjima va misolni ko‘rish uchun bosing</div>
          </div>
          <div class="flip-face flip-back">
            <span class="result-badge">Ma’nosi va misol</span>
            <div style="font-size:20px;font-weight:700;color:var(--ink);margin:8px 0;">${esc(cur.uz)}</div>
            <div style="font-size:14px;color:var(--fg);max-width:420px;">“${esc(cur.ex)}”</div>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px;">
        <button class="btn btn-ghost btn-sm" id="fc-prev">← Oldingi</button>
        <button class="btn btn-ghost btn-sm" id="fc-say">${ICO.vol}<span>Talaffuz</span></button>
        <button class="btn ${isDone ? 'btn-primary' : 'btn-gold'} btn-sm" id="fc-done">${isDone ? 'O‘zlashtirildi' : 'Yodladim deb belgilash'}</button>
        <button class="btn btn-primary btn-sm" id="fc-next">Keyingi →</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px;padding-top:14px;border-top:1px solid var(--border);">
        <a class="btn btn-ghost btn-sm" href="library/vocab/test-450.html">450 kunlik test tizimi</a>
        <a class="btn btn-ghost btn-sm" href="library/vocab/iboralar-30.html">Kundalik iboralar (30+)</a>
        <a class="btn btn-ghost btn-sm" href="library/vocab/kunlik-450.html">450 kunlik lug‘at</a>
      </div>
    `;
    stage.querySelector('#fc-card').onclick = () => { fcFlip = !fcFlip; renderFlashcards(); };
    stage.querySelector('#fc-say').onclick = () => speak(fcFlip ? cur.ex : cur.en, 0.9);
    stage.querySelector('#fc-done').onclick = () => {
      const next = isDone ? done.filter((x) => x !== cur.en) : [...done, cur.en];
      try { localStorage.setItem('ht_fc_done', JSON.stringify(next)); } catch (_) {}
      renderFlashcards();
    };
    stage.querySelector('#fc-prev').onclick = () => { fcFlip = false; fcIdx = (fcIdx - 1 + list.length) % list.length; renderFlashcards(); };
    stage.querySelector('#fc-next').onclick = () => { fcFlip = false; fcIdx = (fcIdx + 1) % list.length; renderFlashcards(); };
  }

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
  tabBtns.forEach((b) => b.onclick = () => renderTab(b.dataset.tab));
  renderTab('reading');
})();
