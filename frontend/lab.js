import {
  buildProgram,
  draftOf,
  ensureRecord,
  exerciseCatalog,
  hintPatch,
  interpretRun,
  isDueForReview,
  isReflectionSolved,
  isResultCurrent,
  isSolved,
  labStore,
  levelOf,
  liveHint,
  loadSolutionPatch,
  normalizeCustomTest,
  practicePointsOf,
  predictionPatch,
  restoreStarterPatch,
  revealSolutionPatch,
  reviewStateOf,
  selfAssessmentPatch,
  syncAfterRun,
} from './src/entities/exercise';
import { isExtraChallenge, matchesMapFilters, surprisePool, todayChallenge } from './src/pages/lab';
import { LEVEL_LABELS } from './src/shared/config/levels';
import { exercisePhaseOr, readLinkQuery, withLabQuery } from './src/shared/config/url-grammar';
import { escapeHtml } from './src/shared/lib/escape-html';
(() => {
  'use strict';
  function init() {
    exerciseCatalog.init({
      rustLab: window.RUST_LAB || [],
      rustQuests: window.RUST_QUESTS || [],
      goLab: window.GO_LAB || [],
      goQuests: window.GO_QUESTS || [],
      systemsLowlevel: window.SYSTEMS_LOWLEVEL_LABS || [],
      systemsInfra: window.SYSTEMS_INFRA_LABS || [],
      systemsPlay: window.SYSTEMS_PLAY_LABS || [],
      systemsPc: window.SYSTEMS_PC_LABS || [],
    });
    // Nunca escribe al cargar: la primera escritura es una acción del alumno.
    labStore.open(exerciseCatalog);
  }
  const $ = (selector) => host?.querySelector(selector);
  const $$ = (selector) => (host ? [...host.querySelectorAll(selector)] : []);
  let host = null,
    language = 'rust',
    notify = () => {},
    selectedId = null,
    phase = 'learn';
  let mode = 'map',
    query = '',
    dueOnly = false,
    extraOnly = false,
    level = 'all';
  const levels = [
    ['beginner', 'Inicial', 'Entendé las piezas'],
    ['medium', 'Intermedio', 'Conectá las ideas'],
    ['advanced', 'Avanzado', 'Elegí con criterio'],
    ['expert', 'Experto', 'Razoná sobre los límites'],
  ];
  const records = () => labStore.getProgress().records;
  const filters = () => ({ query, dueOnly, extraOnly, level });
  const matches = (item) => matchesMapFilters(item, records(), filters(), Date.now());
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
  function save() {
    return labStore.save();
  }
  const recordFor = (id) => ensureRecord(labStore.getProgress(), id);
  const list = () => exerciseCatalog.exercises.filter((exercise) => exercise.language === language);
  const current = () => exerciseCatalog.byId.get(selectedId);
  function navigationList() {
    const link = readLinkQuery(location.search),
      system = link.missionWorkshop,
      systemIds = system ? window.TallerSystems?.missionIDs(system, language) : [];
    if (systemIds?.includes(selectedId))
      return systemIds.map((id) => exerciseCatalog.byId.get(id)).filter(Boolean);
    const worldId = link.missionWorld;
    const world =
      worldId && window.TallerCampaignEngine?.getWorlds(language).find((w) => w.id === worldId);
    return world
      ? world.missionIds.map((id) => exerciseCatalog.byId.get(id)).filter(Boolean)
      : list();
  }
  function finishNavigation() {
    const link = readLinkQuery(location.search),
      system = link.missionWorkshop;
    if (system) {
      location.href = window.TallerSystems.returnURL(system, language);
      return;
    }
    const worldId = link.missionWorld;
    if (worldId) {
      location.href = window.TallerCampaign.returnURL(worldId);
      return;
    }
    mode = 'map';
    render();
  }
  const draftFor = (exercise) => draftOf(exercise, recordFor(exercise.id));
  const solved = (exercise) => isSolved(records()[exercise.id]);
  const due = (exercise) => isDueForReview(records()[exercise.id], Date.now());
  const levelLabel = (exercise) => LEVEL_LABELS[levelOf(exercise)];
  const programFor = (item) =>
    buildProgram(item, draftFor(item), normalizeCustomTest(recordFor(item.id).customTest));
  const langName = () => (language === 'rust' ? 'Rust' : 'Go');
  function achievementStats() {
    const items = list();
    return {
      solved: items.filter(solved).length,
      due: items.filter(due).length,
      points: items.reduce((sum, item) => sum + practicePointsOf(records()[item.id]), 0),
      topics: [...new Set(items.map((item) => item.topicId))],
    };
  }
  function mount(element, lang, toast) {
    host = element;
    language = lang;
    notify = toast;
    if (!selectedId || exerciseCatalog.byId.get(selectedId)?.language !== lang) {
      selectedId = labStore.getProgress().selected[lang] || list()[0]?.id;
      mode = 'map';
      phase = 'learn';
      query = '';
      dueOnly = false;
    }
    const link = readLinkQuery(location.search),
      linked = exerciseCatalog.byId.get(link.exercise);
    if (linked?.language === lang) {
      selectedId = linked.id;
      mode = 'exercise';
      phase = exercisePhaseOr(link.phase, 'learn');
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
    window.TallerCampaign?.refresh();
    window.TallerSystems?.refresh();
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
    const url = withLabQuery(new URL(location.href), mode, selectedId, phase);
    try {
      history.replaceState(null, '', url);
    } catch (error) {
      void error; /* File previews may not expose the History API. */
    }
  }
  function mapHTML() {
    const stats = achievementStats();
    const next = todayChallenge(list(), records(), { level, extraOnly }, Date.now());
    return `<section class="lab-intro"><div><div class="eyebrow"><span class="eyebrow-line"></span> LABORATORIO · ${langName().toUpperCase()}</div><h1>Aprendé tocando.<br><em>Entendé probando.</em></h1><p>El código lo escribís vos. Un revisor te acompaña con pruebas, pistas y el porqué de cada resultado. Equivocarte también hace avanzar el experimento.</p></div><div class="lab-stamp" aria-label="${list().length} desafíos en ${langName()}"><span>HECHO PARA EXPLORAR</span><strong>${list().length}</strong><span>DESAFÍOS EN ${langName().toUpperCase()}</span></div></section>
    <div class="lab-metrics"><span><strong>${stats.solved}/${list().length}</strong> resueltos</span><span><strong>${stats.topics.length}</strong> temas</span><span><strong>${stats.points}</strong> puntos de práctica</span><span><strong>${stats.due}</strong> para repasar</span></div>
    ${!labStore.storageAvailable() ? '<div class="lab-storage-warning">El guardado local no está disponible. Exportá tu progreso desde Método y notas antes de cerrar.</div>' : ''}
    ${labStore.loadWarning() ? `<div class="lab-storage-warning">${escapeHtml(labStore.loadWarning())} Exportá tu progreso desde Método y notas para conservar lo que sigue.</div>` : ''}
    <div class="lab-continue"><div><span class="small-label">UN DESAFÍO PARA HOY</span><h2>${escapeHtml(next?.title || 'Tu próximo experimento')}</h2><p>${escapeHtml(next?.objective || '')}</p></div><button class="button" data-lab-action="open" data-id="${escapeHtml(next?.id)}">${stats.solved ? 'Seguir aprendiendo' : 'Entrar al laboratorio'} ↗</button></div>
    <div class="quest-banner"><p><strong>¿Preferís aprender como una expedición?</strong><br>Campaña suma mundos, katas, reparaciones y desafíos finales con desbloqueos.</p><a class="button secondary" href="#campana">Jugar la campaña ↗</a></div>${levelTabsHTML()}<div class="lab-toolbar"><label class="search-wrap"><span aria-hidden="true">⌕</span><input id="lab-search" name="buscar-desafio" autocomplete="off" type="search" value="${escapeHtml(query)}" placeholder="Buscá un tema o desafío…" aria-label="Buscar ejercicios"></label><div class="lab-toolbar-actions"><button class="button small secondary" data-lab-action="extras" aria-pressed="${extraOnly}">Clásicos y sistemas · ${list().filter(isExtraChallenge).length}</button><button class="button small secondary" data-lab-action="surprise">Sorprendeme ↗</button><button class="button small secondary" data-lab-action="due" aria-pressed="${dueOnly}">${dueOnly ? 'Ver todos' : 'Repasar pendientes'}${stats.due ? ' · ' + stats.due : ''}</button></div></div><p id="lab-filter-status" class="lab-filter-status" role="status">${list().filter(matches).length} desafíos visibles${extraOnly ? ' · ampliación Clásicos y sistemas' : ''}.</p><div id="lab-topic-grid" class="topic-grid">${topicsHTML()}</div>
    <div class="lab-map-caption"><span><i class="legend-dot"></i> Resuelto con pruebas</span><span><i class="legend-dot pending"></i> Repaso sugerido</span><span>Podés explorar cualquier tema, sin bloqueos.</span></div>
    <div class="lab-learning-loop"><div><strong>01. Hacé una predicción.</strong><p>Conectá la idea nueva con lo que ya sabés.</p></div><div><strong>02. Probala en código real.</strong><p>El compilador y los casos de prueba aportan evidencia.</p></div><div><strong>03. Explicá el porqué.</strong><p>Una variante y un repaso ayudan a que la idea se quede.</p></div></div><p class="lab-backup-note">${exerciseCatalog.exercises.length} desafíos originales: ${exerciseCatalog.exercises.filter((item) => item.language === 'rust').length} de Rust y ${exerciseCatalog.exercises.filter((item) => item.language === 'go').length} de Go. Cada uno enlaza sus fuentes. Los puntos reconocen práctica; no certifican dominio. Todo tu avance se incluye al exportar la guía.</p>${practiceSourcesHTML()}${window.TallerExplorers?.curriculumHTML(language) || ''}`;
  }
  function levelTabsHTML() {
    return `<div class="lab-levels" role="group" aria-label="Nivel de aprendizaje"><button data-lab-action="level" data-level="all" aria-pressed="${level === 'all'}"><strong>Todos los niveles</strong><span>${list().length} desafíos · a tu ritmo</span></button>${levels.map(([id, title, subtitle]) => `<button data-lab-action="level" data-level="${id}" aria-pressed="${level === id}"><strong>${title}<small>${list().filter((item) => levelOf(item) === id).length}</small></strong><span>${subtitle}</span></button>`).join('')}</div><p class="lab-level-note">Los niveles describen la complejidad de los desafíos. Podés saltar, volver y mezclar temas; completar una etapa no certifica experiencia profesional.</p>`;
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
        return `<article class="topic-card"><span class="topic-level">${levelLabel(first)}</span><div class="topic-head"><span class="topic-index">${String(first.stage).padStart(2, '0')}</span><h2>${escapeHtml(first.topic)}</h2><span class="topic-fraction">${total.filter(solved).length}/${total.length}</span></div><div class="challenge-nodes">${group.map((item) => `<button class="challenge-node ${solved(item) ? 'is-complete' : ''} ${due(item) ? 'is-due' : ''} ${item.id === selectedId ? 'is-current' : ''}" data-lab-action="open" data-id="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}" aria-label="${solved(item) ? 'Resuelto. ' : ''}${escapeHtml(item.title)}">${solved(item) ? '✓' : item.id.split('-').pop()}</button>`).join('')}</div><p class="topic-note">${group.map((item) => escapeHtml(item.title)).join(' · ')}</p></article>`;
      })
      .join('');
  }
  function openExercise(id) {
    if (!exerciseCatalog.byId.has(id) || exerciseCatalog.byId.get(id).language !== language) return;
    activeController?.abort();
    activeRun = null;
    activeController = null;
    selectedId = id;
    labStore.getProgress().selected[language] = id;
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
    return `${window.TallerSystems?.exerciseContextHTML(item.id, language) || window.TallerCampaign?.exerciseContextHTML(item.id, language) || ''}<div class="lab-breadcrumb"><button class="lab-back" data-lab-action="map">← ${readLinkQuery(location.search).missionWorkshop !== null ? 'Volver al taller' : 'Volver al mapa'}</button><div class="lab-next-controls"><span class="small-label">${index + 1} / ${items.length}</span><button data-lab-action="previous" aria-label="Ejercicio anterior" ${index === 0 ? 'disabled' : ''}>←</button><button data-lab-action="next" aria-label="Ejercicio siguiente" ${index === items.length - 1 ? 'disabled' : ''}>→</button></div></div><header class="lab-exercise-heading"><div class="eyebrow">${langName().toUpperCase()} / ${escapeHtml(levelLabel(item))} / ${escapeHtml(item.topic)} / ${item.kind === 'reparar' ? 'REPARÁ EL CÓDIGO' : 'CONSTRUÍ UNA SOLUCIÓN'}</div><h1 tabindex="-1">${escapeHtml(item.title)}</h1><p>${escapeHtml(item.objective)}</p></header><div class="lab-tabs" role="tablist" aria-label="Pasos del desafío">${[
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
  function programPreviewHTML(item) {
    return `<details class="lab-program-preview"><summary>Ver el programa completo y sus pruebas</summary><p>Este es el código que se enviará al ejecutar. Incluye tu borrador, la entrada del programa y las comprobaciones. Los números de línea del compilador corresponden a este programa completo. Podés copiarlo y explorar cómo cada condición produce un resultado.</p><pre id="lab-program-source" tabindex="0" aria-label="Programa completo con pruebas" translate="no">${escapeHtml(programFor(item))}</pre></details>`;
  }
  function updateProgramPreview() {
    const preview = $('#lab-program-source');
    if (preview) preview.textContent = programFor(current());
  }
  function codeHTML(item, record) {
    return `${executionGuideHTML()}<div class="lab-workbench"><div><section class="lab-task"><h2>Tu misión.</h2><ol>${item.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join('')}</ol></section><div class="editor-shell"><div class="editor-toolbar"><span class="editor-file">${language === 'rust' ? 'experimento.rs' : 'experimento.go'}</span><button data-lab-action="reset-code">Restaurar inicio ↺</button></div><div class="editor-wrapper"><pre id="lab-line-numbers" class="editor-lines" aria-hidden="true">1</pre><textarea id="lab-code" name="codigo" translate="no" class="code-input" aria-label="Editor de código ${langName()}" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" maxlength="30000" wrap="off">${escapeHtml(draftFor(item))}</textarea></div><div class="editor-footer"><span>Tab: sangría · Ctrl/⌘ + Enter: revisar · Esc: salir del editor</span><span id="lab-editor-status">Borrador guardado</span></div></div><div class="lab-run-bar"><button id="lab-run" class="button" data-lab-action="run" ${activeRun ? 'disabled' : ''}>${activeRun ? '<span class="lab-spinner" aria-hidden="true"></span> Revisando…' : '▷ Ejecutar y revisar'}</button><button class="text-button" data-lab-action="copy-code">Copiar programa completo ↗</button></div><p class="lab-run-disclosure">Al ejecutar, se envía este código al <a href="${language === 'rust' ? 'https://play.rust-lang.org/' : 'https://go.dev/play/'}" target="_blank" rel="noopener noreferrer">Playground oficial de ${langName()}</a>. Necesita conexión. El taller agrega la entrada del programa y las pruebas; editá las funciones del ejercicio.</p>${programPreviewHTML(item)}${customEditorHTML(item, record)}<div class="lab-hints"><div class="hints-top"><h3>Un empujón, si lo necesitás.</h3><span>${record.hints || 0}/3 pistas</span></div>${item.hints
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
    const review = reviewStateOf(item, record, activeRun?.id === item.id);
    if (review.kind === 'running')
      return '<h3>Probemos tu hipótesis.</h3><p>El compilador está revisando el programa. Después ejecutamos los casos del ejercicio y conectamos cada resultado con el concepto.</p><p class="runner-status busy"><span class="lab-spinner" aria-hidden="true"></span> Ejecutando código real…</p><button class="text-button" data-lab-action="cancel-run">Cancelar ejecución</button>';
    if (review.kind === 'unrun' || review.kind === 'stale')
      return pendingReviewHTML(item, review.kind === 'stale');
    if (review.kind === 'transport-failure')
      return `<h3 class="coach-warning">No pude ejecutar esta vez.</h3><p>${escapeHtml(review.message || 'No llegó una respuesta del compilador. Revisá la conexión y probá de nuevo.')}</p><div class="coach-callout">Tu código sigue guardado. No se aprobaron ni desaprobaron pruebas sin ejecutarlas. Podés seguir con las pistas o copiar el programa para probarlo en el Playground.</div>${testsHTML(item, null)}`;
    return finishedReviewHTML(item, record, review);
  }
  function pendingReviewHTML(item, stale) {
    return `<h3>${stale ? 'El código cambió. Revisémoslo.' : '¿Qué queremos comprobar?'}</h3><p>${stale ? 'Los resultados anteriores corresponden a otra versión. Ejecutá de nuevo para comprobar estos cambios.' : escapeHtml(item.review.pitfall)}</p>${testsHTML(item, null)}<div class="coach-callout"><strong>Mientras escribís:</strong> <span id="lab-live-hint">${escapeHtml(liveHint(draftFor(item), item))}</span></div><p class="coach-scope">La revisión combina diagnósticos reales y explicaciones preparadas para este desafío. Las pruebas cubren estos casos; no garantizan todo comportamiento posible.</p>`;
  }
  function finishedCopy(item, review) {
    if (review.kind === 'passed')
      return { heading: 'La idea funciona en estos casos.', detail: item.review.success };
    if (review.kind === 'partial')
      return {
        heading: `${review.passedCount} de ${item.tests.length}: encontramos algo para explorar.`,
        detail: review.failure,
      };
    return { heading: 'El programa nos dejó una pista.', detail: review.diagnosis.explanation };
  }
  function finishedReviewHTML(item, record, review) {
    const result = record.result;
    const complete = review.kind === 'passed';
    const { heading, detail } = finishedCopy(item, review);
    return `<h3 class="${complete ? 'coach-success' : 'coach-warning'}">${heading}</h3><p>${escapeHtml(detail)}</p>${review.kind === 'error' ? `<div class="coach-callout"><strong>Probá esto:</strong> ${escapeHtml(review.diagnosis.action)}</div>` : ''}${testsHTML(item, result)}${customResultHTML(record, result)}${complete ? `<div class="coach-callout"><strong>Una pregunta más:</strong> ${escapeHtml(item.transfer)}</div><button class="button small secondary" data-lab-action="phase" data-phase="reflect">Explicar lo que aprendí →</button>` : ''}<details class="compiler-output"><summary>Ver la salida del compilador y del programa</summary><pre>${escapeHtml((result.stderr || '') + '\n' + (result.stdout || ''))}</pre></details><p class="coach-scope">${record.assisted ? 'Práctica con solución de apoyo. ' : ''}${record.attempts || 0} intento${record.attempts === 1 ? '' : 's'}. Revisar es parte de aprender. La aprobación corresponde a estos ${item.tests.length} casos, no a una revisión completa de diseño.</p>`;
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
  async function runExercise() {
    const item = current();
    if (activeRun) return;
    if (window.TallerCampaign?.lockedExerciseHTML(item.id, language)) {
      notify('Completá los requisitos de esta misión en tu campaña.');
      return;
    }
    const record = recordFor(item.id),
      code = draftFor(item),
      customTest = normalizeCustomTest(record.customTest);
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
    return `<div id="lab-reflect-status" role="status">${isReflectionSolved(item, record) ? `<div class="lab-achievement"><span class="achievement-icon" aria-hidden="true">✳</span><div><strong>${record.assisted ? 'Lo exploraste con una solución de apoyo.' : 'Lo hiciste funcionar. Ahora hacelo tuyo.'}</strong><p>Los ${item.tests.length} casos pasaron. La comprensión se afianza cuando podés explicarlo y resolver una variante.</p></div></div>` : '<div class="coach-callout">Podés reflexionar en cualquier momento. Para verificar este código, volvé a Experimentá y ejecutá las pruebas.</div>'}</div><div class="reflect-layout"><section class="reflect-panel"><h2>¿Cómo se lo explicarías a alguien?</h2><p>Contá qué cambiaste, por qué funciona y qué caso podría romper una solución ingenua. Podés usar un ejemplo propio.</p><label><span class="field-label">Tu explicación, en tus palabras</span><textarea class="reflection-input" id="lab-reflection" name="reflexion" autocomplete="off" maxlength="10000" placeholder="Mi primera idea era… Ahora entiendo que… Un caso que tengo que cuidar es…">${escapeHtml(record.reflection || '')}</textarea></label><p id="lab-reflection-status" class="note-state">${record.reflection?.trim().length >= 40 ? 'Explicación guardada. No la calificamos por longitud: contrastala con el razonamiento de abajo.' : 'Escribir tu razonamiento suma una oportunidad de recordar. Se guarda automáticamente.'}</p><details style="margin-top:20px"><summary style="font-size:12px;cursor:pointer">Contrastar con el razonamiento del revisor</summary><p>${escapeHtml(item.review.success)}</p><p><strong>Cuidado con esta idea:</strong> ${escapeHtml(item.review.pitfall)}</p></details><div class="transfer-card"><h3>Ahora cambiá una condición.</h3><p>${escapeHtml(item.transfer)}</p><button class="button small secondary" data-lab-action="phase" data-phase="code">Volver al editor ↗</button></div></section><section class="reflect-panel"><h2>¿Cuándo querés volver a esto?</h2><p>Esta es tu autoevaluación. Elegí con honestidad: pedir más práctica también es avanzar.</p><div class="confidence-options">${[
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
      )}</div>${record.reviewAt ? `<p class="note-state">Próximo repaso: ${escapeHtml(new Date(record.reviewAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }))}. No enviamos notificaciones.</p>` : ''}${sourcesHTML(item)}</section></div><div class="lab-phase-footer"><p>Podés volver a cualquier ejercicio. Las soluciones y las notas quedan guardadas.</p><button class="button" data-lab-action="next">${navigationList().findIndex((candidate) => candidate.id === item.id) === navigationList().length - 1 ? (readLinkQuery(location.search).missionWorkshop !== null ? 'Volver al taller' : 'Volver al mapa') : 'Siguiente experimento'} →</button></div>`;
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
    if (status)
      status.textContent = labStore.storageAvailable()
        ? 'Borrador guardado'
        : 'Exportá para conservar';
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
      const choices = surprisePool(list(), records(), filters(), Date.now());
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
      Object.assign(record, predictionPatch(item, Number(button.dataset.answer)));
      save();
      $$('.lab-prediction').forEach((option, index) => {
        option.setAttribute('aria-pressed', String(index === record.prediction));
        option.classList.toggle(
          'is-right',
          index === record.prediction && index === item.prediction.answer,
        );
      });
      $('#lab-prediction-feedback').innerHTML = predictionFeedback(item, record);
      syncAfterRun({
        syncSystems: () => window.TallerSystems?.sync(),
        syncCampaign: () => window.TallerCampaign?.sync(),
        isCampaignMission: () =>
          Boolean(window.TallerCampaignEngine.canAttempt(item.id, language).worldId),
        notify,
        logError: (error) => console.error(error),
        formatXp: (xp) => `+${xp} XP por razonar tu predicción.`,
      });
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
      Object.assign(record, hintPatch(record));
      save();
      const content = document.createElement('template');
      content.innerHTML = codeHTML(current(), record);
      $('.lab-hints').replaceWith(content.content.querySelector('.lab-hints'));
      $('[data-lab-action="hint"]')?.focus({ preventScroll: true });
      $('.lab-hints')?.scrollIntoView({ block: 'nearest' });
    }
    if (action === 'reveal-solution' && !$('#lab-solution').open) {
      Object.assign(recordFor(selectedId), revealSolutionPatch());
      save();
    }
    if (action === 'reset-code')
      askConfirmation(
        '¿Volver al código inicial?',
        'Se reemplazará el borrador de este ejercicio. Tus resultados anteriores y notas se conservan.',
        () => {
          Object.assign(recordFor(selectedId), restoreStarterPatch(current()));
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
          Object.assign(recordFor(selectedId), loadSolutionPatch(current()));
          save();
          render();
          if (codeEditor) codeEditor.focus();
          else $('#lab-code')?.focus();
        },
      );
    if (action === 'copy-code') copyText(programFor(current()));
    if (action === 'confidence') {
      const record = recordFor(selectedId);
      Object.assign(record, selfAssessmentPatch(button.dataset.confidence, Date.now()));
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
        wasCurrent = isResultCurrent(current(), record);
      record[target.id === 'lab-code' ? 'draft' : 'customTest'] = target.value;
      save();
      updateGutter();
      updateEditorStatus();
      updateProgramPreview();
      if (!activeRun && (wasCurrent || isResultCurrent(current(), record))) {
        $('#lab-review').innerHTML = reviewHTML(current(), record);
      }
      const hint = $('#lab-live-hint');
      if (hint) hint.textContent = liveHint(draftFor(current()), current());
    }
    if (target.id === 'lab-reflection') {
      recordFor(selectedId).reflection = target.value;
      save();
      $('#lab-reflection-status').textContent = labStore.storageAvailable()
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
    init,
    mount,
    unmount,
    loadWarning: () => labStore.loadWarning(),
    getExercises: () => exerciseCatalog.exercises,
    exportState: () => labStore.exportState(),
    planImport: (raw) => labStore.planImport(raw),
    applyImport: (plan) => labStore.applyImport(plan),
    backups: () => labStore.backups(),
    reset() {
      const removed = labStore.reset();
      selectedId = null;
      mode = 'map';
      phase = 'learn';
      activeController?.abort();
      activeRun = null;
      return removed;
    },
  };
})();
