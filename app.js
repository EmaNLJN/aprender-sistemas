import { escapeHtml } from './src/shared/lib/escape-html';
import { normalizeSearchText } from './src/shared/lib/normalize-search-text';
import {
  describeLoadResult,
  loadVersionedState,
  removeVersionedState,
  writeVersionedState,
} from './src/shared/lib/versioned-storage';
(() => {
  'use strict';
  const data = window.GUIDE_DATA;
  const KEY = 'taller-learning-v1';
  const views = [
    'recorrido',
    'campana',
    'sistemas',
    'atlas',
    'laboratorio',
    'biblioteca',
    'proyecto',
    'metodo',
  ];
  const $ = (query, root = document) => root.querySelector(query);
  const $$ = (query, root = document) => [...root.querySelectorAll(query)];
  const allSteps = Object.values(data.tracks).flatMap((track) =>
    track.modules.flatMap((module) => module.steps),
  );
  const stepIds = new Set(allSteps.map((step) => step.id));
  const resourceIds = new Set(data.resources.map((resource) => resource.id));
  const milestones = [
    {
      id: 'memory',
      title: 'Un lugar para guardar cosas',
      task: 'Implementá SET, GET y DELETE sobre un almacén en memoria. Empezá llamando funciones desde un test; todavía no necesitás una terminal interactiva.',
      done: 'Podés guardar una clave, leerla, reemplazar su valor y borrarla. Un test comprueba qué ocurre si la clave no existe.',
      hint: 'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.',
    },
    {
      id: 'commands',
      title: 'Tu programa entiende comandos',
      task: 'Leé comandos desde la entrada estándar. Separá el texto recibido de la operación que ejecuta el almacén y devolvé errores claros.',
      done: 'SET nombre Ana y GET nombre funcionan. Un comando desconocido o incompleto muestra un error sin terminar el programa.',
      hint: 'Convertí el texto en una operación antes de cambiar datos. Definí una gramática pequeña: por ejemplo, claves sin espacios y el resto de la línea como valor. Probá líneas vacías y argumentos faltantes.',
    },
    {
      id: 'files',
      title: 'Los datos sobreviven al reinicio',
      task: 'Agregá una forma de guardar y cargar el contenido en un archivo. Decidí un formato sencillo y explicá sus límites.',
      done: 'Cerrás el proceso, lo volvés a abrir y recuperás los datos. Tenés tests para un archivo vacío y uno inválido.',
      hint: 'Primero separá serializar de escribir un archivo. Probá el recorrido guardar → cargar con datos conocidos. Para este prototipo, documentá qué pasaría si el proceso se corta durante la escritura.',
    },
    {
      id: 'measure',
      title: 'Medir antes de optimizar',
      task: 'Elegí una operación, un conjunto fijo de datos y una pregunta. Medí una versión de referencia y después una modificación pequeña.',
      done: 'Anotaste entorno, tamaño de entrada y varias mediciones comparables. Podés explicar si la modificación ayudó y por qué.',
      hint: 'Verificá primero que ambas versiones devuelven el mismo resultado. Evitá mezclar el tiempo de imprimir o generar datos con la operación que querés comparar. Una sola medición no alcanza.',
    },
    {
      id: 'network',
      title: 'Una conversación por TCP',
      task: 'Cuando la base esté clara, aceptá los mismos comandos desde una conexión TCP. Empezá con un cliente y mensajes delimitados por salto de línea.',
      done: 'Un cliente guarda y consulta un valor. El servidor responde bien aunque un comando llegue en varios fragmentos.',
      hint: 'TCP transporta un flujo de bytes: cada lectura no equivale a un comando completo. Acumulá bytes hasta el delimitador. Después podés investigar varios clientes y acceso compartido a los datos.',
    },
  ];
  const milestoneIds = new Set(
    ['rust', 'go'].flatMap((language) => milestones.map((item) => language + '-' + item.id)),
  );
  const defaults = () => ({
    version: 1,
    language: 'rust',
    completed: [],
    milestones: [],
    favorites: [],
    quizAnswers: {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: 25,
  });
  const isObjectLike = (value) => Boolean(value) && typeof value === 'object';
  // Normaliza el recorrido y cuenta cada dato que no conserva (IDs desconocidos, valores de
  // otro tipo o fuera de rango). Lanza si la forma o la versión no se reconocen.
  function parseProgress(raw) {
    if (!isObjectLike(raw) || raw.version !== 1)
      throw new Error('Formato de progreso no compatible.');
    const result = defaults();
    let dropped = 0;
    const languageIsValid = raw.language === 'rust' || raw.language === 'go';
    if (raw.language !== undefined && !languageIsValid) dropped++;
    result.language = raw.language === 'go' ? 'go' : 'rust';
    const filtered = (items, valid) => {
      if (items === undefined) return [];
      if (!Array.isArray(items)) {
        dropped++;
        return [];
      }
      const kept = items.filter((id) => typeof id === 'string' && valid.has(id));
      dropped += items.length - kept.length;
      return [...new Set(kept)];
    };
    result.completed = filtered(raw.completed, stepIds);
    result.milestones = filtered(raw.milestones, milestoneIds);
    result.favorites = filtered(raw.favorites, resourceIds);
    if ([15, 25, 45].includes(raw.minutes)) result.minutes = raw.minutes;
    else if (raw.minutes !== undefined) dropped++;
    for (const language of ['rust', 'go'])
      for (const field of ['learned', 'next']) {
        const value = raw.notes?.[language]?.[field];
        if (typeof value === 'string') result.notes[language][field] = value.slice(0, 20000);
        else if (value !== undefined) dropped++;
      }
    const answers = isObjectLike(raw.quizAnswers) ? raw.quizAnswers : {};
    if (raw.quizAnswers !== undefined && answers !== raw.quizAnswers) dropped++;
    for (const step of allSteps) {
      const answer = answers[step.id];
      if (Number.isInteger(answer) && answer >= 0 && answer < step.quiz.options.length)
        result.quizAnswers[step.id] = answer;
    }
    dropped += Object.keys(answers).length - Object.keys(result.quizAnswers).length;
    return { state: result, dropped };
  }
  // Importación: acepta lo que reconoce y descarta el resto sin contarlo.
  const sanitize = (raw) => parseProgress(raw).state;
  function loadNoticeFor(loaded) {
    if (loaded.status === 'unavailable')
      return 'No se pudo leer o guardar el avance. Podés exportarlo al terminar.';
    return describeLoadResult(loaded, 'del recorrido');
  }
  // Nunca escribe al cargar: la primera escritura es una acción del alumno.
  const loaded = loadVersionedState(KEY, { blank: defaults, parse: parseProgress });
  let state = loaded.state;
  let storageAvailable = loaded.status !== 'unavailable';
  const filters = { query: '', language: 'all', category: 'all', cost: 'all', favorites: false };
  const campaignInit = window.TallerCampaign?.init();
  const systemsInit = window.TallerSystems?.init();
  // Los avisos de todos los almacenes se muestran juntos; ninguno pisa a otro.
  const loadNotices = [
    loadNoticeFor(loaded),
    campaignInit?.loadWarning,
    systemsInit?.loadWarning,
    window.TallerLab?.loadWarning?.(),
  ].filter(Boolean);
  function syncLinkedLanguage() {
    const params = new URLSearchParams(location.search);
    if (location.hash === '#sistemas' && ['rust', 'go'].includes(params.get('lenguaje')))
      state.language = params.get('lenguaje');
    if (location.hash === '#campana')
      for (const lang of ['rust', 'go'])
        if (
          (lang === 'rust' ? window.RUST_CAMPAIGN : window.GO_CAMPAIGN)?.some(
            (world) => world.id === params.get('mundo'),
          )
        )
          state.language = lang;
    const linked = window.TallerLab?.getExercises().find(
      (item) => item.id === params.get('ejercicio'),
    );
    if (location.hash === '#laboratorio' && linked) state.language = linked.language;
  }
  syncLinkedLanguage();
  let currentView = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'recorrido';
  let currentStepId = null;
  let lessonOpener = null;
  let toastTimeout;
  const timer = { running: false, remaining: state.minutes * 60, deadline: 0 };
  function save() {
    storageAvailable = writeVersionedState(KEY, state);
    updateSaveLabel();
  }
  function updateSaveLabel() {
    $('#save-label').textContent = storageAvailable
      ? 'Guardado en este navegador'
      : 'Exportá para conservar tu avance';
  }
  function toast(message) {
    clearTimeout(toastTimeout);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 4500);
  }
  function restoreStepFocus(id, preferCheckbox = false) {
    const element = preferCheckbox
      ? $(`[data-step-check="${id}"]`)
      : $(`[data-action="lesson"][data-id="${id}"]`);
    if (!element) return;
    const module = element.closest('details');
    if (module && !module.open) module.open = true;
    element.focus({ preventScroll: true });
  }
  function toggleItem(collection, id) {
    const index = collection.indexOf(id);
    if (index === -1) collection.push(id);
    else collection.splice(index, 1);
  }
  const stepsFor = () => data.tracks[state.language].modules.flatMap((module) => module.steps);
  const completedCount = () =>
    stepsFor().filter((step) => state.completed.includes(step.id)).length;
  const languageName = () => (state.language === 'rust' ? 'Rust' : 'Go');
  function syncShell() {
    document.body.dataset.language = state.language;
    $$('[data-language]').forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.language === state.language)),
    );
    $$('[data-view]').forEach((link) => {
      if (link.dataset.view === currentView) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const done = completedCount(),
      total = stepsFor().length;
    $('#sidebar-language').textContent = languageName().toUpperCase();
    $('#sidebar-completed').textContent = `${done} de ${total}`;
    $('#sidebar-percent').textContent = `${Math.round((done / total) * 100)}%`;
    $('#sidebar-progress').value = done;
    $('#sidebar-progress').max = total;
    $('#resource-count').textContent = String(data.resources.length);
    updateSaveLabel();
  }
  function render() {
    window.TallerLab?.unmount();
    window.TallerAtlas?.unmount();
    window.TallerCampaign?.unmount();
    window.TallerSystems?.unmount();
    window.TallerCampaign?.refresh();
    syncShell();
    const renderers = {
      recorrido: renderRoute,
      campana: () => '',
      sistemas: () => '',
      atlas: () => '',
      laboratorio: () => '',
      biblioteca: renderLibrary,
      proyecto: renderProject,
      metodo: renderMethod,
    };
    $('#main').innerHTML = renderers[currentView]();
    if (currentView === 'campana') window.TallerCampaign.mount($('#main'), state.language, toast);
    if (currentView === 'sistemas') window.TallerSystems.mount($('#main'), state.language, toast);
    if (currentView === 'atlas') window.TallerAtlas.mount($('#main'), state.language);
    if (currentView === 'laboratorio') window.TallerLab.mount($('#main'), state.language, toast);
    if (currentView === 'biblioteca') renderResourceResults();
    updateTimer();
  }
  function routeCode() {
    return state.language === 'rust'
      ? '<span class="token">fn</span> main() {\n  <span class="token">let</span> curiosidad = <span class="token">true</span>;\n  <span class="comment">// Un problema a la vez.</span>\n  aprender(curiosidad);\n}'
      : '<span class="token">func</span> main() {\n  curiosidad := <span class="token">true</span>\n  <span class="comment">// Un problema a la vez.</span>\n  aprender(curiosidad)\n}';
  }
  function renderRoute() {
    const track = data.tracks[state.language];
    const steps = stepsFor();
    const next = steps.find((step) => !state.completed.includes(step.id));
    const completed = completedCount();
    let openModule = track.modules.findIndex((module) =>
      module.steps.some((step) => !state.completed.includes(step.id)),
    );
    if (openModule === -1) openModule = track.modules.length - 1;
    return `<section class="hero" aria-label="Bienvenida"><div><div class="eyebrow"><span class="eyebrow-line"></span> TU TALLER DE ${languageName().toUpperCase()}</div><h1>Entendé lo que<br>pasa <em>por dentro.</em></h1><p class="hero-description">Ya sabés programar. Ahora construí una comprensión más profunda, con desafíos pequeños y cosas que funcionan.</p><div class="hero-meta"><span class="pill accent">${state.language === 'rust' ? 'Rust · recomendado para vos' : 'Go · construir y experimentar'}</span><span>4 etapas</span><span aria-hidden="true">·</span><span>${steps.length} sesiones a tu ritmo</span></div></div><div class="code-art" aria-label="Ilustración de código, no es un ejercicio ejecutable"><div class="code-window"><div class="window-top"><div class="window-dots"><i></i><i></i><i></i></div><span>${state.language === 'rust' ? 'main.rs' : 'main.go'}</span></div><pre>${routeCode()}</pre></div><p class="art-caption">MENOS MIRAR. MÁS PROBAR. ↗</p></div></section>
    ${!next ? '<div class="completion-banner">Completaste tu recorrido inicial. Elegí un proyecto, repetí un desafío con otra condición o volvé a un tema que quieras afianzar.</div>' : ''}
    <section class="focus-card" aria-label="Sesión de hoy"><div class="focus-content"><span class="small-label">${next ? `TU PRÓXIMO PASO · ${String(steps.indexOf(next) + 1).padStart(2, '0')} / ${steps.length}` : 'TU SIGUIENTE EXPERIMENTO'}</span><h2>${escapeHtml(next?.title || 'Llevá tu idea un paso más allá')}</h2><p>${escapeHtml(next?.objective || 'Tu almacén clave-valor puede aprender a guardar archivos, medir operaciones y recibir comandos por una conexión de red.')}</p>${next ? `<button class="button" data-action="lesson" data-id="${escapeHtml(next.id)}">Empezar esta sesión <span aria-hidden="true">↗</span></button>` : '<a class="button" href="#proyecto">Continuar mi proyecto <span aria-hidden="true">↗</span></a>'}</div>${timerMarkup()}</section>
    <section aria-labelledby="route-title"><div class="section-heading"><div><h2 id="route-title">Un camino, paso a paso.</h2></div><span class="small-label">${completed} DE ${steps.length} COMPLETADOS</span></div><p class="route-intro">${escapeHtml(track.description)} Cada sesión es orientativa: podés dividirla y volver. Marcá un paso cuando puedas demostrar su resultado.</p><div class="modules">${track.modules.map((module, index) => `<details class="module" ${index === openModule ? 'open' : ''}><summary><span class="module-number">${String(index + 1).padStart(2, '0')}</span><span class="module-title"><strong>${escapeHtml(module.title)}</strong><span>${escapeHtml(module.subtitle)}</span></span><span class="module-count">${module.steps.filter((step) => state.completed.includes(step.id)).length}/${module.steps.length}</span><span class="module-chevron" aria-hidden="true">+</span></summary><div class="module-steps">${module.steps.map((step) => `<div class="step-row"><input class="step-check" type="checkbox" data-step-check="${escapeHtml(step.id)}" aria-label="Marcar como completado: ${escapeHtml(step.title)}" ${state.completed.includes(step.id) ? 'checked' : ''}><button class="step-title" data-action="lesson" data-id="${escapeHtml(step.id)}">${escapeHtml(step.title)}<span>Una sesión orientativa · ${step.minutes} min</span></button><button class="step-open" data-action="lesson" data-id="${escapeHtml(step.id)}" aria-label="Abrir ${escapeHtml(step.title)}">↗</button></div>`).join('')}</div></details>`).join('')}</div></section>
    <div class="recommendation-strip"><span class="strip-icon" aria-hidden="true">i</span><p><strong>Un recurso principal. Un proyecto propio.</strong><br>${state.language === 'rust' ? 'Usá 100 Exercises como hilo conductor y el libro de Brown para destrabar conceptos. Rustlings es otra forma de practicar; no hace falta terminar todos los cursos.' : 'Empezá con el Tour y seguí con Learn Go with Tests. Usá Exercism para practicar un concepto o Gophercises para cambiar de desafío.'} <a href="#biblioteca">Explorá la biblioteca</a>.</p></div>`;
  }
  function timerMarkup() {
    return `<div class="focus-timer"><span class="small-label">UN RATO PARA VOS</span><div class="timer-options" role="group" aria-label="Duración de la sesión">${[15, 25, 45].map((minutes) => `<button data-action="duration" data-minutes="${minutes}" aria-pressed="${state.minutes === minutes}">${minutes} min</button>`).join('')}</div><div class="timer-digits" role="timer" aria-label="Tiempo restante">25:00</div><div class="timer-controls"><button class="text-button timer-toggle" data-action="timer">Iniciar foco</button><button class="text-button timer-reset" data-action="timer-reset" aria-label="Reiniciar temporizador">↺</button></div><p class="timer-note">El tiempo acompaña. La comprensión marca el ritmo.</p></div>`;
  }
  function updateTimer() {
    if (timer.running) {
      timer.remaining = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000));
      if (timer.remaining === 0) {
        timer.running = false;
        toast('Terminó tu rato de foco. Anotá qué entendiste y por dónde seguir.');
      }
    }
    const digits = $('.timer-digits');
    const displayTime = `${String(Math.floor(timer.remaining / 60)).padStart(2, '0')}:${String(timer.remaining % 60).padStart(2, '0')}`;
    if (digits && digits.textContent !== displayTime) digits.textContent = displayTime;
    const button = $('.timer-toggle');
    const buttonText = timer.running
      ? 'Pausar'
      : timer.remaining === state.minutes * 60 || timer.remaining === 0
        ? 'Iniciar foco'
        : 'Continuar';
    if (button && button.textContent !== buttonText) button.textContent = buttonText;
  }
  setInterval(updateTimer, 500);
  function renderLibrary() {
    return `<div class="page-heading"><div class="eyebrow"><span class="eyebrow-line"></span> RECURSOS CON INTENCIÓN</div><h1>Una biblioteca.<br><em>Tu propia ruta.</em></h1><p>Todo lo que revisamos, en un lugar. Elegí según lo que necesitás hoy; guardá tus favoritos para volver sin buscar de nuevo.</p></div>
    <div class="filter-bar"><label class="search-wrap"><span aria-hidden="true">⌕</span><input id="resource-search" type="search" value="${escapeHtml(filters.query)}" placeholder="Buscar un recurso, tema o formato…" aria-label="Buscar recursos"></label><select id="filter-language" aria-label="Filtrar por lenguaje"><option value="all">Todos los lenguajes</option><option value="rust" ${filters.language === 'rust' ? 'selected' : ''}>Rust</option><option value="go" ${filters.language === 'go' ? 'selected' : ''}>Go</option></select><select id="filter-cost" aria-label="Filtrar por acceso"><option value="all">Cualquier acceso</option><option value="gratis" ${filters.cost === 'gratis' ? 'selected' : ''}>Acceso gratuito</option><option value="mixto" ${filters.cost === 'mixto' ? 'selected' : ''}>Gratis + pago</option></select></div>
    <div class="filter-secondary"><div class="filter-chips" role="group" aria-label="Tipo de recurso">${[
      ['all', 'Todos'],
      ['ejercicios', 'Ejercicios'],
      ['proyectos', 'Proyectos'],
      ['lectura', 'Lectura'],
      ['herramientas', 'Herramientas'],
    ]
      .map(
        ([value, label]) =>
          `<button class="filter-chip" data-action="category" data-category="${value}" aria-pressed="${filters.category === value}">${label}</button>`,
      )
      .join(
        '',
      )}</div><label class="favorite-filter"><input id="filter-favorites" type="checkbox" ${filters.favorites ? 'checked' : ''}> Solo mis favoritos</label></div><p id="resource-results-label" class="resource-results-label" role="status" aria-live="polite"></p><div id="resource-grid" class="resource-grid"></div><p class="resource-notice">Accesos y modalidades revisados el 2 de octubre de 2026. Los recursos externos necesitan conexión y pueden cambiar. Los precios no se fijan aquí: revisá las condiciones de cada sitio.</p>`;
  }
  function renderResourceResults() {
    const query = normalizeSearchText(filters.query.trim());
    const resources = data.resources.filter(
      (resource) =>
        (!query ||
          normalizeSearchText(
            [
              resource.title,
              resource.description,
              resource.why,
              resource.format,
              ...resource.languages,
            ].join(' '),
          ).includes(query)) &&
        (filters.language === 'all' ||
          resource.languages.includes(filters.language) ||
          resource.languages.includes('both')) &&
        (filters.category === 'all' || resource.category === filters.category) &&
        (filters.cost === 'all' || resource.cost === filters.cost) &&
        (!filters.favorites || state.favorites.includes(resource.id)),
    );
    $('#resource-results-label').textContent =
      `${resources.length} de ${data.resources.length} recursos · abrí cada uno a tu ritmo`;
    $('#resource-grid').innerHTML = resources.length
      ? resources
          .map(
            (resource) =>
              `<article class="resource-card"><div class="resource-top"><div class="resource-tags"><span class="pill ${resource.featured ? 'accent' : ''}">${resource.languages.includes('both') ? 'Go + Rust' : resource.languages.map((language) => (language === 'rust' ? 'Rust' : 'Go')).join(' + ')}</span><span class="pill">${resource.cost === 'gratis' ? 'Gratis' : 'Gratis + pago'}</span>${resource.featured ? '<span class="pill accent">Elegido para vos</span>' : ''}</div><button class="favorite-button" data-action="favorite" data-id="${escapeHtml(resource.id)}" aria-label="${state.favorites.includes(resource.id) ? 'Quitar de' : 'Guardar en'} favoritos: ${escapeHtml(resource.title)}" aria-pressed="${state.favorites.includes(resource.id)}">${state.favorites.includes(resource.id) ? '★' : '☆'}</button></div><h2>${escapeHtml(resource.title)}</h2><div class="resource-format">${escapeHtml(resource.format)}</div><p>${escapeHtml(resource.description)}</p><p class="resource-fit"><strong>Para vos:</strong> ${escapeHtml(resource.why)}</p><details><summary>Antes de empezar</summary><p>${escapeHtml(resource.caveat)}</p></details><a class="resource-link" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">Explorar recurso <span aria-hidden="true">↗</span><span class="sr-only"></span></a></article>`,
          )
          .join('')
      : '<div class="empty-state"><h2>Ningún recurso con esos filtros.</h2><p>Probá otro término o volvé a ver la biblioteca completa.</p><button class="button secondary" data-action="clear-filters">Limpiar filtros</button></div>';
  }
  function renderProject() {
    const done = milestones.filter((item) =>
      state.milestones.includes(state.language + '-' + item.id),
    ).length;
    return `<div class="page-heading"><div class="eyebrow"><span class="eyebrow-line"></span> UNA IDEA QUE CRECE CON VOS</div><h1>De una función<br>a <em>tu propio sistema.</em></h1><p>Un pequeño almacén clave-valor en ${languageName()}. Cada capacidad te da una razón para aprender el siguiente concepto. El proyecto tiene su propio avance: los ejercicios del recorrido lo preparan.</p></div><div class="project-hero"><div><span class="small-label">PROYECTO PERSONAL · ${done} / ${milestones.length} HITOS</span><h2>Tu primer taller de datos.</h2><p>Empezá en memoria. Sumá comandos, archivos, mediciones y, cuando estés listo, una conexión por red.</p></div><pre class="terminal"><span class="prompt">&gt;</span> SET curiosidad encendida\nOK\n<span class="prompt">&gt;</span> GET curiosidad\nencendida\n<span class="prompt">&gt;</span> _</pre></div><div class="milestones">${milestones.map((item, index) => `<article class="milestone"><div class="milestone-head"><input class="step-check" type="checkbox" data-milestone="${state.language}-${item.id}" aria-label="Completar hito: ${escapeHtml(item.title)}" ${state.milestones.includes(state.language + '-' + item.id) ? 'checked' : ''}><h2>${String(index + 1).padStart(2, '0')}. ${escapeHtml(item.title)}</h2></div><p>${escapeHtml(item.task)}</p><p><strong>Está listo cuando:</strong> ${escapeHtml(item.done)}</p><details><summary>Necesito una pista</summary><p>${escapeHtml(item.hint)}</p></details></article>`).join('')}</div><div class="recommendation-strip"><span class="strip-icon" aria-hidden="true">↗</span><p><strong>¿Preferís un reto con tests externos?</strong><br>CodeCrafters propone construir una shell o un servidor HTTP. Protohackers prueba tus servidores de protocolos. <a href="#biblioteca" data-project-library>Encontralos en la biblioteca</a>.</p></div>`;
  }
  function tutorPrompt() {
    return `Estoy aprendiendo ${languageName()} y ya sé programar. Me interesan los sistemas y el rendimiento. Tengo ${state.minutes} minutos. Trabajemos un concepto con un ejercicio pequeño relacionado con archivos, memoria o redes.\n\nPrimero pedime predecir qué va a pasar y justificarlo. Esperá mi intento. Después dame una pista por vez, sin escribir ni modificar mi solución.\n\nCuando aparezca una duda de API, consultá Context7 o documentación oficial y enlazá la fuente. Si no tenés acceso, decímelo. Al terminar, pedime resolver una variante y explicar qué aprendí.\n\nMi próximo paso: ${state.notes[state.language].next || 'elegir un desafío pequeño del recorrido.'}`;
  }
  function renderMethod() {
    return `<div class="page-heading"><div class="eyebrow"><span class="eyebrow-line"></span> HACER ESPACIO PARA APRENDER</div><h1>Menos inercia.<br><em>Más curiosidad.</em></h1><p>No necesitás una tarde libre. Necesitás un problema pequeño y un lugar al que volver. Esta es una propuesta flexible, no una obligación diaria.</p></div><div class="method-grid"><section class="method-panel"><h2>Una sesión de 25 minutos.</h2><ol class="routine"><li><span class="routine-time">03′</span><span><strong>Recordá sin mirar.</strong><br>Reconstruí una idea de la sesión anterior.</span></li><li><span class="routine-time">17′</span><span><strong>Escribí, ejecutá, probá.</strong><br>Un ejercicio o una modificación pequeña. Si te trabás, buscá una pista concreta.</span></li><li><span class="routine-time">05′</span><span><strong>Dejá un hilo para volver.</strong><br>Anotá qué entendiste y el siguiente paso exacto.</span></li></ol><p style="margin:22px 0 0">¿Día complicado? Cinco minutos para un test o una pregunta también cuentan. Si elegís otra duración, adaptá los bloques sin apuro.</p></section><section class="method-panel"><h2>Aprender con intención.</h2><ul><li>Elegí un curso principal y un proyecto.</li><li>Después de resolver, cambiá una condición.</li><li>De vez en cuando, volvé a escribir algo desde cero.</li><li>Usá la IA para preguntas y pistas. Probá desactivar la generación de bloques completos durante los ejercicios.</li><li>Medí avance por lo que podés explicar y demostrar.</li></ul></section></div><section class="method-panel notes-panel"><h2>Tu bitácora de ${languageName()}.</h2><div class="notes-grid"><label><span class="field-label">Lo que entendí / lo que todavía me cuesta</span><textarea id="note-learned" data-note="learned" maxlength="20000" placeholder="Hoy entendí por qué…">${escapeHtml(state.notes[state.language].learned)}</textarea></label><label><span class="field-label">La próxima vez voy a…</span><textarea id="note-next" data-note="next" maxlength="20000" placeholder="Dejá una acción concreta: escribir un test para…">${escapeHtml(state.notes[state.language].next)}</textarea></label></div><p id="note-state" class="note-state">${storageAvailable ? 'Tus notas se guardan automáticamente en este navegador.' : 'El guardado no está disponible. Exportá tu avance al terminar.'}</p></section><section class="method-panel notes-panel"><h2>Un tutor que te haga pensar.</h2><p>Copiá este pedido en tu asistente. Context7 aporta documentación; el asistente acompaña con preguntas. El acceso a Context7 depende de las herramientas de ese asistente.</p><blockquote class="tutor-prompt" id="tutor-prompt">${escapeHtml(tutorPrompt())}</blockquote><button class="button secondary" data-action="copy-prompt">Copiar pedido para mi tutor <span aria-hidden="true">↗</span></button></section><section class="method-panel notes-panel"><h2>Las fuentes, a mano.</h2><p>La selección combina sitios originales y experiencias de comunidad. Los hilos son opiniones, no un consenso. Las duraciones del recorrido son propuestas de esta guía.</p><ul class="source-list">${data.sources.map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)} ↗</a><p>${escapeHtml(source.note)}</p></li>`).join('')}</ul></section><section class="method-panel notes-panel"><h2>Tu progreso te pertenece.</h2><p>Pasos, favoritos, respuestas y notas se guardan en este navegador. Incluyen también XP, sellos e insignias de campaña, más los talleres, notas y etapas de Sistemas. No se sincronizan entre dispositivos. Si cambiás de navegador, movés el archivo o borrás sus datos, exportá antes una copia.</p><div class="data-actions"><button class="button secondary" data-action="export">Exportar progreso</button><button class="button secondary" data-action="import">Importar una copia</button><button class="text-button" data-action="reset">Borrar mi progreso</button></div><p class="data-explainer">Importar combina los pasos y favoritos. Para notas y respuestas del mismo tema, conserva los valores de la copia importada. El temporizador no forma parte del respaldo.</p></section>`;
  }
  function openLesson(id, opener) {
    const step = allSteps.find((item) => item.id === id);
    if (!step) return;
    currentStepId = id;
    lessonOpener = opener || document.activeElement;
    $('#lesson-content').innerHTML =
      `<div class="dialog-top"><span class="small-label">${languageName().toUpperCase()} · UNA SESIÓN ORIENTATIVA</span><button class="close-dialog" data-dialog-action="close" aria-label="Cerrar sesión">×</button></div><h2 id="lesson-title">${escapeHtml(step.title)}</h2><p>${escapeHtml(step.objective)}</p><div class="lesson-block"><h3>Tu desafío</h3><p>${escapeHtml(step.task)}</p></div><div class="done-criteria"><span class="small-label">LO LOGRASTE CUANDO</span><p>${escapeHtml(step.doneWhen)}</p></div><div class="lesson-resources">${step.resourceIds
        .map((resourceId) => data.resources.find((resource) => resource.id === resourceId))
        .filter(Boolean)
        .map(
          (resource) =>
            `<a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resource.title)} ↗</a>`,
        )
        .join(
          '',
        )}</div><div class="quiz"><h3>Antes de seguir: ${escapeHtml(step.quiz.question)}</h3><div class="quiz-options">${step.quiz.options.map((option, index) => `<button class="quiz-option" data-dialog-action="answer" data-answer="${index}" aria-pressed="${state.quizAnswers[id] === index}"><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span></button>`).join('')}</div><p class="quiz-feedback" id="quiz-feedback" role="status" aria-live="polite" hidden></p></div><div class="dialog-actions"><button class="button secondary" data-dialog-action="close">Seguir después</button><button class="button" data-dialog-action="complete">${state.completed.includes(id) ? 'Volver a practicar' : 'Marcar como hecho'} <span aria-hidden="true">✓</span></button></div>`;
    showQuizFeedback(step);
    $('#lesson-dialog').showModal();
  }
  function showQuizFeedback(step) {
    const answer = state.quizAnswers[step.id];
    const feedback = $('#quiz-feedback');
    if (answer === undefined) {
      feedback.hidden = true;
      return;
    }
    const correct = answer === step.quiz.answer;
    feedback.hidden = false;
    feedback.classList.toggle('correct', correct);
    feedback.textContent =
      (correct ? 'Bien pensado. ' : 'Revisemos la idea. ') + step.quiz.explanation;
  }
  $('#lesson-dialog').addEventListener('click', (event) => {
    const button = event.target.closest('[data-dialog-action]');
    if (!button) return;
    const action = button.dataset.dialogAction;
    if (action === 'close') $('#lesson-dialog').close();
    if (action === 'answer') {
      const step = allSteps.find((item) => item.id === currentStepId);
      state.quizAnswers[currentStepId] = Number(button.dataset.answer);
      save();
      $$('.quiz-option').forEach((option) =>
        option.setAttribute(
          'aria-pressed',
          String(Number(option.dataset.answer) === state.quizAnswers[currentStepId]),
        ),
      );
      showQuizFeedback(step);
    }
    if (action === 'complete') {
      const wasComplete = state.completed.includes(currentStepId);
      toggleItem(state.completed, currentStepId);
      save();
      $('#lesson-dialog').close();
      render();
      restoreStepFocus(currentStepId);
      toast(
        wasComplete
          ? 'Paso disponible para volver a practicar.'
          : 'Un paso más. Dejá una nota para tu próxima sesión.',
      );
    }
  });
  $('#lesson-dialog').addEventListener('close', () => {
    if (lessonOpener?.isConnected) lessonOpener.focus({ preventScroll: true });
  });
  function exportProgress() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            ...state,
            lab: window.TallerLab?.exportState(),
            campaign: window.TallerCampaignEngine?.exportState(),
            systems: window.TallerSystemsEngine?.exportState(),
            exportedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = `taller-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Copia de progreso exportada.');
  }
  async function copyPrompt() {
    const prompt = tutorPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      toast('Pedido copiado. Pegalo en tu asistente.');
    } catch {
      const field = document.createElement('textarea');
      field.value = prompt;
      field.style.position = 'fixed';
      field.style.top = '-1000px';
      document.body.appendChild(field);
      field.select();
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (error) {
        void error; /* Selection fallback remains available below. */
      }
      field.remove();
      if (copied) toast('Pedido copiado.');
      else {
        const range = document.createRange();
        range.selectNodeContents($('#tutor-prompt'));
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        toast('Texto seleccionado. Usá Copiar en tu navegador.');
      }
    }
  }
  $('#main').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'lesson') openLesson(button.dataset.id, button);
    if (action === 'duration') {
      state.minutes = Number(button.dataset.minutes);
      timer.running = false;
      timer.remaining = state.minutes * 60;
      save();
      $$('[data-action="duration"]').forEach((item) =>
        item.setAttribute('aria-pressed', String(Number(item.dataset.minutes) === state.minutes)),
      );
      updateTimer();
    }
    if (action === 'timer') {
      if (timer.running) {
        updateTimer();
        timer.running = false;
      } else {
        if (timer.remaining <= 0) timer.remaining = state.minutes * 60;
        timer.deadline = Date.now() + timer.remaining * 1000;
        timer.running = true;
      }
      updateTimer();
    }
    if (action === 'timer-reset') {
      timer.running = false;
      timer.remaining = state.minutes * 60;
      updateTimer();
    }
    if (action === 'favorite') {
      toggleItem(state.favorites, button.dataset.id);
      save();
      renderResourceResults();
      $(`[data-action="favorite"][data-id="${button.dataset.id}"]`)?.focus({ preventScroll: true });
    }
    if (action === 'category') {
      filters.category = button.dataset.category;
      $$('[data-action="category"]').forEach((item) =>
        item.setAttribute('aria-pressed', String(item.dataset.category === filters.category)),
      );
      renderResourceResults();
    }
    if (action === 'clear-filters') {
      Object.assign(filters, {
        query: '',
        language: 'all',
        category: 'all',
        cost: 'all',
        favorites: false,
      });
      render();
      $('#resource-search').focus();
    }
    if (action === 'copy-prompt') copyPrompt();
    if (action === 'export') exportProgress();
    if (action === 'import') $('#import-file').click();
    if (action === 'reset') $('#confirm-dialog').showModal();
  });
  $('#main').addEventListener('change', (event) => {
    const target = event.target;
    if (target.dataset.stepCheck) {
      toggleItem(state.completed, target.dataset.stepCheck);
      save();
      render();
      restoreStepFocus(target.dataset.stepCheck, true);
    }
    if (target.dataset.milestone) {
      toggleItem(state.milestones, target.dataset.milestone);
      save();
      render();
      $(`[data-milestone="${target.dataset.milestone}"]`)?.focus({ preventScroll: true });
    }
    if (target.id === 'filter-language') {
      filters.language = target.value;
      renderResourceResults();
    }
    if (target.id === 'filter-cost') {
      filters.cost = target.value;
      renderResourceResults();
    }
    if (target.id === 'filter-favorites') {
      filters.favorites = target.checked;
      renderResourceResults();
    }
  });
  $('#main').addEventListener('input', (event) => {
    const target = event.target;
    if (target.id === 'resource-search') {
      filters.query = target.value;
      renderResourceResults();
    }
    if (target.dataset.note) {
      state.notes[state.language][target.dataset.note] = target.value;
      save();
      $('#note-state').textContent = storageAvailable
        ? 'Guardado. Tu próxima sesión ya tiene un punto de partida.'
        : 'No se pudo guardar. Exportá tu avance al terminar.';
      $('#tutor-prompt').textContent = tutorPrompt();
    }
  });
  $$('[data-language]').forEach((button) =>
    button.addEventListener('click', () => {
      if (state.language === button.dataset.language) return;
      state.language = button.dataset.language;
      const url = new URL(location.href);
      if (currentView === 'sistemas') url.searchParams.set('lenguaje', state.language);
      else url.search = '';
      history.replaceState(null, '', url);
      save();
      render();
      toast(`Recorrido de ${languageName()}. Tu otro avance sigue guardado.`);
    }),
  );
  $('.skip-link').addEventListener('click', (event) => {
    event.preventDefault();
    $('#main').focus();
    $('#main').scrollIntoView({ block: 'start' });
  });
  let lastNavigation = location.href;
  function navigateFromLocation() {
    if (lastNavigation === location.href) return;
    syncLinkedLanguage();
    currentView = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'recorrido';
    render();
    lastNavigation = location.href;
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('#main').focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', navigateFromLocation);
  window.addEventListener('popstate', navigateFromLocation);
  $('#export-progress').addEventListener('click', exportProgress);
  $('#cancel-reset').addEventListener('click', () => $('#confirm-dialog').close());
  $('#confirm-reset').addEventListener('click', () => {
    state = defaults();
    removeVersionedState(KEY);
    window.TallerLab?.reset();
    window.TallerCampaignEngine?.reset();
    window.TallerSystemsEngine?.reset();
    window.TallerSystems?.resetSimulations();
    timer.running = false;
    timer.remaining = state.minutes * 60;
    save();
    $('#confirm-dialog').close();
    render();
    toast('Progreso reiniciado. Un nuevo comienzo.');
  });
  $('#import-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error('El archivo supera el tamaño permitido (10 MB).');
      const rawImport = JSON.parse(await file.text());
      const imported = sanitize(rawImport);
      if (rawImport.campaign) window.TallerCampaignEngine.validateImport(rawImport.campaign);
      if (rawImport.lab) window.TallerLab.validateImport(rawImport.lab);
      if (rawImport.systems) window.TallerSystemsEngine.validateImport(rawImport.systems);
      // El estado combinado se arma sin mutar `state`; se asigna al final.
      const combined = {
        ...state,
        completed: [...new Set([...state.completed, ...imported.completed])],
        milestones: [...new Set([...state.milestones, ...imported.milestones])],
        favorites: [...new Set([...state.favorites, ...imported.favorites])],
        quizAnswers: { ...state.quizAnswers, ...imported.quizAnswers },
        notes: { rust: { ...state.notes.rust }, go: { ...state.notes.go } },
      };
      for (const language of ['rust', 'go'])
        for (const field of ['learned', 'next'])
          if (imported.notes[language][field])
            combined.notes[language][field] = imported.notes[language][field];
      if (rawImport.campaign) window.TallerCampaignEngine?.importState(rawImport.campaign);
      if (rawImport.lab) window.TallerLab?.importState(rawImport.lab);
      if (rawImport.systems) window.TallerSystemsEngine.importState(rawImport.systems);
      state = combined;
      save();
      render();
      toast('Copia importada y combinada con tu avance actual.');
    } catch (error) {
      toast(
        'No se pudo importar: ' +
          (error instanceof SyntaxError ? 'el archivo no contiene JSON válido.' : error.message),
      );
    }
    event.target.value = '';
  });
  render();
  if (loadNotices.length) toast(loadNotices.join(' · '));
})();
