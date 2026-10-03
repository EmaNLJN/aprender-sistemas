import { cloneJson } from './src/shared/lib/clone-json';
import { interpretRun, mergeRecord, syncAfterRun, testPassed } from './src/entities/exercise';
import { escapeHtml } from './src/shared/lib/escape-html';
import { normalizeSearchText } from './src/shared/lib/normalize-search-text';
(() => {
  'use strict';
  const KEY = 'taller-laboratorio-v1';
  const exercises = [
    ...(window.RUST_LAB || []),
    ...(window.RUST_QUESTS || []),
    ...(window.GO_LAB || []),
    ...(window.GO_QUESTS || []),
    ...(window.SYSTEMS_LOWLEVEL_LABS || []),
    ...(window.SYSTEMS_INFRA_LABS || []),
    ...(window.SYSTEMS_PLAY_LABS || []),
    ...(window.SYSTEMS_PC_LABS || []),
  ];
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const $ = (selector) => host?.querySelector(selector);
  const $$ = (selector) => (host ? [...host.querySelectorAll(selector)] : []);
  const blank = () => ({ version: 1, records: {}, selected: { rust: null, go: null } });
  let state = blank();
  let host = null,
    language = 'rust',
    notify = () => {},
    selectedId = null,
    phase = 'learn';
  let mode = 'map',
    query = '',
    dueOnly = false,
    extraOnly = false,
    level = 'all',
    saveAvailable = true;
  const levels = [
    ['beginner', 'Inicial', 'Entendé las piezas'],
    ['medium', 'Intermedio', 'Conectá las ideas'],
    ['advanced', 'Avanzado', 'Elegí con criterio'],
    ['expert', 'Experto', 'Razoná sobre los límites'],
  ];
  const levelFor = (item) =>
    levels.some(([id]) => id === item.level)
      ? item.level
      : item.stage <= 4
        ? 'beginner'
        : item.stage <= 8
          ? 'medium'
          : item.stage <= 12
            ? 'advanced'
            : 'expert';
  const matches = (item) =>
    (!dueOnly || isDue(item)) &&
    (!extraOnly || (item.stage > 15 && item.stage <= 20)) &&
    (level === 'all' || levelFor(item) === level) &&
    (!query ||
      normalizeSearchText([item.title, item.topic, item.intro, item.why].join(' ')).includes(
        normalizeSearchText(query),
      ));
  let activeRun = null,
    activeController = null,
    lastFocus = null;
  let codeEditor = null;
  let simulation = {
    ownership: 'create',
    sliceCopied: false,
    sliceOriginal: 20,
    sliceView: 20,
    flow: 0,
  };
  let confirmAction = null;
  function sanitizeResult(result, exercise) {
    const tests = exercise.tests.map((test) => ({
      id: test.id,
      passed: testPassed(result, test.id),
    }));
    return {
      code: typeof result.code === 'string' ? result.code.slice(0, 30000) : '',
      success: result.success === true,
      stdout: String(result.stdout || '').slice(0, 12000),
      stderr: String(result.stderr || '').slice(0, 18000),
      transportError: result.transportError === true,
      tests,
      time: Number.isFinite(result.time) ? result.time : 0,
      customTest: typeof result.customTest === 'string' ? result.customTest.slice(0, 3000) : '',
      customPassed: result.customPassed === true,
    };
  }
  function sanitizeRecord(record, exercise) {
    const clean = {};
    const textLimits = { draft: 30000, reflection: 10000, customTest: 3000 };
    for (const [field, limit] of Object.entries(textLimits)) {
      if (typeof record[field] === 'string') clean[field] = record[field].slice(0, limit);
    }
    const numberLimits = {
      attempts: Number.MAX_SAFE_INTEGER,
      hints: 3,
      solvedAt: Number.MAX_SAFE_INTEGER,
      reviewAt: Number.MAX_SAFE_INTEGER,
      reviewedAt: Number.MAX_SAFE_INTEGER,
    };
    for (const [field, limit] of Object.entries(numberLimits)) {
      if (Number.isFinite(record[field]) && record[field] >= 0)
        clean[field] = Math.min(record[field], limit);
    }
    if (
      Number.isInteger(record.prediction) &&
      record.prediction >= 0 &&
      record.prediction < exercise.prediction.options.length
    ) {
      clean.prediction = record.prediction;
    }
    for (const field of ['predictionCorrect', 'assisted', 'solutionSeen'])
      clean[field] = record[field] === true;
    if (['again', 'practice', 'confident'].includes(record.confidence))
      clean.confidence = record.confidence;
    if (record.result && typeof record.result === 'object')
      clean.result = sanitizeResult(record.result, exercise);
    return clean;
  }
  function sanitize(raw) {
    if (
      !raw ||
      raw.version !== 1 ||
      typeof raw.records !== 'object' ||
      !raw.records ||
      Array.isArray(raw.records)
    ) {
      throw new Error('El laboratorio de esa copia no es compatible.');
    }
    const clean = blank();
    for (const [id, record] of Object.entries(raw.records)) {
      if (!byId.has(id) || !record || typeof record !== 'object') continue;
      clean.records[id] = sanitizeRecord(record, byId.get(id));
    }
    for (const lang of ['rust', 'go']) {
      if (byId.get(raw.selected?.[lang])?.language === lang)
        clean.selected[lang] = raw.selected[lang];
    }
    return clean;
  }
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) state = sanitize(JSON.parse(saved));
  } catch {
    saveAvailable = false;
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      saveAvailable = true;
    } catch {
      saveAvailable = false;
    }
  }
  const recordFor = (id) => state.records[id] || (state.records[id] = {});
  const list = () => exercises.filter((exercise) => exercise.language === language);
  const current = () => byId.get(selectedId);
  function navigationList() {
    const params = new URLSearchParams(location.search),
      system = params.get('sistema'),
      systemIds = system ? window.TallerSystems?.missionIDs(system, language) : [];
    if (systemIds?.includes(selectedId)) return systemIds.map((id) => byId.get(id)).filter(Boolean);
    const worldId = params.get('campana');
    const world =
      worldId && window.TallerCampaignEngine?.getWorlds(language).find((w) => w.id === worldId);
    return world ? world.missionIds.map((id) => byId.get(id)).filter(Boolean) : list();
  }
  function finishNavigation() {
    const params = new URLSearchParams(location.search),
      system = params.get('sistema');
    if (system) {
      location.href = window.TallerSystems.returnURL(system, language);
      return;
    }
    const worldId = params.get('campana');
    if (worldId) {
      location.href = window.TallerCampaign.returnURL(worldId);
      return;
    }
    mode = 'map';
    render();
  }
  const draftFor = (exercise) => recordFor(exercise.id).draft ?? exercise.starter;
  const resultMatches = (item, record) =>
    record.result?.code === draftFor(item) &&
    (record.result.customTest || '') === (record.customTest || '').trim();
  const isSolved = (exercise) => Boolean(state.records[exercise.id]?.solvedAt);
  const isDue = (exercise) =>
    Boolean(
      state.records[exercise.id]?.reviewAt && state.records[exercise.id].reviewAt <= Date.now(),
    );
  const langName = () => (language === 'rust' ? 'Rust' : 'Go');
  function achievementStats() {
    const items = list();
    return {
      solved: items.filter(isSolved).length,
      due: items.filter(isDue).length,
      points: items.reduce((sum, item) => {
        const r = state.records[item.id] || {};
        return (
          sum +
          (r.solvedAt ? 20 : 0) +
          (r.predictionCorrect ? 5 : 0) +
          (r.reflection?.trim().length >= 40 ? 5 : 0)
        );
      }, 0),
      topics: [...new Set(items.map((item) => item.topicId))],
    };
  }
  function mount(element, lang, toast) {
    host = element;
    language = lang;
    notify = toast;
    if (!selectedId || byId.get(selectedId)?.language !== lang) {
      selectedId = state.selected[lang] || list()[0]?.id;
      mode = 'map';
      phase = 'learn';
      query = '';
      dueOnly = false;
    }
    const params = new URLSearchParams(location.search),
      linked = byId.get(params.get('ejercicio'));
    if (linked?.language === lang) {
      selectedId = linked.id;
      mode = 'exercise';
      phase = ['learn', 'code', 'reflect'].includes(params.get('paso'))
        ? params.get('paso')
        : 'learn';
    }
    host.addEventListener('click', onClick);
    host.addEventListener('input', onInput);
    host.addEventListener('change', onExplorerChange);
    host.addEventListener('keydown', onKeydown);
    host.addEventListener('scroll', onScroll, true);
    render();
  }
  function unmount() {
    codeEditor?.destroy();
    codeEditor = null;
    host?.removeEventListener('change', onExplorerChange);
    if (host) {
      host.removeEventListener('click', onClick);
      host.removeEventListener('input', onInput);
      host.removeEventListener('keydown', onKeydown);
      host.removeEventListener('scroll', onScroll, true);
    }
    activeController?.abort();
    activeController = null;
    activeRun = null;
    host = null;
  }
  function render() {
    if (!host) return;
    syncLocation();
    codeEditor?.destroy();
    codeEditor = null;
    window.TallerCampaign?.sync();
    window.TallerSystems?.sync();
    const locked =
      mode === 'exercise' ? window.TallerCampaign?.lockedExerciseHTML(selectedId, language) : '';
    if (locked) {
      host.innerHTML = locked;
      return;
    }
    host.innerHTML = mode === 'map' ? mapHTML() : exerciseHTML();
    if (mode === 'exercise' && phase === 'code') {
      updateGutter();
      updateEditorStatus();
      codeEditor =
        window.TallerEditor?.mount($('#lab-code'), {
          language,
          onRun: runExercise,
          onEscape: () => $('#lab-run')?.focus(),
        }) || null;
    }
  }
  function syncLocation() {
    const url = new URL(location.href);
    if (mode === 'map') {
      url.searchParams.delete('campana');
      url.searchParams.delete('sistema');
    }
    if (mode === 'exercise') {
      url.searchParams.set('ejercicio', selectedId);
      url.searchParams.set('paso', phase);
    } else {
      url.searchParams.delete('ejercicio');
      url.searchParams.delete('paso');
    }
    try {
      history.replaceState(null, '', url);
    } catch (error) {
      void error; /* File previews may not expose the History API. */
    }
  }
  function mapHTML() {
    const stats = achievementStats();
    const candidates = list().filter(
      (item) =>
        (level === 'all' || levelFor(item) === level) &&
        (!extraOnly || (item.stage > 15 && item.stage <= 20)),
    );
    const next =
      candidates.find((item) => !isSolved(item)) ||
      candidates.find(isDue) ||
      candidates[0] ||
      list()[0];
    return `<section class="lab-intro"><div><div class="eyebrow"><span class="eyebrow-line"></span> LABORATORIO · ${langName().toUpperCase()}</div><h1>Aprendé tocando.<br><em>Entendé probando.</em></h1><p>El código lo escribís vos. Un revisor te acompaña con pruebas, pistas y el porqué de cada resultado. Equivocarte también hace avanzar el experimento.</p></div><div class="lab-stamp" aria-label="${list().length} desafíos en ${langName()}"><span>HECHO PARA EXPLORAR</span><strong>${list().length}</strong><span>DESAFÍOS EN ${langName().toUpperCase()}</span></div></section>
    <div class="lab-metrics"><span><strong>${stats.solved}/${list().length}</strong> resueltos</span><span><strong>${stats.topics.length}</strong> temas</span><span><strong>${stats.points}</strong> puntos de práctica</span><span><strong>${stats.due}</strong> para repasar</span></div>
    ${!saveAvailable ? '<div class="lab-storage-warning">El guardado local no está disponible. Exportá tu progreso desde Método y notas antes de cerrar.</div>' : ''}
    <div class="lab-continue"><div><span class="small-label">UN DESAFÍO PARA HOY</span><h2>${escapeHtml(next?.title || 'Tu próximo experimento')}</h2><p>${escapeHtml(next?.objective || '')}</p></div><button class="button" data-lab-action="open" data-id="${escapeHtml(next?.id)}">${stats.solved ? 'Seguir aprendiendo' : 'Entrar al laboratorio'} ↗</button></div>
    <div class="quest-banner"><p><strong>¿Preferís aprender como una expedición?</strong><br>Campaña suma mundos, katas, reparaciones y desafíos finales con desbloqueos.</p><a class="button secondary" href="#campana">Jugar la campaña ↗</a></div>${levelTabsHTML()}<div class="lab-toolbar"><label class="search-wrap"><span aria-hidden="true">⌕</span><input id="lab-search" name="buscar-desafio" autocomplete="off" type="search" value="${escapeHtml(query)}" placeholder="Buscá un tema o desafío…" aria-label="Buscar ejercicios"></label><div class="lab-toolbar-actions"><button class="button small secondary" data-lab-action="extras" aria-pressed="${extraOnly}">Clásicos y sistemas · ${list().filter((item) => item.stage > 15 && item.stage <= 20).length}</button><button class="button small secondary" data-lab-action="surprise">Sorprendeme ↗</button><button class="button small secondary" data-lab-action="due" aria-pressed="${dueOnly}">${dueOnly ? 'Ver todos' : 'Repasar pendientes'}${stats.due ? ' · ' + stats.due : ''}</button></div></div><p id="lab-filter-status" class="lab-filter-status" role="status">${list().filter(matches).length} desafíos visibles${extraOnly ? ' · ampliación Clásicos y sistemas' : ''}.</p><div id="lab-topic-grid" class="topic-grid">${topicsHTML()}</div>
    <div class="lab-map-caption"><span><i class="legend-dot"></i> Resuelto con pruebas</span><span><i class="legend-dot pending"></i> Repaso sugerido</span><span>Podés explorar cualquier tema, sin bloqueos.</span></div>
    <div class="lab-learning-loop"><div><strong>01. Hacé una predicción.</strong><p>Conectá la idea nueva con lo que ya sabés.</p></div><div><strong>02. Probala en código real.</strong><p>El compilador y los casos de prueba aportan evidencia.</p></div><div><strong>03. Explicá el porqué.</strong><p>Una variante y un repaso ayudan a que la idea se quede.</p></div></div><p class="lab-backup-note">${exercises.length} desafíos originales: ${exercises.filter((item) => item.language === 'rust').length} de Rust y ${exercises.filter((item) => item.language === 'go').length} de Go. Cada uno enlaza sus fuentes. Los puntos reconocen práctica; no certifican dominio. Todo tu avance se incluye al exportar la guía.</p>${practiceSourcesHTML()}${window.TallerExplorers?.curriculumHTML(language) || ''}`;
  }
  function levelTabsHTML() {
    return `<div class="lab-levels" role="group" aria-label="Nivel de aprendizaje"><button data-lab-action="level" data-level="all" aria-pressed="${level === 'all'}"><strong>Todos los niveles</strong><span>${list().length} desafíos · a tu ritmo</span></button>${levels.map(([id, title, subtitle]) => `<button data-lab-action="level" data-level="${id}" aria-pressed="${level === id}"><strong>${title}<small>${list().filter((item) => levelFor(item) === id).length}</small></strong><span>${subtitle}</span></button>`).join('')}</div><p class="lab-level-note">Los niveles describen la complejidad de los desafíos. Podés saltar, volver y mezclar temas; completar una etapa no certifica experiencia profesional.</p>`;
  }
  function practiceSourcesHTML() {
    const resources =
      language === 'rust'
        ? [
            [
              'Repará una idea por vez',
              'Rustlings',
              'Pequeños programas y errores que te enseñan a leer al compilador.',
              'https://rustlings.rust-lang.org/usage/',
            ],
            [
              'Seguí una progresión',
              '100 Exercises to Learn Rust',
              'Conceptos breves acompañados de ejercicios y pruebas. Pensado para quienes ya programan.',
              'https://rust-exercises.com/100-exercises/',
            ],
            [
              'Compará distintas soluciones',
              'Exercism · Rust',
              'Más problemas para practicar y contrastar enfoques. La mentoría depende de voluntarios.',
              'https://exercism.org/tracks/rust',
            ],
          ]
        : [
            [
              'Aprendé escribiendo pruebas',
              'Learn Go with Tests',
              'Explorá el lenguaje, escribí expectativas y mejorá el código manteniendo los casos en verde.',
              'https://quii.gitbook.io/learn-go-with-tests',
            ],
            [
              'Construí algo pequeño',
              'Gophercises',
              'Miniaplicaciones y herramientas para conectar funciones, interfaces y concurrencia. Acceso gratuito con correo.',
              'https://gophercises.com/',
            ],
            [
              'Practicá un concepto',
              'Exercism · Go',
              'Problemas por conceptos, análisis automático y mentoría voluntaria, sin promesa de respuesta inmediata.',
              'https://exercism.org/tracks/go',
            ],
          ];
    return `<section class="lab-practice-sources"><div class="eyebrow">MÁS PRÁCTICA, CON UN PROPÓSITO</div><h2>Del ejercicio a tu propia idea.</h2><p>Alterná un desafío corto con una variante tuya. Cuando puedas explicar por qué funciona, llevá esa misma idea a un proyecto pequeño.</p><div class="practice-source-grid">${resources.map(([purpose, title, description, url]) => `<article><span class="small-label">${escapeHtml(purpose)}</span><h3><a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)} ↗</a></h3><p>${escapeHtml(description)}</p></article>`).join('')}</div><details class="lab-community-notes"><summary>Qué tomamos de estos recorridos y de la comunidad</summary><p>Los desafíos de este taller son originales. Combinan conceptos, reparaciones, problemas clásicos y mini sistemas: inspirados en los formatos de práctica de estos recursos, con documentación oficial en cada ejercicio.</p><p>${language === 'rust' ? 'En <a href="https://www.reddit.com/r/learnrust/comments/1tknvle/where_should_i_learn_rust/" target="_blank" rel="noopener noreferrer">esta conversación de r/learnrust (mayo de 2026)</a>, algunas personas recomiendan acompañar las lecturas con Rustlings y proyectos pequeños.' : 'La <a href="https://go.dev/wiki/Learn" target="_blank" rel="noopener noreferrer">Go Wiki</a> incluye estos recursos de la comunidad. En el <a href="https://forum.exercism.org/t/tdd-and-the-golang-track/11535" target="_blank" rel="noopener noreferrer">foro de Exercism</a> se discute la diferencia entre resolver pruebas dadas y aprender a escribir las propias.'} Son referencias y experiencias, no un ranking ni una garantía de resultados. Por eso podés crear tus propios casos y elegir qué dificultad practicar.</p></details></section>`;
  }
  function topicsHTML() {
    const items = list().filter(matches);
    const topics = [...new Set(items.map((item) => item.topicId))];
    if (!topics.length)
      return `<div class="lab-empty"><h2>${dueOnly ? 'Hoy no tenés repasos vencidos.' : 'No encontré ese desafío.'}</h2><p>${dueOnly ? 'Podés avanzar, repetir uno resuelto o elegir un experimento al azar.' : 'Probá buscar “errores”, “slices”, “memoria” o un título.'}</p><button class="button secondary" data-lab-action="clear-search">Ver todos los desafíos</button></div>`;
    return topics
      .map((topic) => {
        const group = items.filter((item) => item.topicId === topic),
          first = group[0];
        const total = list().filter((item) => item.topicId === topic);
        return `<article class="topic-card"><span class="topic-level">${levels.find((entry) => entry[0] === levelFor(first))[1]}</span><div class="topic-head"><span class="topic-index">${String(first.stage).padStart(2, '0')}</span><h2>${escapeHtml(first.topic)}</h2><span class="topic-fraction">${total.filter(isSolved).length}/${total.length}</span></div><div class="challenge-nodes">${group.map((item) => `<button class="challenge-node ${isSolved(item) ? 'is-complete' : ''} ${isDue(item) ? 'is-due' : ''} ${item.id === selectedId ? 'is-current' : ''}" data-lab-action="open" data-id="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}" aria-label="${isSolved(item) ? 'Resuelto. ' : ''}${escapeHtml(item.title)}">${isSolved(item) ? '✓' : item.id.split('-').pop()}</button>`).join('')}</div><p class="topic-note">${group.map((item) => escapeHtml(item.title)).join(' · ')}</p></article>`;
      })
      .join('');
  }
  function openExercise(id) {
    if (!byId.has(id) || byId.get(id).language !== language) return;
    activeController?.abort();
    activeRun = null;
    activeController = null;
    selectedId = id;
    state.selected[language] = id;
    phase = 'learn';
    mode = 'exercise';
    save();
    simulation = {
      ownership: 'create',
      sliceCopied: false,
      sliceOriginal: 20,
      sliceView: 20,
      flow: 0,
    };
    window.TallerExplorers?.reset();
    window.TallerQuestExplorers?.reset();
    render();
    host.scrollIntoView({ block: 'start' });
    $('.lab-exercise-heading h1')?.focus();
  }
  function exerciseHTML() {
    const item = current(),
      record = recordFor(item.id),
      items = navigationList(),
      index = items.findIndex((exercise) => exercise.id === item.id);
    return `${window.TallerSystems?.exerciseContextHTML(item.id, language) || window.TallerCampaign?.exerciseContextHTML(item.id, language) || ''}<div class="lab-breadcrumb"><button class="lab-back" data-lab-action="map">← ${new URLSearchParams(location.search).has('sistema') ? 'Volver al taller' : 'Volver al mapa'}</button><div class="lab-next-controls"><span class="small-label">${index + 1} / ${items.length}</span><button data-lab-action="previous" aria-label="Ejercicio anterior" ${index === 0 ? 'disabled' : ''}>←</button><button data-lab-action="next" aria-label="Ejercicio siguiente" ${index === items.length - 1 ? 'disabled' : ''}>→</button></div></div><header class="lab-exercise-heading"><div class="eyebrow">${langName().toUpperCase()} / ${escapeHtml(levels.find((entry) => entry[0] === levelFor(item))[1])} / ${escapeHtml(item.topic)} / ${item.kind === 'reparar' ? 'REPARÁ EL CÓDIGO' : 'CONSTRUÍ UNA SOLUCIÓN'}</div><h1 tabindex="-1">${escapeHtml(item.title)}</h1><p>${escapeHtml(item.objective)}</p></header><div class="lab-tabs" role="tablist" aria-label="Pasos del desafío">${[
      ['learn', 'Descubrí'],
      ['code', 'Experimentá'],
      ['reflect', 'Explicá'],
    ]
      .map(
        ([id, title], i) =>
          `<button id="lab-tab-${id}" class="lab-tab" role="tab" aria-selected="${phase === id}" aria-controls="lab-phase-panel" tabindex="${phase === id ? 0 : -1}" data-lab-action="phase" data-phase="${id}"><span>0${i + 1}</span> ${title}</button>`,
      )
      .join(
        '',
      )}</div><div id="lab-phase-panel" role="tabpanel" aria-labelledby="lab-tab-${phase}">${phase === 'learn' ? learnHTML(item, record) : phase === 'code' ? codeHTML(item, record) : reflectHTML(item, record)}</div>`;
  }
  function learnHTML(item, record) {
    const quest = window.TallerQuestExplorers?.render(item);
    return `<div class="lab-concept-layout"><article class="concept-article"><h2>La idea que vas a probar.</h2><p>${escapeHtml(item.intro)}</p><div class="concept-why"><h3>¿Por qué funciona así?</h3><p>${escapeHtml(item.why)}</p></div>${sourcesHTML(item)}${quest ? '' : explorerHTML(item)}</article><section class="prediction-card"><span class="small-label">PRIMERO, TU HIPÓTESIS</span><h2>Antes de tocar el código…</h2><p class="prediction-question">${escapeHtml(item.prediction.question)}</p><div class="lab-predictions">${item.prediction.options.map((option, index) => `<button class="lab-prediction ${record.prediction === index && index === item.prediction.answer ? 'is-right' : ''}" data-lab-action="predict" data-answer="${index}" aria-pressed="${record.prediction === index}">${escapeHtml(option)}</button>`).join('')}</div><div id="lab-prediction-feedback" aria-live="polite">${predictionFeedback(item, record)}</div></section></div>${quest || ''}<div class="lab-phase-footer"><p>Podés volver a esta explicación mientras programás. Acertar a la primera no es el objetivo.</p><button class="button" data-lab-action="phase" data-phase="code">Probarlo en código →</button></div>`;
  }
  function predictionFeedback(item, record) {
    if (record.prediction === undefined) return '';
    const correct = record.prediction === item.prediction.answer;
    return `<div class="prediction-response ${correct ? 'is-right' : ''}"><strong>${correct ? 'Esa es la idea.' : 'Veamos qué cambia.'}</strong><br>${escapeHtml(item.prediction.explanation)}</div>`;
  }
  function sourcesHTML(item) {
    return `<div class="concept-sources"><span class="small-label">PARA SEGUIR EL HILO</span>${item.sources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)} ↗</a>`).join('')}</div>`;
  }
  function executionGuideHTML() {
    return `<details class="lab-execution-guide"><summary><span class="execution-dot" aria-hidden="true"></span> Pruebas reales al ejecutar <span class="execution-guide-label">¿Cómo funciona?</span></summary><div class="execution-steps"><div><strong>01 · Escribí una hipótesis</strong><p>El editor guarda tu borrador y ofrece ayuda de sintaxis. Las pruebas se lanzan con <b>Ejecutar y revisar</b> o Ctrl/⌘ + Enter; no con cada tecla.</p></div><div><strong>02 · Compilá y comprobá</strong><p>El Playground oficial compila tu programa y ejecuta los tres casos. Cada expresión debe dar <code>true</code>. Podés abrir las pruebas antes de resolverlas y agregar un caso propio.</p></div><div><strong>03 · Entendé y volvé a probar</strong><p>Si no compila, leé el diagnóstico. Si un caso falla, contrastá su condición y su porqué. Cuando pasan, simplificá tu solución y ejecutá otra vez.</p></div></div><p class="execution-scope">Son comprobaciones de comportamiento dentro de un programa generado por el taller. No se ejecuta un proyecto completo con cargo test o go test. El revisor usa explicaciones preparadas; los modelos visuales son simulaciones del concepto.</p></details>`;
  }
  function programPreviewHTML(item, record) {
    return `<details class="lab-program-preview"><summary>Ver el programa completo y sus pruebas</summary><p>Este es el código que se enviará al ejecutar. Incluye tu borrador, la entrada del programa y las comprobaciones. Los números de línea del compilador corresponden a este programa completo. Podés copiarlo y explorar cómo cada condición produce un resultado.</p><pre id="lab-program-source" tabindex="0" aria-label="Programa completo con pruebas" translate="no">${escapeHtml(buildProgram(item, draftFor(item), record.customTest || ''))}</pre></details>`;
  }
  function updateProgramPreview() {
    const preview = $('#lab-program-source');
    if (preview)
      preview.textContent = buildProgram(
        current(),
        draftFor(current()),
        recordFor(selectedId).customTest || '',
      );
  }
  function codeHTML(item, record) {
    return `${executionGuideHTML()}<div class="lab-workbench"><div><section class="lab-task"><h2>Tu misión.</h2><ol>${item.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join('')}</ol></section><div class="editor-shell"><div class="editor-toolbar"><span class="editor-file">${language === 'rust' ? 'experimento.rs' : 'experimento.go'}</span><button data-lab-action="reset-code">Restaurar inicio ↺</button></div><div class="editor-wrapper"><pre id="lab-line-numbers" class="editor-lines" aria-hidden="true">1</pre><textarea id="lab-code" name="codigo" translate="no" class="code-input" aria-label="Editor de código ${langName()}" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" maxlength="30000" wrap="off">${escapeHtml(draftFor(item))}</textarea></div><div class="editor-footer"><span>Tab: sangría · Ctrl/⌘ + Enter: revisar · Esc: salir del editor</span><span id="lab-editor-status">Borrador guardado</span></div></div><div class="lab-run-bar"><button id="lab-run" class="button" data-lab-action="run" ${activeRun ? 'disabled' : ''}>${activeRun ? '<span class="lab-spinner" aria-hidden="true"></span> Revisando…' : '▷ Ejecutar y revisar'}</button><button class="text-button" data-lab-action="copy-code">Copiar programa completo ↗</button></div><p class="lab-run-disclosure">Al ejecutar, se envía este código al <a href="${language === 'rust' ? 'https://play.rust-lang.org/' : 'https://go.dev/play/'}" target="_blank" rel="noopener noreferrer">Playground oficial de ${langName()}</a>. Necesita conexión. El taller agrega la entrada del programa y las pruebas; editá las funciones del ejercicio.</p>${programPreviewHTML(item, record)}${customEditorHTML(item, record)}<div class="lab-hints"><div class="hints-top"><h3>Un empujón, si lo necesitás.</h3><span>${record.hints || 0}/3 pistas</span></div>${item.hints
      .slice(0, record.hints || 0)
      .map(
        (hint, index) =>
          `<div class="hint-item"><strong>PISTA ${index + 1}</strong>${escapeHtml(hint)}</div>`,
      )
      .join(
        '',
      )}<button class="button small secondary" data-lab-action="hint" ${(record.hints || 0) >= 3 ? 'disabled' : ''}>${record.hints ? 'Otra pista' : 'Dame una pista'}</button><details class="solution-panel" id="lab-solution"><summary data-lab-action="reveal-solution">Ver una solución razonada</summary><p>Usarla como apoyo es válido. Después cerrala y reconstruí la idea. Este intento quedará identificado como práctica con solución.</p><pre class="solution-code" translate="no">${escapeHtml(item.solution)}</pre><p>${escapeHtml(item.review.success)}</p><button class="button small secondary" data-lab-action="load-solution">Cargarla y experimentar</button></details></div></div><aside class="lab-coach" aria-label="Revisión del ejercicio"><div class="coach-heading"><div class="coach-avatar" aria-hidden="true">[?]</div><div><h2>Tu revisor didáctico</h2><span>COMPILADOR + CASOS EXPLICADOS</span></div></div><div class="coach-content" id="lab-review" aria-live="polite">${reviewHTML(item, record)}</div></aside></div><div class="lab-phase-footer"><p>Que compile es el primer paso. Abrí cada prueba para entender qué comprueba y qué deja afuera.</p><button class="button secondary" data-lab-action="phase" data-phase="reflect">Ponerlo en palabras →</button></div>`;
  }
  function reviewHTML(item, record) {
    if (activeRun?.id === item.id)
      return '<h3>Probemos tu hipótesis.</h3><p>El compilador está revisando el programa. Después ejecutamos los casos del ejercicio y conectamos cada resultado con el concepto.</p><p class="runner-status busy"><span class="lab-spinner" aria-hidden="true"></span> Ejecutando código real…</p><button class="text-button" data-lab-action="cancel-run">Cancelar ejecución</button>';
    const result = record.result;
    const stale = result && !resultMatches(item, record);
    if (!result || stale)
      return `<h3>${stale ? 'El código cambió. Revisémoslo.' : '¿Qué queremos comprobar?'}</h3><p>${stale ? 'Los resultados anteriores corresponden a otra versión. Ejecutá de nuevo para comprobar estos cambios.' : escapeHtml(item.review.pitfall)}</p>${testsHTML(item, null)}<div class="coach-callout"><strong>Mientras escribís:</strong> <span id="lab-live-hint">${escapeHtml(liveHint(draftFor(item), item))}</span></div><p class="coach-scope">La revisión combina diagnósticos reales y explicaciones preparadas para este desafío. Las pruebas cubren estos casos; no garantizan todo comportamiento posible.</p>`;
    if (result.transportError)
      return `<h3 class="coach-warning">No pude ejecutar esta vez.</h3><p>${escapeHtml(result.stderr || 'No llegó una respuesta del compilador. Revisá la conexión y probá de nuevo.')}</p><div class="coach-callout">Tu código sigue guardado. No se aprobaron ni desaprobaron pruebas sin ejecutarlas. Podés seguir con las pistas o copiar el programa para probarlo en el Playground.</div>${testsHTML(item, null)}`;
    const passed = result.tests.filter((test) => test.passed).length;
    const complete = passed === item.tests.length && result.success;
    const diagnosis = diagnose(result.stderr, language);
    return `<h3 class="${complete ? 'coach-success' : 'coach-warning'}">${complete ? 'La idea funciona en estos casos.' : result.success ? `${passed} de ${item.tests.length}: encontramos algo para explorar.` : 'El programa nos dejó una pista.'}</h3><p>${escapeHtml(complete ? item.review.success : result.success ? item.tests.find((test) => !result.tests.find((t) => t.id === test.id)?.passed)?.failure || item.review.pitfall : diagnosis.explanation)}</p>${!complete && !result.success ? `<div class="coach-callout"><strong>Probá esto:</strong> ${escapeHtml(diagnosis.action)}</div>` : ''}${testsHTML(item, result)}${customResultHTML(record, result)}${complete ? `<div class="coach-callout"><strong>Una pregunta más:</strong> ${escapeHtml(item.transfer)}</div><button class="button small secondary" data-lab-action="phase" data-phase="reflect">Explicar lo que aprendí →</button>` : ''}<details class="compiler-output"><summary>Ver la salida del compilador y del programa</summary><pre>${escapeHtml((result.stderr || '') + '\n' + (result.stdout || ''))}</pre></details><p class="coach-scope">${record.assisted ? 'Práctica con solución de apoyo. ' : ''}${record.attempts || 0} intento${record.attempts === 1 ? '' : 's'}. Revisar es parte de aprender. La aprobación corresponde a estos ${item.tests.length} casos, no a una revisión completa de diseño.</p>`;
  }
  function customResultHTML(record, result) {
    if (!result.customTest) return '';
    return `<div class="coach-callout"><strong>Tu caso extra: ${!result.success ? 'sin ejecutar' : result.customPassed ? 'superado ✓' : 'encontró una diferencia ×'}</strong><code class="custom-expression">${escapeHtml(result.customTest)}</code><p>Este experimento es independiente de los tres casos del taller. Un caso extra fallido es información nueva: revisá tanto tu expectativa como la implementación.</p></div>`;
  }
  function customEditorHTML(item, record) {
    return `<details class="custom-test-panel" ${record.customTest ? 'open' : ''}><summary>＋ Inventá tu propio caso</summary><p>Elegí un límite, un valor vacío o una hipótesis distinta. Escribí una expresión que devuelva true si tu expectativa se cumple; se ejecuta junto a las pruebas.</p><label for="lab-custom-test">Tu hipótesis en ${langName()}</label><textarea id="lab-custom-test" name="caso-propio" autocomplete="off" translate="no" maxlength="3000" spellcheck="false" placeholder="${escapeHtml(item.tests[0].expression)}">${escapeHtml(record.customTest || '')}</textarea><small>Podés adaptar el ejemplo de arriba. Usá las funciones del ejercicio y sus imports disponibles. Borrá este campo para desactivar el caso.</small></details>`;
  }
  function testsHTML(item, result) {
    return `<p class="test-suite-label">${item.tests.length} casos · abrí cada uno para ver su condición</p><div class="test-list">${item.tests
      .map((test) => {
        const outcome = result?.tests.find((candidate) => candidate.id === test.id);
        const status =
          !result || !result.success ? 'pending' : outcome?.passed ? 'passed' : 'failed';
        return `<details class="test-case ${status}" ${status === 'failed' ? 'open' : ''}><summary><span class="test-indicator" aria-hidden="true">${status === 'passed' ? '✓' : status === 'failed' ? '×' : '○'}</span><span>${escapeHtml(test.label)}<span class="sr-only"> — ${status === 'passed' ? 'superado' : status === 'failed' ? 'falló' : 'sin resultado'}</span></span></summary><div class="test-explanation"><strong>Por qué lo probamos:</strong> ${escapeHtml(test.why)}<span class="test-condition-label">Debe evaluar a true:</span><code>${escapeHtml(test.expression)}</code>${status === 'failed' ? `<strong>Pista:</strong> ${escapeHtml(test.failure)}` : ''}<button class="text-button test-variant" data-lab-action="test-variant" data-test-id="${escapeHtml(test.id)}">Inventar una variante ↗</button></div></details>`;
      })
      .join('')}</div>`;
  }
  function liveHint(code, item) {
    if (/todo!\s*\(|TODO|IMPLEMENTAR|panic\("pendiente/i.test(code))
      return 'Todavía hay una parte por completar. Pensá primero qué entra y qué debería salir.';
    if (!code.trim())
      return 'Volvé al código inicial para conservar las firmas que usan las pruebas.';
    if (/\b(?:fn|func)\s+main\s*\(/.test(code))
      return 'El taller ya agrega main. Mantené acá las funciones de la consigna.';
    return 'No hace falta adivinar: proponé un cambio pequeño y comprobalo. ' + item.review.pitfall;
  }
  function diagnose(stderr, lang) {
    const rules =
      lang === 'rust'
        ? [
            [
              /E0382|use of moved value|borrow of moved value/,
              'Ese valor ya se movió. Para tipos como String, asignar o pasar por valor puede transferir ownership; el nombre anterior deja de poder usarlo.',
              'Identificá dónde se consume el valor. Si solo necesitás leerlo, considerá un préstamo; si necesitás dos valores independientes, razoná sobre una copia explícita.',
            ],
            [
              /E0502|E0499|cannot borrow.*mutable.*immutable|more than once/,
              'Los préstamos que se superponen permiten accesos incompatibles. Rust evita que una modificación conviva con lecturas o escrituras que podrían invalidarse.',
              'Buscá el último uso de cada referencia y reducí el alcance del préstamo antes de pedir otro incompatible.',
            ],
            [
              /E0596|E0384|cannot assign twice|cannot assign to/,
              'Estás intentando modificar un binding o acceder con mutabilidad donde no está permitida. La mutabilidad es una decisión explícita.',
              'Revisá si necesitás let mut, una referencia &mut o simplemente calcular un valor nuevo.',
            ],
            [
              /E0308|mismatched types/,
              'La expresión devuelve un tipo distinto del que promete su contexto. Un punto y coma también puede convertir el resultado de un bloque en ().',
              'Compará los tipos “expected” y “found”. Revisá la última expresión, los brazos de match y los valores devueltos.',
            ],
            [
              /E0106|E0597|does not live long enough|missing lifetime/,
              'Una referencia necesita apuntar a un valor que siga vivo durante su uso. Una anotación de lifetime describe relaciones; no alarga la vida de los datos.',
              'Comprobá quién posee el valor referenciado y si devolvés una referencia a un dato local. Considerá devolver datos propios o relacionar la salida con una entrada.',
            ],
            [
              /E0277|trait bound/,
              'La operación necesita un comportamiento expresado por un trait que el tipo actual no cumple.',
              'Leé el trait que aparece en el diagnóstico y revisá el tipo o la restricción genérica requerida por la consigna.',
            ],
            [
              /E0428|defined multiple times/,
              'Hay dos definiciones con el mismo nombre. El taller agrega main y el código de pruebas.',
              'Editá las funciones iniciales, sin agregar otra función main ni pegar el programa completo de las pruebas.',
            ],
            [
              /expected|unexpected|unclosed delimiter/,
              'La estructura del código no coincide con la sintaxis que espera Rust.',
              'Empezá por el primer diagnóstico: revisá delimitadores, comas, operadores y el lugar señalado. Un error temprano puede producir varios mensajes.',
            ],
          ]
        : [
            [
              /declared and not used|imported and not used/,
              'Go detectó una variable local o un import que no se usa. Eso suele indicar trabajo incompleto o código que ya no hace falta.',
              'Usá el valor que necesitás para resolver la consigna o quitá la declaración sobrante. Revisá también los imports que utiliza el ejercicio.',
            ],
            [
              /cannot use|mismatched types|invalid operation/,
              'Los tipos de esta operación no son compatibles. Go no convierte automáticamente todos los tipos aunque sus representaciones se parezcan.',
              'Compará el tipo recibido con el que espera la función u operador. Convertí explícitamente solo si preserva el significado.',
            ],
            [
              /undefined:/,
              'El compilador no encuentra ese nombre en su alcance.',
              'Buscá una diferencia de escritura, una variable declarada dentro de otro bloque o una función que cambiaste de nombre y que todavía usa una prueba.',
            ],
            [
              /no new variables on left side/,
              'El operador := declara variables nuevas en ese bloque. Acá no está introduciendo ninguna.',
              'Si querés actualizar una variable existente, usá =. Si estás declarando otra, revisá el alcance y el nombre.',
            ],
            [
              /deadlock|all goroutines are asleep/,
              'Las goroutines quedaron esperando sin una operación que pueda destrabarlas. Un canal sin buffer requiere que envío y recepción se encuentren.',
              'Dibujá quién envía, quién recibe y quién cierra. Asegurate de que la operación complementaria pueda ejecutarse.',
            ],
            [
              /index out of range|slice bounds/,
              'Se intentó acceder fuera de los límites de un slice o arreglo.',
              'Revisá el caso vacío y recordá que el último índice válido es len-1. Separá capacidad de longitud.',
            ],
            [
              /redeclared|main redeclared/,
              'Hay más de una declaración con el mismo nombre. El taller prepara package, imports y main.',
              'Mantené en el editor las funciones indicadas, sin agregar package, imports ni main.',
            ],
            [
              /syntax error|expected|unexpected/,
              'El compilador no pudo interpretar esta parte del programa.',
              'Revisá el primer mensaje y su línea. Comprobá llaves, comas, paréntesis y la firma de la función.',
            ],
          ];
    for (const [pattern, explanation, action] of rules)
      if (pattern.test(stderr)) return { explanation, action };
    return {
      explanation:
        'La ejecución no terminó correctamente. La salida original, abajo, muestra el diagnóstico que necesitamos interpretar.',
      action:
        'Empezá por el primer error y comparalo con la firma y el comportamiento pedidos. Pedí una pista si todavía no encontrás la causa.',
    };
  }
  function buildProgram(item, code, customTest = '') {
    if (customTest.trim())
      item = { ...item, tests: [...item.tests, { id: 'custom', expression: customTest.trim() }] };
    if (item.language === 'rust')
      return `${code}\n\nfn main() {\n    std::panic::set_hook(Box::new(|_| {}));\n${item.tests.map((test) => `    let passed = std::panic::catch_unwind(|| { ${test.expression} }).unwrap_or(false);\n    println!("__TALLER_TEST__${test.id}:{}", if passed { "PASS" } else { "FAIL" });`).join('\n')}\n}\n`;
    const imports = [...new Set(['fmt', ...(item.imports || [])])];
    return `package main\n\nimport (\n${imports.map((name) => '    ' + JSON.stringify(name)).join('\n')}\n)\n\n${code}\n\nfunc __tallerCheck(id string, test func() bool) {\n    passed := false\n    func() {\n        defer func() { _ = recover() }()\n        passed = test()\n    }()\n    if passed { fmt.Println("__TALLER_TEST__" + id + ":PASS") } else { fmt.Println("__TALLER_TEST__" + id + ":FAIL") }\n}\n\nfunc main() {\n${item.tests.map((test) => `    __tallerCheck(${JSON.stringify(test.id)}, func() bool { return ${test.expression} })`).join('\n')}\n}\n`;
  }
  async function runExercise() {
    const item = current();
    if (activeRun) return;
    if (window.TallerCampaign?.lockedExerciseHTML(item.id, language)) {
      notify('Completá los requisitos de esta misión en tu campaña.');
      return;
    }
    const record = recordFor(item.id),
      code = draftFor(item),
      customTest = (record.customTest || '').trim();
    if (!code.trim()) {
      notify('Escribí una solución o restaurá el inicio.');
      return;
    }
    record.attempts = (record.attempts || 0) + 1;
    save();
    const run = { id: item.id, code };
    activeRun = run;
    activeController = new AbortController();
    updateRunUI();
    try {
      let runnerResult;
      try {
        runnerResult = await window.TallerRunner.run({
          language: item.language,
          code: buildProgram(item, code, customTest),
          signal: activeController.signal,
        });
      } catch (error) {
        if (activeRun !== run || error.name === 'AbortError') return;
        record.result = {
          code,
          customTest,
          customPassed: false,
          success: false,
          stdout: '',
          stderr: error.message || 'No se pudo conectar al compilador.',
          transportError: true,
          tests: [],
          time: Date.now(),
        };
        save();
        return;
      }
      if (activeRun !== run) return;
      const { result, solved } = interpretRun(item, runnerResult, {
        code,
        customTest,
        now: Date.now(),
      });
      record.result = result;
      if (solved) {
        const first = !record.solvedAt;
        record.solvedAt = record.solvedAt || Date.now();
        if (!record.reviewAt) record.reviewAt = Date.now() + 86400000;
        notify(
          first
            ? '¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.'
            : 'Estos casos siguen funcionando. Probá una variante.',
        );
      }
      save();
      syncAfterRun({
        syncSystems: () => window.TallerSystems?.sync(),
        syncCampaign: () => window.TallerCampaign?.sync(),
        isCampaignMission: () =>
          Boolean(window.TallerCampaignEngine.canAttempt(item.id, language).worldId),
        notify,
        logError: (error) => console.error(error),
      });
    } finally {
      if (activeRun === run) {
        activeRun = null;
        activeController = null;
        updateRunUI();
      }
    }
  }
  function updateRunUI() {
    if (!host || mode !== 'exercise') return;
    const context = $('.quest-lab-context');
    if (context) {
      const box = document.createElement('template');
      box.innerHTML =
        window.TallerSystems?.exerciseContextHTML(selectedId, language) ||
        window.TallerCampaign?.exerciseContextHTML(selectedId, language) ||
        '';
      if (box.content.firstElementChild) context.replaceWith(box.content.firstElementChild);
    }
    if (phase === 'reflect') {
      const box = document.createElement('template');
      box.innerHTML = reflectHTML(current(), recordFor(selectedId));
      $('#lab-reflect-status')?.replaceWith(box.content.querySelector('#lab-reflect-status'));
    }
    if (phase !== 'code') return;
    const button = $('#lab-run');
    if (button) {
      button.disabled = Boolean(activeRun);
      button.innerHTML = activeRun
        ? '<span class="lab-spinner" aria-hidden="true"></span> Revisando…'
        : '▷ Ejecutar y revisar';
    }
    const review = $('#lab-review');
    if (review) review.innerHTML = reviewHTML(current(), recordFor(selectedId));
  }
  function reflectHTML(item, record) {
    const result = record.result;
    const solved =
      result?.success &&
      resultMatches(item, record) &&
      item.tests.every((test) =>
        result.tests.some((outcome) => outcome.id === test.id && outcome.passed),
      );
    return `<div id="lab-reflect-status" role="status">${solved ? `<div class="lab-achievement"><span class="achievement-icon" aria-hidden="true">✳</span><div><strong>${record.assisted ? 'Lo exploraste con una solución de apoyo.' : 'Lo hiciste funcionar. Ahora hacelo tuyo.'}</strong><p>Los ${item.tests.length} casos pasaron. La comprensión se afianza cuando podés explicarlo y resolver una variante.</p></div></div>` : '<div class="coach-callout">Podés reflexionar en cualquier momento. Para verificar este código, volvé a Experimentá y ejecutá las pruebas.</div>'}</div><div class="reflect-layout"><section class="reflect-panel"><h2>¿Cómo se lo explicarías a alguien?</h2><p>Contá qué cambiaste, por qué funciona y qué caso podría romper una solución ingenua. Podés usar un ejemplo propio.</p><label><span class="field-label">Tu explicación, en tus palabras</span><textarea class="reflection-input" id="lab-reflection" name="reflexion" autocomplete="off" maxlength="10000" placeholder="Mi primera idea era… Ahora entiendo que… Un caso que tengo que cuidar es…">${escapeHtml(record.reflection || '')}</textarea></label><p id="lab-reflection-status" class="note-state">${record.reflection?.trim().length >= 40 ? 'Explicación guardada. No la calificamos por longitud: contrastala con el razonamiento de abajo.' : 'Escribir tu razonamiento suma una oportunidad de recordar. Se guarda automáticamente.'}</p><details style="margin-top:20px"><summary style="font-size:12px;cursor:pointer">Contrastar con el razonamiento del revisor</summary><p>${escapeHtml(item.review.success)}</p><p><strong>Cuidado con esta idea:</strong> ${escapeHtml(item.review.pitfall)}</p></details><div class="transfer-card"><h3>Ahora cambiá una condición.</h3><p>${escapeHtml(item.transfer)}</p><button class="button small secondary" data-lab-action="phase" data-phase="code">Volver al editor ↗</button></div></section><section class="reflect-panel"><h2>¿Cuándo querés volver a esto?</h2><p>Esta es tu autoevaluación. Elegí con honestidad: pedir más práctica también es avanzar.</p><div class="confidence-options">${[
      ['again', 'Todavía me cuesta', 'Revisarlo mañana', 1],
      ['practice', 'Lo entiendo, quiero otra vuelta', 'Volver en 3 días', 3],
      ['confident', 'Puedo explicarlo sin mirar', 'Volver en una semana', 7],
    ]
      .map(
        ([id, title, description, days]) =>
          `<button data-lab-action="confidence" data-confidence="${id}" data-days="${days}" aria-pressed="${record.confidence === id}">${title}<small>${description}</small></button>`,
      )
      .join(
        '',
      )}</div>${record.reviewAt ? `<p class="note-state">Próximo repaso: ${escapeHtml(new Date(record.reviewAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }))}. No enviamos notificaciones.</p>` : ''}${sourcesHTML(item)}</section></div><div class="lab-phase-footer"><p>Podés volver a cualquier ejercicio. Las soluciones y las notas quedan guardadas.</p><button class="button" data-lab-action="next">${navigationList().findIndex((candidate) => candidate.id === item.id) === navigationList().length - 1 ? (new URLSearchParams(location.search).has('sistema') ? 'Volver al taller' : 'Volver al mapa') : 'Siguiente experimento'} →</button></div>`;
  }
  function explorerHTML(item) {
    const special = window.TallerExplorers?.render(item);
    if (special) return special;
    if (item.visual === 'none') return '';
    if (language === 'rust' && (item.visual === 'ownership' || item.visual === 'memory'))
      return `<section class="lab-explorer"><h3>Mové la idea, no solo el código.</h3><p>Modelo conceptual: un String llamado origen. Probá cada operación y mirá quién puede usar sus datos.</p><div class="explorer-actions" role="group" aria-label="Operación de ownership">${[
        ['create', 'Crear'],
        ['move', 'Mover'],
        ['borrow', 'Prestar'],
        ['clone', 'Clonar'],
      ]
        .map(
          ([id, label]) =>
            `<button data-lab-action="ownership" data-operation="${id}" aria-pressed="${simulation.ownership === id}">${label}</button>`,
        )
        .join('')}</div><div id="lab-memory-visual">${ownershipVisual()}</div></section>`;
    if (
      language === 'go' &&
      (item.visual === 'memory' || item.visual === 'collections' || item.visual === 'ownership')
    )
      return `<section class="lab-explorer"><h3>Dos slices, ¿los mismos datos?</h3><p>Modelo conceptual: vista := original[1:]. Cambiá un valor o hacé una copia independiente antes de modificarlo.</p><div class="explorer-actions"><button data-lab-action="slice-copy" aria-pressed="${simulation.sliceCopied}">Copia independiente</button><button data-lab-action="slice-change">vista[0] += 1</button><button data-lab-action="slice-reset">Reiniciar ↺</button></div><div id="lab-slice-visual">${sliceVisual()}</div></section>`;
    return `<section class="lab-explorer"><h3>Seguí el razonamiento.</h3><p>Usá este pequeño recorrido para conectar una entrada con la decisión que toma tu programa.</p><div id="lab-flow">${flowVisual(item)}</div><div class="explorer-actions"><button data-lab-action="flow">${simulation.flow < 2 ? 'Siguiente paso →' : 'Volver al inicio ↺'}</button></div></section>`;
  }
  function ownershipVisual() {
    const operation = simulation.ownership;
    const explanations = {
      create:
        'origen posee el String. Cuando su dueño termina, se liberan sus recursos, salvo que la propiedad se haya transferido.',
      move: 'destino pasa a poseer el String. origen ya no puede usarse. Se transfiere la propiedad; no se duplica el contenido del String.',
      borrow:
        'referencia lee el String sin tomar su propiedad. origen sigue siendo el dueño. Mientras ese préstamo compartido siga en uso, no puede haber un préstamo mutable incompatible.',
      clone:
        'destino posee un String independiente. Los dos dueños pueden usarse; clonar String copia su contenido y tiene un costo.',
    };
    return `<div class="memory-diagram"><div><div class="memory-binding ${operation === 'move' ? 'moved' : ''}">origen<span>${operation === 'move' ? 'ya movido' : 'dueño'}</span></div>${operation !== 'create' ? `<div class="memory-binding memory-copy">${operation === 'borrow' ? 'referencia' : 'destino'}<span>${operation === 'borrow' ? '&String · lectura' : 'dueño'}</span></div>` : ''}</div><div class="memory-arrow" aria-hidden="true">→</div><div><div class="memory-value">"hola"</div>${operation === 'clone' ? '<div class="memory-value memory-copy">"hola" · copia</div>' : ''}</div></div><div class="explorer-explanation" role="status">${explanations[operation]}</div>`;
  }
  function sliceVisual() {
    const original = [10, simulation.sliceOriginal, 30],
      view = [simulation.sliceView, 30];
    return `<div class="slice-row"><span class="slice-label">original</span>${original.map((value, index) => `<span class="slice-cell ${index > 0 && !simulation.sliceCopied ? 'shared' : ''}">${value}</span>`).join('')}</div><div class="slice-row"><span class="slice-label">vista</span>${view.map((value) => `<span class="slice-cell ${simulation.sliceCopied ? 'independent' : 'shared'}">${value}</span>`).join('')}</div><div class="explorer-explanation" role="status">${simulation.sliceCopied ? 'La copia tiene su propio arreglo de respaldo. Cambiar un elemento de vista ya no cambia original. El slice y los datos que referencia son cosas distintas.' : 'Los dos slices comparten parte del arreglo de respaldo. Modificar vista[0] cambia el mismo elemento que original[1]. Crear otro slice no copió los elementos.'}</div>`;
  }
  function flowVisual(item) {
    return `<div class="flow-steps">${[
      ['Entrada', '¿Qué recibe esta función? Incluí un caso vacío o límite.'],
      ['Decisión', item.why],
      ['Resultado', item.tests[0].why],
    ]
      .map(
        ([label, text], index) =>
          `<div class="flow-step ${simulation.flow === index ? 'active' : ''}"><span>0${index + 1}</span><div><strong>${label}</strong>${simulation.flow === index ? `<br>${escapeHtml(text)}` : ''}</div></div>`,
      )
      .join('')}</div>`;
  }
  function updateGutter() {
    const editor = $('#lab-code'),
      gutter = $('#lab-line-numbers');
    if (!editor || !gutter) return;
    gutter.textContent = Array.from(
      { length: editor.value.split('\n').length },
      (_, index) => index + 1,
    ).join('\n');
    gutter.scrollTop = editor.scrollTop;
  }
  function updateEditorStatus() {
    const status = $('#lab-editor-status');
    if (status) status.textContent = saveAvailable ? 'Borrador guardado' : 'Exportá para conservar';
  }
  function changePhase(next) {
    phase = next;
    render();
    $(`#lab-tab-${next}`)?.focus({ preventScroll: true });
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      notify('Código copiado. Incluye las pruebas.');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      let success = false;
      try {
        success = document.execCommand('copy');
      } catch (error) {
        void error; /* Selection fallback remains available below. */
      }
      textarea.remove();
      notify(
        success
          ? 'Código copiado.'
          : 'No se pudo copiar automáticamente. Probá seleccionar el texto.',
      );
    }
  }
  function askConfirmation(title, message, action) {
    let dialog = document.getElementById('lab-confirm-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'lab-confirm-dialog';
      dialog.className = 'lab-modal';
      document.body.appendChild(dialog);
      dialog.addEventListener('click', (event) => {
        const target = event.target.closest('[data-confirm]');
        if (!target) return;
        if (target.dataset.confirm === 'yes') {
          const callback = confirmAction;
          dialog.close();
          confirmAction = null;
          callback?.();
        } else {
          dialog.close();
          confirmAction = null;
          lastFocus?.focus();
        }
      });
    }
    dialog.setAttribute('aria-labelledby', 'lab-confirm-title');
    dialog.innerHTML = `<div class="dialog-content"><h2 id="lab-confirm-title">${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><div class="dialog-actions"><button class="button secondary" data-confirm="no">Conservar mi código</button><button class="button" data-confirm="yes">Continuar</button></div></div>`;
    confirmAction = action;
    lastFocus = document.activeElement;
    dialog.showModal();
  }
  function onClick(event) {
    const button = event.target.closest('[data-lab-action]');
    if (!button) return;
    const action = button.dataset.labAction;
    if (action === 'quest-explore') {
      window.TallerQuestExplorers?.act(button, current(), host);
      return;
    }
    if (action === 'explore') {
      window.TallerExplorers?.act(button, current(), host);
      return;
    }
    if (action === 'open') openExercise(button.dataset.id);
    if (action === 'map') {
      activeController?.abort();
      activeRun = null;
      finishNavigation();
      host?.scrollIntoView({ block: 'start' });
    }
    if (action === 'phase') changePhase(button.dataset.phase);
    if (action === 'previous' || action === 'next') {
      const items = navigationList(),
        index = items.findIndex((item) => item.id === selectedId) + (action === 'next' ? 1 : -1);
      if (items[index]) openExercise(items[index].id);
      else finishNavigation();
    }
    if (action === 'surprise') {
      const candidates = list().filter(matches);
      const pool = candidates.filter((item) => isDue(item) || !isSolved(item));
      const choices = pool.length ? pool : candidates;
      if (!choices.length) {
        notify('No hay desafíos con estos filtros. Probá ampliar la búsqueda.');
        return;
      }
      openExercise(choices[Math.floor(Math.random() * choices.length)].id);
      notify('Un desafío elegido para tu próxima idea.');
    }
    if (action === 'due') {
      dueOnly = !dueOnly;
      render();
    }
    if (action === 'level') {
      level = button.dataset.level;
      render();
      $(`[data-lab-action="level"][data-level="${level}"]`)?.focus({ preventScroll: true });
    }
    if (action === 'extras') {
      extraOnly = !extraOnly;
      render();
      $('[data-lab-action="extras"]')?.focus({ preventScroll: true });
    }
    if (action === 'clear-search') {
      query = '';
      dueOnly = false;
      extraOnly = false;
      level = 'all';
      render();
    }
    if (action === 'predict') {
      const item = current(),
        record = recordFor(item.id);
      record.prediction = Number(button.dataset.answer);
      if (record.prediction === item.prediction.answer) record.predictionCorrect = true;
      save();
      $$('.lab-prediction').forEach((option, index) => {
        option.setAttribute('aria-pressed', String(index === record.prediction));
        option.classList.toggle(
          'is-right',
          index === record.prediction && index === item.prediction.answer,
        );
      });
      $('#lab-prediction-feedback').innerHTML = predictionFeedback(item, record);
      window.TallerSystems?.sync();
      const game = window.TallerCampaign?.sync();
      if (game?.xpGained && window.TallerCampaignEngine.canAttempt(item.id, language).worldId)
        notify(`+${game.xpGained} XP por razonar tu predicción.`);
      const context = $('.quest-lab-context');
      if (context) {
        const box = document.createElement('template');
        box.innerHTML =
          window.TallerSystems?.exerciseContextHTML(selectedId, language) ||
          window.TallerCampaign?.exerciseContextHTML(selectedId, language) ||
          '';
        context.replaceWith(box.content.firstElementChild);
      }
    }
    if (action === 'test-variant') {
      const record = recordFor(selectedId),
        test = current().tests.find((candidate) => candidate.id === button.dataset.testId);
      if (!test) return;
      const input = $('#lab-custom-test'),
        hasCustom = Boolean((record.customTest || '').trim());
      if (!hasCustom) {
        record.customTest = test.expression;
        input.value = test.expression;
        save();
        updateProgramPreview();
        if (!activeRun) updateRunUI();
      }
      $('.custom-test-panel').open = true;
      input.focus();
      input.select();
      input.scrollIntoView({ block: 'center' });
      notify(
        hasCustom
          ? 'Conservé tu caso extra. Podés editarlo o borrarlo para partir de otra prueba.'
          : 'Cambiá una entrada o expectativa y ejecutá. Tu caso extra se revisa por separado.',
      );
    }
    if (action === 'run') runExercise();
    if (action === 'cancel-run') {
      activeController?.abort();
      activeRun = null;
      activeController = null;
      updateRunUI();
      notify('Ejecución cancelada. Tu código sigue guardado.');
    }
    if (action === 'hint') {
      const record = recordFor(selectedId);
      record.hints = Math.min(3, (record.hints || 0) + 1);
      save();
      const content = document.createElement('template');
      content.innerHTML = codeHTML(current(), record);
      $('.lab-hints').replaceWith(content.content.querySelector('.lab-hints'));
      $('[data-lab-action="hint"]')?.focus({ preventScroll: true });
      $('.lab-hints')?.scrollIntoView({ block: 'nearest' });
    }
    if (action === 'reveal-solution' && !$('#lab-solution').open) {
      const record = recordFor(selectedId);
      record.solutionSeen = true;
      record.assisted = true;
      save();
    }
    if (action === 'reset-code')
      askConfirmation(
        '¿Volver al código inicial?',
        'Se reemplazará el borrador de este ejercicio. Tus resultados anteriores y notas se conservan.',
        () => {
          recordFor(selectedId).draft = current().starter;
          save();
          render();
          if (codeEditor) codeEditor.focus();
          else $('#lab-code')?.focus();
        },
      );
    if (action === 'load-solution')
      askConfirmation(
        '¿Cargar la solución de apoyo?',
        'Reemplazará tu borrador. Probá ejecutarla y cambiar una condición para comprobar que entendiste la idea.',
        () => {
          const record = recordFor(selectedId);
          record.draft = current().solution;
          record.assisted = true;
          save();
          render();
          if (codeEditor) codeEditor.focus();
          else $('#lab-code')?.focus();
        },
      );
    if (action === 'copy-code')
      copyText(
        buildProgram(current(), draftFor(current()), recordFor(selectedId).customTest || ''),
      );
    if (action === 'confidence') {
      const record = recordFor(selectedId);
      record.confidence = button.dataset.confidence;
      record.reviewedAt = Date.now();
      record.reviewAt = Date.now() + Number(button.dataset.days) * 86400000;
      save();
      render();
      notify('Repaso agendado en tu mapa de aprendizaje.');
    }
    if (action === 'ownership') {
      simulation.ownership = button.dataset.operation;
      $$('[data-lab-action="ownership"]').forEach((option) =>
        option.setAttribute(
          'aria-pressed',
          String(option.dataset.operation === simulation.ownership),
        ),
      );
      $('#lab-memory-visual').innerHTML = ownershipVisual();
    }
    if (action === 'slice-copy') {
      simulation.sliceCopied = !simulation.sliceCopied;
      simulation.sliceView = simulation.sliceOriginal;
      button.setAttribute('aria-pressed', String(simulation.sliceCopied));
      button.textContent = simulation.sliceCopied ? 'Volver a compartir' : 'Copia independiente';
      $('#lab-slice-visual').innerHTML = sliceVisual();
    }
    if (action === 'slice-change') {
      simulation.sliceView++;
      if (!simulation.sliceCopied) simulation.sliceOriginal = simulation.sliceView;
      $('#lab-slice-visual').innerHTML = sliceVisual();
    }
    if (action === 'slice-reset') {
      simulation.sliceCopied = false;
      simulation.sliceOriginal = 20;
      simulation.sliceView = 20;
      $('[data-lab-action="slice-copy"]').textContent = 'Copia independiente';
      $('[data-lab-action="slice-copy"]').setAttribute('aria-pressed', 'false');
      $('#lab-slice-visual').innerHTML = sliceVisual();
    }
    if (action === 'flow') {
      simulation.flow = (simulation.flow + 1) % 3;
      $('#lab-flow').innerHTML = flowVisual(current());
      button.textContent = simulation.flow < 2 ? 'Siguiente paso →' : 'Volver al inicio ↺';
    }
  }
  function onInput(event) {
    const target = event.target;
    if (target.id === 'lab-search') {
      query = target.value;
      $('#lab-topic-grid').innerHTML = topicsHTML();
      const count = list().filter(matches).length;
      $('#lab-filter-status').textContent =
        `${count} desafíos visibles${query ? ' para tu búsqueda' : ''}${extraOnly ? ' · ampliación Clásicos y sistemas' : ''}.`;
    }
    if (target.id === 'lab-code' || target.id === 'lab-custom-test') {
      const record = recordFor(selectedId),
        wasCurrent = resultMatches(current(), record);
      record[target.id === 'lab-code' ? 'draft' : 'customTest'] = target.value;
      save();
      updateGutter();
      updateEditorStatus();
      updateProgramPreview();
      if (!activeRun && (wasCurrent || resultMatches(current(), record))) {
        $('#lab-review').innerHTML = reviewHTML(current(), record);
      }
      const hint = $('#lab-live-hint');
      if (hint) hint.textContent = liveHint(draftFor(current()), current());
    }
    if (target.id === 'lab-reflection') {
      recordFor(selectedId).reflection = target.value;
      save();
      $('#lab-reflection-status').textContent = saveAvailable
        ? 'Tu explicación está guardada. Contrastala con el razonamiento del revisor.'
        : 'El guardado no está disponible: exportá tu avance.';
    }
  }
  function onKeydown(event) {
    if (event.target.id === 'lab-code') {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        runExercise();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        $('#lab-run')?.focus();
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        const editor = event.target,
          start = editor.selectionStart,
          end = editor.selectionEnd;
        if (event.shiftKey) {
          const lineStart = editor.value.lastIndexOf('\n', start - 1) + 1;
          const prefix = editor.value.slice(lineStart, start);
          const remove = Math.min(4, (prefix.match(/^ */) || [''])[0].length);
          if (remove) editor.setRangeText('', lineStart, lineStart + remove, 'end');
        } else editor.setRangeText('    ', start, end, 'end');
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    const tab = event.target.closest('[role="tab"]');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const phases = ['learn', 'code', 'reflect'];
      let index = phases.indexOf(phase);
      index =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? 2
            : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      changePhase(phases[index]);
    }
  }
  function onScroll(event) {
    if (event.target.id === 'lab-code') {
      const gutter = $('#lab-line-numbers');
      if (gutter) gutter.scrollTop = event.target.scrollTop;
    }
  }
  function onExplorerChange(event) {
    if (mode === 'exercise') window.TallerExplorers?.change(event.target, current(), host);
  }
  window.TallerLab = {
    mount,
    unmount,
    buildProgram,
    validateImport: sanitize,
    getExercises: () => exercises,
    exportState: () => cloneJson(state),
    importState(raw) {
      const incoming = sanitize(raw);
      for (const [id, record] of Object.entries(incoming.records))
        state.records[id] = mergeRecord(state.records[id], record);
      for (const lang of ['rust', 'go'])
        if (incoming.selected[lang]) state.selected[lang] = incoming.selected[lang];
      save();
    },
    reset() {
      state = blank();
      selectedId = null;
      mode = 'map';
      phase = 'learn';
      activeController?.abort();
      activeRun = null;
      save();
    },
  };
})();
