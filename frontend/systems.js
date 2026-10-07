import { normalizeSearchText } from './src/shared/lib/normalize-search-text';
import { escapeHtml } from './src/shared/lib/escape-html';
import { mergeModelGroups } from './src/entities/systems-simulation';
import { LEVEL_LABELS } from './src/shared/config/levels';
(() => {
  'use strict';
  const engine = window.TallerSystemsEngine;
  const groups = {
    all: 'Todo el taller',
    machine: 'Dentro de la máquina',
    infra: 'Datos e infraestructura',
    play: 'Gráficos, álgebra y juegos',
  };
  const symbols = { machine: '▧', infra: '⌘', play: '◈' };
  let host = null,
    language = 'rust',
    notify = () => {},
    selected = null,
    phase = 'explore',
    category = 'all',
    query = '',
    models = {};
  const simulations = new Map();
  const $ = (selector) => host?.querySelector(selector);
  const packages = () =>
    [window.SYSTEMS_PC, window.SYSTEMS_LOWLEVEL, window.SYSTEMS_INFRA, window.SYSTEMS_PLAY].filter(
      Boolean,
    );
  const workshops = () => packages().flatMap((source) => source.workshops);
  // `refresh` lo usan los renders (sólo memoria); `sync`, las acciones del alumno (además guarda).
  const refresh = () => engine.refreshFromLab(window.TallerLab.exportState());
  const sync = () => engine.syncLab(window.TallerLab.exportState());
  function init() {
    models = mergeModelGroups(packages().map((source) => source.models));
    return engine.init({
      workshops: workshops(),
      models,
      exercises: window.TallerLab.getExercises(),
    });
  }
  function mount(element, lang, toast) {
    host = element;
    language = lang;
    notify = toast;
    refresh();
    const params = new URLSearchParams(location.search),
      id = params.get('taller');
    selected = workshops().some((w) => w.id === id) ? id : null;
    phase = ['explore', 'build', 'ship'].includes(params.get('parte'))
      ? params.get('parte')
      : 'explore';
    host.addEventListener('click', onClick);
    host.addEventListener('input', onInput);
    host.addEventListener('change', onChange);
    render();
  }
  function unmount() {
    host?.removeEventListener('click', onClick);
    host?.removeEventListener('input', onInput);
    host?.removeEventListener('change', onChange);
    host = null;
    window.TallerEffects?.stop();
  }
  function returnURL(id, lang = language) {
    return `?taller=${encodeURIComponent(id)}&parte=build&lenguaje=${lang === 'go' ? 'go' : 'rust'}#sistemas`;
  }
  function missionIDs(id, lang) {
    const w = workshops().find((item) => item.id === id);
    return w ? [...new Set([...(w.related?.[lang] || []), w.code[lang]])] : [];
  }
  function codeURL(workshop, id) {
    return `?sistema=${encodeURIComponent(workshop.id)}&ejercicio=${encodeURIComponent(id)}&paso=code#laboratorio`;
  }
  function locationForSelection() {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('lenguaje', language);
    if (selected) {
      url.searchParams.set('taller', selected);
      url.searchParams.set('parte', phase);
    }
    history.replaceState(null, '', url);
  }
  function stateFor(workshop) {
    const key = language + ':' + workshop.id;
    if (!simulations.has(key)) simulations.set(key, models[workshop.model].initial(workshop));
    return simulations.get(key);
  }
  function render() {
    if (!host) return;
    refresh();
    host.innerHTML = selected ? detail(engine.get(selected, language)) : overview();
  }
  function overview() {
    const all = engine.list(language),
      done = all.filter((w) => w.completed).length;
    return `<section class="sys-hero"><div><div class="eyebrow"><span class="eyebrow-line"></span> SISTEMAS · APRENDER DESARMANDO</div><h1>Abrí la caja.<br><em>Construí lo que hay adentro.</em></h1><p>Memoria que se fragmenta. Bases de datos que sobreviven a un corte. Rayos que dibujan un mundo. Hacé visible una idea, provocá un fallo y construí su núcleo en ${language === 'rust' ? 'Rust' : 'Go'}.</p><div class="sys-pills"><span>${all.length} talleres</span><span>${all.length * 2} núcleos programables</span><span>Modelos paso a paso</span></div></div><div class="sys-hero-board" aria-hidden="true"><div class="sys-board-row"><span>01</span><b>ESTADO</b><i>▧</i></div><div class="sys-board-path">↓ proponer · observar · explicar</div><div class="sys-board-row"><span>10</span><b>REGLA</b><i>⌘</i></div><div class="sys-board-path">↓ escribir · comprobar · cambiar</div><div class="sys-board-row last"><span>11</span><b>PROYECTO</b><i>◈</i></div></div></section>
    <div class="sys-overview-progress"><div><strong>${done} / ${all.length}</strong><span>talleres con sus tres sellos en ${language === 'rust' ? 'Rust' : 'Go'}</span></div><progress value="${done}" max="${all.length}" aria-label="Talleres con modelo, código y checkpoint completados"></progress></div>
    <section class="sys-start"><h2>Elegí una curiosidad. Seguí sus consecuencias.</h2><p>En cada taller: explorás tres situaciones, verificás un núcleo con pruebas reales y razonás un checkpoint. Después podés descargar tu proyecto y ampliarlo. El proyecto completo tiene criterios manuales; los sellos registran el trabajo del taller.</p></section>
    <div class="sys-toolbar"><div class="sys-filters" role="group" aria-label="Familia de talleres">${Object.entries(
      groups,
    )
      .map(
        ([key, label]) =>
          `<button data-sys="category" data-value="${key}" aria-pressed="${category === key}">${label}</button>`,
      )
      .join(
        '',
      )}</div><label class="sys-search"><span aria-hidden="true">⌕</span><input id="sys-search" type="search" autocomplete="off" placeholder="Caché, rayos, kernel, colisiones…" aria-label="Buscar talleres de sistemas" value="${escapeHtml(query)}"></label></div>
    <p id="sys-count" class="sys-result-count" role="status">${filtered(all).length} talleres para explorar</p><div id="sys-catalog" class="sys-catalog">${cards(filtered(all))}</div>
    ${externalTools()}<details class="sys-boundaries"><summary>Del modelo a una implementación real</summary><p>Los modelos corren localmente y explican sus reglas. Tu código se compila con el runner de Rust o Go. Un MMU de papel no programa la MMU física; una cola visual no simula el scheduler completo del sistema operativo. Cada taller delimita qué enseña, enlaza fuentes y propone pasos concretos para seguir fuera del navegador.</p><p>Los proyectos reutilizan el IDE, el runner y un formato común de modelos, objetivos y pruebas. Las descargas ZIP usan <a href="https://github.com/101arrowz/fflate" target="_blank" rel="noopener noreferrer">fflate</a>. Tu avance sigue siendo local y se incluye al exportar la guía.</p></details>`;
  }
  function filtered(items) {
    const q = normalizeSearchText(query);
    return items.filter(
      (w) =>
        (category === 'all' || w.category === category) &&
        normalizeSearchText([w.title, w.subtitle, w.what, w.why, w.id].join(' ')).includes(q),
    );
  }
  function externalTools() {
    return `<section class="sys-external"><div class="eyebrow">TU PRÓXIMO BANCO DE PRUEBAS</div><h2>Seguí construyendo con herramientas reales.</h2><p>Estos proyectos documentados complementan los modelos del taller. Se abren en sus propios sitios; tu avance acá se conserva.</p><div class="sys-external-grid"><article><span class="small-label">DE COMPUERTAS A PROGRAMAS</span><h3>Nand2Tetris</h3><p>Construí RAM y una CPU Hack con HDL, probalas y observá programas en sus emuladores.</p><strong>Experimento: cambiá una celda de RAM y seguí qué instrucción la lee.</strong><a href="https://nand2tetris.github.io/web-ide/" target="_blank" rel="noopener noreferrer">Abrir el IDE web ↗</a><a href="https://www.nand2tetris.org/project03" target="_blank" rel="noopener noreferrer">Guía oficial de memoria ↗</a></article><article><span class="small-label">ARQUITECTURA A LA VISTA</span><h3>Ripes</h3><p>Explorá instrucciones RISC‑V, procesadores, cachés y dispositivos mapeados en memoria. Su versión web es experimental.</p><strong>Experimento: repetí un acceso y compará dos configuraciones de caché.</strong><a href="https://ripes.dk/" target="_blank" rel="noopener noreferrer">Abrir Ripes ↗</a><a href="https://github.com/mortbopet/Ripes" target="_blank" rel="noopener noreferrer">Documentación y versión de escritorio ↗</a></article><article><span class="small-label">MEMORIA VIRTUAL Y SISTEMA OPERATIVO</span><h3>OSTEP</h3><p>Usá los simuladores de los autores para practicar traducción, paginación, heap y planificación con nuevos escenarios.</p><strong>Experimento: calculá una dirección física antes de pedir la solución al simulador.</strong><a href="https://github.com/remzi-arpacidusseau/ostep-homework" target="_blank" rel="noopener noreferrer">Ejercicios y simuladores ↗</a><a href="https://pages.cs.wisc.edu/~remzi/OSTEP/" target="_blank" rel="noopener noreferrer">Leer el libro gratuito ↗</a></article></div></section>`;
  }
  function cards(items) {
    return items.length
      ? items
          .map(
            (w) =>
              `<article class="sys-card"><div class="sys-card-top"><span class="sys-card-symbol" aria-hidden="true">${symbols[w.category] || '◈'}</span><span>${LEVEL_LABELS[w.level]} · ${w.minutes} min orientativos</span></div><span class="small-label">${escapeHtml(groups[w.category])}</span><h2>${escapeHtml(w.title)}</h2><p>${escapeHtml(w.subtitle)}</p><div class="sys-card-bottom"><span>${w.completed ? '✓ Tres sellos conseguidos' : `${w.seals}/3 sellos`}</span><button class="button small secondary" data-sys="open" data-id="${w.id}">Explorar →</button></div></article>`,
          )
          .join('')
      : '<div class="lab-empty"><h2>No aparece ese taller.</h2><p>Probá otra idea o quitá los filtros.</p><button class="button secondary" data-sys="clear">Ver todos los talleres</button></div>';
  }
  function detail(workshop) {
    return `<div class="sys-breadcrumb"><button data-sys="back">← Todos los talleres</button><span>${escapeHtml(groups[workshop.category])} / ${LEVEL_LABELS[workshop.level]}</span></div><header class="sys-detail-heading"><div class="eyebrow">${symbols[workshop.category]} ${language.toUpperCase()} · ${workshop.minutes} MIN ORIENTATIVOS</div><h1 tabindex="-1">${escapeHtml(workshop.title)}</h1><p>${escapeHtml(workshop.story)}</p></header>
    <div class="sys-seals" aria-label="Progreso del taller">${[
      [workshop.modelDone, '01', 'Modelo explorado'],
      [workshop.progress.code, '02', 'Código verificado'],
      [workshop.progress.predicted, '03', 'Checkpoint razonado'],
    ]
      .map(
        ([done, n, label]) =>
          `<span class="${done ? 'earned' : ''}"><b>${done ? '✓' : n}</b>${label}</span>`,
      )
      .join('')}</div>
    ${!workshop.storageAvailable ? '<p class="sys-storage" role="status">No se pudo guardar el progreso. Exportá una copia antes de cerrar.</p>' : ''}
    <div class="sys-tabs" role="group" aria-label="Etapas del taller">${[
      ['explore', 'Manipulá el sistema'],
      ['build', 'Programá su núcleo'],
      ['ship', 'Llevátelo a un proyecto'],
    ]
      .map(
        ([id, label], index) =>
          `<button data-sys="phase" data-value="${id}" aria-pressed="${phase === id}"><span>0${index + 1}</span>${label}</button>`,
      )
      .join('')}</div>
    <div class="sys-phase">${phase === 'explore' ? explore(workshop) : phase === 'build' ? build(workshop) : ship(workshop)}</div>`;
  }
  function explore(workshop) {
    const state = stateFor(workshop),
      model = models[workshop.model],
      view = model.view(state, workshop);
    return `<div class="sys-concept"><section><h2>¿Qué estás construyendo?</h2><p>${escapeHtml(workshop.what)}</p></section><section><h2>¿Por qué existe?</h2><p>${escapeHtml(workshop.why)}</p></section></div><div class="sys-model-layout"><section class="sys-sandbox" aria-label="Modelo interactivo de ${escapeHtml(workshop.title)}"><div class="sys-model-top"><span class="small-label">MODELO CONCEPTUAL · PASO A PASO</span><button class="text-button" data-sys="reset-model">Reiniciar modelo ↺</button></div><div id="sys-model-view">${modelView(view)}</div><p id="sys-model-live" class="sys-model-live" role="status" aria-live="polite">${escapeHtml(view.explanation)}</p></section><aside class="sys-objectives"><span class="eyebrow">TU INVESTIGACIÓN</span><h2>Tres cosas para descubrir.</h2><div id="sys-objective-list">${objectives(workshop)}</div><p>Los sellos se conservan al reiniciar el modelo. Experimentar acá no ejecuta ni aprueba el código del editor.</p></aside></div><div class="sys-limit"><strong>Hasta dónde llega este modelo</strong><p>${escapeHtml(workshop.limits)}</p></div>${checkpoint(workshop)}<div class="sys-footer"><p>Convertí las reglas que observaste en una función que puedas probar.</p><button class="button" data-sys="phase" data-value="build">Programar el núcleo →</button></div>${sources(workshop)}`;
  }
  function objectives(workshop) {
    return workshop.objectives
      .map(
        (goal) =>
          `<div class="sys-goal ${workshop.progress.observed.includes(goal.id) ? 'earned' : ''}"><span aria-hidden="true">${workshop.progress.observed.includes(goal.id) ? '✓' : '○'}</span><div><strong>${escapeHtml(goal.label)}</strong><p>${escapeHtml(goal.why)}</p></div></div>`,
      )
      .join('');
  }
  function modelView(view) {
    return `<h2>${escapeHtml(view.title)}</h2><p class="sys-model-summary">${escapeHtml(view.summary)}</p><div class="sys-metrics">${(view.metrics || []).map((metric) => `<div><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong></div>`).join('')}</div>${view.scene ? scene(view.scene) : ''}${view.cells?.length ? `<div class="sys-cells">${view.cells.map((cell) => `<div class="sys-cell ${['active', 'good', 'bad', 'muted'].includes(cell.tone) ? cell.tone : ''}"><span>${escapeHtml(cell.label)}</span><strong>${escapeHtml(cell.value)}</strong></div>`).join('')}</div>` : ''}${view.columns?.length ? `<div class="sys-table-scroll" tabindex="0" role="region" aria-label="Estado del modelo"><table><thead><tr>${view.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${(view.rows || []).map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}<div class="sys-controls" role="group" aria-label="Acciones del modelo">${(view.controls || []).map((control) => `<button data-sys="model" data-model-action="${escapeHtml(control.action)}" data-value="${escapeHtml(control.value ?? '')}" ${control.disabled ? 'disabled' : ''}>${escapeHtml(control.label)}</button>`).join('')}</div>${
      view.log?.length
        ? `<details class="sys-trace" open><summary>Qué cambió y por qué · últimos pasos</summary><ol>${view.log
            .slice(-8)
            .map((line) => `<li>${escapeHtml(line)}</li>`)
            .join('')}</ol></details>`
        : ''
    }`;
  }
  function scene(data) {
    const finite = (n, fallback = 0) => (Number.isFinite(Number(n)) ? Number(n) : fallback);
    const color = (value, fallback = 'none') =>
      /^(#[0-9a-f]{3,8}|none|currentColor|transparent)$/i.test(value || '') ? value : fallback;
    const shapes = (data.shapes || [])
      .slice(0, 2500)
      .map((shape) => {
        const style = `fill="${color(shape.fill)}" stroke="${color(shape.stroke)}" stroke-width="${Math.max(0, finite(shape.strokeWidth, 1))}"`;
        if (shape.type === 'rect')
          return `<rect x="${finite(shape.x)}" y="${finite(shape.y)}" width="${Math.max(0, finite(shape.width))}" height="${Math.max(0, finite(shape.height))}" ${style}/>`;
        if (shape.type === 'circle')
          return `<circle cx="${finite(shape.x)}" cy="${finite(shape.y)}" r="${Math.max(0, finite(shape.r))}" ${style}/>`;
        if (shape.type === 'line')
          return `<line x1="${finite(shape.x1)}" y1="${finite(shape.y1)}" x2="${finite(shape.x2)}" y2="${finite(shape.y2)}" ${style}/>`;
        if (shape.type === 'polygon')
          return `<polygon points="${(shape.points || []).map((pair) => `${finite(pair[0])},${finite(pair[1])}`).join(' ')}" ${style}/>`;
        if (shape.type === 'text')
          return `<text x="${finite(shape.x)}" y="${finite(shape.y)}" fill="${color(shape.fill, '#252c27')}" font-size="${finite(shape.fontSize, 12)}" font-family="monospace">${escapeHtml(shape.text)}</text>`;
        return '';
      })
      .join('');
    return `<svg class="sys-scene" viewBox="0 0 ${Math.max(1, finite(data.width, 400))} ${Math.max(1, finite(data.height, 260))}" role="img" aria-label="${escapeHtml(data.alt)}" style="background:${color(data.background, '#eeeae1')}">${shapes}</svg>`;
  }
  function checkpoint(workshop) {
    const q = workshop.prediction,
      r = workshop.progress;
    return `<section class="sys-checkpoint"><div class="small-label">CHECKPOINT · EXPLICÁ LA DECISIÓN</div><h2>${escapeHtml(q.question)}</h2><div class="sys-answers">${q.options.map((option, index) => `<button data-sys="answer" data-index="${index}" aria-pressed="${r.answer === index}" class="${r.answer === index ? (index === q.answer ? 'correct' : 'incorrect') : ''}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`).join('')}</div><div class="sys-feedback" role="status">${r.answer === null ? 'Probá una explicación. Después contrastala con el porqué.' : `<strong>${r.answer === q.answer ? 'Esa es la idea.' : 'Revisemos esa decisión.'}</strong> ${escapeHtml(q.explanation)}`}</div></section>`;
  }
  function build(workshop) {
    const item = window.TallerLab.getExercises().find((ex) => ex.id === workshop.code[language]);
    return `<div class="sys-build-callout"><div><span class="small-label">NÚCLEO EJECUTABLE · ${language.toUpperCase()}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.objective)}</p><div class="sys-pills"><span>${item.tests.length} pruebas reales</span><span>Pistas progresivas</span><span>Tu propio caso extra</span></div></div><a class="button" href="${codeURL(workshop, item.id)}">Entrar al IDE ↗</a></div><div class="sys-concept"><section><h2>Del dibujo al código.</h2><p>${escapeHtml(workshop.bridge[language])}</p></section><section><h2>Lo que vas a verificar.</h2><ul>${item.tests.map((test) => `<li><strong>${escapeHtml(test.label)}</strong><br>${escapeHtml(test.why)}</li>`).join('')}</ul></section></div>${workshop.progress.code ? '<p class="sys-code-passed" role="status">✓ Este núcleo tiene una ejecución registrada con sus tres casos aprobados. Cambiarlo no borra el sello: ejecutá otra vez para verificar el código nuevo.</p>' : ''}<div class="sys-related"><h2>Herramientas que preparan esta idea.</h2><p>Estos ejercicios existentes se reutilizan como práctica previa. Podés ir directamente al núcleo si ya entendés el concepto.</p><div>${(
      workshop.related?.[language] || []
    )
      .map((id) => {
        const ex = window.TallerLab.getExercises().find((x) => x.id === id);
        return ex
          ? `<a href="${codeURL(workshop, id)}"><span>${id}</span>${escapeHtml(ex.title)} ↗</a>`
          : '';
      })
      .join(
        '',
      )}</div></div><div class="sys-footer"><p>El navegador comprueba el núcleo acotado. El próximo paso convierte esa pieza en un proyecto.</p><button class="button" data-sys="phase" data-value="ship">Armar mi proyecto →</button></div>${sources(workshop)}`;
  }
  function ship(workshop) {
    return `<section class="sys-project-intro"><div><span class="eyebrow">UNA PIEZA QUE PODÉS LLEVARTE</span><h2>Del experimento al proyecto.</h2><p>Descargá un kit con tu borrador actual, tres tests, una solución separada para consultar y esta hoja de ruta. ${language === 'rust' ? 'Incluye Cargo.toml y pruebas de Rust.' : 'Incluye go.mod y pruebas de Go.'} El kit implementa el núcleo del ejercicio; estas cuatro etapas guían la ampliación.</p></div><button class="button" data-sys="download">Descargar kit ${language === 'rust' ? 'Rust' : 'Go'} ↓</button></section><div class="sys-real-uses"><h3>Dónde aparece esta idea</h3>${workshop.uses.map((use) => `<span>${escapeHtml(use)}</span>`).join('')}</div><div class="sys-project-steps">${workshop.steps.map((step, index) => `<article><div class="sys-step-index">0${index + 1}</div><div><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.task)}</p><p><strong>Por qué:</strong> ${escapeHtml(step.why)}</p><div class="sys-acceptance"><strong>Lo podés comprobar así</strong><p>${escapeHtml(step.done)}</p></div><label><input type="checkbox" data-sys-step="${index}" ${workshop.progress.steps.includes(index) ? 'checked' : ''}> Lo comprobé en mi proyecto · registro manual</label></div></article>`).join('')}</div><div class="sys-limit"><strong>Límite y siguiente herramienta</strong><p>${escapeHtml(workshop.limits)}</p><p>${escapeHtml(workshop.bridge[language])}</p></div><label class="sys-note"><span>Dejá tu próximo experimento por escrito</span><textarea id="sys-note" maxlength="10000" placeholder="Observé que… Mi próximo test va a demostrar…">${escapeHtml(workshop.progress.note)}</textarea></label><p id="sys-note-status" class="note-state">La nota y las etapas se guardan con tu progreso. Las casillas son tu registro, no una evaluación automática.</p>${checkpoint(workshop)}${sources(workshop)}`;
  }
  function sources(workshop) {
    return `<section class="sys-sources"><h2>Seguí con quienes construyeron estas ideas.</h2><div>${workshop.sources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)} ↗</a>`).join('')}</div></section>`;
  }
  function onClick(event) {
    const button = event.target.closest('[data-sys]');
    if (!button) return;
    const action = button.dataset.sys;
    if (action === 'open') {
      selected = button.dataset.id;
      phase = 'explore';
      locationForSelection();
      render();
      $('h1')?.focus();
      host.scrollIntoView({ block: 'start' });
    }
    if (action === 'back') {
      selected = null;
      locationForSelection();
      render();
      host.scrollIntoView({ block: 'start' });
    }
    if (action === 'phase') {
      phase = button.dataset.value;
      locationForSelection();
      render();
      $(`[data-sys="phase"][data-value="${phase}"]`)?.focus({ preventScroll: true });
      $('.sys-tabs')?.scrollIntoView({ block: 'start' });
    }
    if (action === 'category') {
      category = button.dataset.value;
      render();
      $(`[data-sys="category"][data-value="${category}"]`)?.focus({ preventScroll: true });
    }
    if (action === 'clear') {
      category = 'all';
      query = '';
      render();
      $('#sys-search')?.focus();
    }
    if (action === 'model' || action === 'reset-model') {
      const before = engine.get(selected, language),
        model = models[before.model],
        key = language + ':' + selected;
      const state =
        action === 'reset-model'
          ? model.initial(before)
          : model.act(stateFor(before), button.dataset.modelAction, button.dataset.value, before);
      simulations.set(key, state);
      const result = engine.observe(selected, language, model.achieved(state, before)),
        view = model.view(state, before);
      $('#sys-model-view').innerHTML = modelView(view);
      $('#sys-model-live').textContent = view.explanation;
      $('#sys-objective-list').innerHTML = objectives(result);
      const seal = host.querySelector('.sys-seals span');
      if (result.modelDone) {
        seal.classList.add('earned');
        seal.querySelector('b').textContent = '✓';
      }
      if (result.added.length)
        notify(
          'Nueva situación comprendida: ' +
            result.added
              .map((id) => before.objectives.find((goal) => goal.id === id)?.label)
              .join(' · '),
        );
      if (!before.completed && result.completed) {
        window.TallerEffects?.celebrate();
        notify('Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.');
      }
      if (action === 'model')
        [...host.querySelectorAll('[data-sys="model"]')]
          .find(
            (el) =>
              el.dataset.modelAction === button.dataset.modelAction &&
              el.dataset.value === button.dataset.value,
          )
          ?.focus({ preventScroll: true });
    }
    if (action === 'answer') {
      const before = engine.get(selected, language),
        result = engine.answer(selected, language, Number(button.dataset.index));
      render();
      $(`[data-sys="answer"][data-index="${button.dataset.index}"]`)?.focus({
        preventScroll: true,
      });
      if (!before.completed && result.completed) window.TallerEffects?.celebrate();
      notify(
        result.correct
          ? 'Checkpoint razonado. Contrastá la explicación con tu experimento.'
          : 'Revisá el porqué y probá otra explicación.',
      );
    }
    if (action === 'download') {
      try {
        window.TallerProjectKit.download(engine.get(selected, language), language);
        notify('Kit descargado con tu borrador y sus pruebas.');
      } catch (error) {
        notify('No se pudo preparar el kit: ' + error.message);
      }
    }
  }
  function onInput(event) {
    if (event.target.id === 'sys-search') {
      query = event.target.value;
      const items = filtered(engine.list(language));
      $('#sys-catalog').innerHTML = cards(items);
      $('#sys-count').textContent = `${items.length} talleres para explorar`;
    }
    if (event.target.id === 'sys-note') {
      const result = engine.setNote(selected, language, event.target.value);
      $('#sys-note-status').textContent = result.storageAvailable
        ? 'Nota guardada. Dejá un test concreto para volver.'
        : 'No se pudo guardar: exportá tu avance antes de cerrar.';
    }
  }
  function onChange(event) {
    if (event.target.dataset.sysStep !== undefined)
      engine.setStep(
        selected,
        language,
        Number(event.target.dataset.sysStep),
        event.target.checked,
      );
  }
  function exerciseContextHTML(id, lang) {
    const parent = new URLSearchParams(location.search).get('sistema'),
      w = workshops().find((item) => item.id === parent);
    if (!w || !missionIDs(parent, lang).includes(id)) return '';
    refresh();
    const progress = engine.get(parent, lang);
    return `<div class="quest-lab-context"><a href="${returnURL(parent, lang)}">← ${escapeHtml(w.title)}</a><span>${id === w.code[lang] ? 'Núcleo del taller' : 'Herramienta previa'}</span><span>${progress.progress.code ? '✓ Núcleo verificado' : 'Tres pruebas para verificar el núcleo'}</span></div>`;
  }
  window.TallerSystems = {
    init,
    refresh,
    sync,
    mount,
    unmount,
    returnURL,
    missionIDs,
    exerciseContextHTML,
    resetSimulations: () => simulations.clear(),
  };
})();
