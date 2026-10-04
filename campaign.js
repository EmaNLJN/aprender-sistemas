import { escapeHtml } from './src/shared/lib/escape-html';
import { LEVEL_LABELS } from './src/shared/config/levels';
(() => {
  'use strict';
  const engine = window.TallerCampaignEngine;
  const ranks = [
    'Explorador',
    'Aprendiz de sistemas',
    'Constructor',
    'Arquitecto',
    'Maestro del taller',
  ];
  const icons = ['⌘', '◈', '⌁', '✳'];
  let host = null,
    language = 'rust',
    notify = () => {},
    selected = null,
    filter = 'all';
  const exercises = () => window.TallerLab.getExercises();
  const itemFor = (id) => exercises().find((item) => item.id === id);
  const $ = (selector) => host?.querySelector(selector);
  function init() {
    return engine.init(
      {
        exercises: exercises(),
        worlds: { rust: window.RUST_CAMPAIGN || [], go: window.GO_CAMPAIGN || [] },
      },
      // lab.js se evalúa antes que campaign.js: su evidencia ya está disponible al iniciar.
      window.TallerLab?.exportState(),
    );
  }
  // Lo usan los renders: deriva la evidencia en memoria y nunca escribe.
  function refresh() {
    return engine.refreshFromLab(window.TallerLab.exportState());
  }
  // Lo usan las acciones del alumno (ejecutar, predecir): además guarda lo pendiente.
  function sync() {
    return engine.syncLab(window.TallerLab.exportState());
  }
  function mount(element, lang, toast) {
    host = element;
    language = lang;
    notify = toast;
    refresh();
    const linked = new URLSearchParams(location.search).get('mundo');
    const worlds = engine.getWorlds(language);
    if (worlds.some((world) => world.id === linked)) selected = linked;
    if (!worlds.some((world) => world.id === selected))
      selected = (worlds.find((world) => world.unlocked && !world.completed) || worlds[0])?.id;
    host.addEventListener('click', onClick);
    render();
  }
  function unmount() {
    host?.removeEventListener('click', onClick);
    host = null;
    window.TallerEffects?.stop();
  }
  function worldURL(id) {
    return `?mundo=${encodeURIComponent(id)}#campana`;
  }
  function missionURL(world, id) {
    return `?campana=${encodeURIComponent(world.id)}&ejercicio=${encodeURIComponent(id)}&paso=learn#laboratorio`;
  }
  function returnURL(worldId) {
    return worldURL(worldId);
  }
  function missionType(item) {
    return item.challengeType === 'boss'
      ? 'Desafío final'
      : item.challengeType === 'repair'
        ? 'Reparación · lings'
        : item.challengeType === 'kata'
          ? 'Kata'
          : 'Entrenamiento';
  }
  function focusAfter(selector) {
    $(selector)?.focus({ preventScroll: true });
  }
  function render() {
    if (!host) return;
    refresh();
    const worlds = engine.getWorlds(language),
      summary = engine.getSummary(language);
    const world = worlds.find((w) => w.id === selected) || worlds[0];
    if (!world) {
      host.innerHTML = '<p>La campaña todavía no tiene mundos disponibles.</p>';
      return;
    }
    const complete = worlds.filter((w) => w.completed).length;
    host.innerHTML = `<section class="quest-hero"><div><div class="eyebrow"><span class="eyebrow-line"></span> CAMPAÑA · ${language.toUpperCase()}</div><h1>El próximo nivel<br>lo <em>construís vos.</em></h1><p>Una expedición por las ideas que hacen especial a ${language === 'rust' ? 'Rust' : 'Go'}. Repará, inventá y defendé tu solución frente a pruebas reales.</p><div class="quest-pills"><span>4 mundos</span><span>24 misiones</span><span>12 desafíos nuevos</span></div></div><div class="quest-rank"><span class="small-label">TU RANGO</span><div class="rank-symbol" aria-hidden="true">${icons[Math.min(complete, 3)]}</div><strong>${ranks[complete]}</strong><span>${summary.score} / ${summary.maxScore} XP de campaña</span><progress value="${summary.score}" max="${summary.maxScore}" aria-label="Experiencia de campaña"></progress><small>${complete} de 4 insignias</small></div></section>
    ${summary.storageAvailable === false ? '<p class="quest-mode-note" role="status">Este navegador no pudo guardar tu campaña. Exportá tu progreso antes de cerrar la página.</p>' : ''}<div class="quest-mode-note"><span aria-hidden="true">↗</span><p><strong>Una ruta con propósito.</strong> Cada mundo abre el siguiente al reunir 150 XP, verificar sus seis misiones, resolver la predicción final y superar su checkpoint. Tu <a href="?#laboratorio">laboratorio libre</a> sigue disponible.</p></div>
    <nav class="quest-map" aria-label="Mundos de la campaña">${worlds.map((w, i) => `<button class="world-node ${w.completed ? 'complete' : w.unlocked ? 'available' : 'locked'} ${w.id === world.id ? 'selected' : ''}" data-quest="world" data-id="${escapeHtml(w.id)}" aria-pressed="${w.id === world.id}" aria-label="Mundo ${i + 1}: ${escapeHtml(w.title)}, ${w.completed ? 'completado' : w.unlocked ? 'disponible' : 'bloqueado; ver requisitos'}"><span class="world-icon" aria-hidden="true">${w.completed ? '✓' : w.unlocked ? icons[i] : '◇'}</span><span class="world-number">MUNDO 0${i + 1} · ${LEVEL_LABELS[w.level]}</span><strong>${escapeHtml(w.title)}</strong><span class="world-status">${w.completed ? 'Insignia conseguida' : w.unlocked ? `${w.score}/180 XP · explorar →` : 'Bloqueado · ver requisitos'}</span><progress value="${w.score}" max="180" aria-label="Experiencia en ${escapeHtml(w.title)}"></progress></button>`).join('')}</nav>
    <section class="quest-world" id="quest-world" aria-labelledby="quest-world-title"><div class="quest-world-head"><div><span class="eyebrow">${LEVEL_LABELS[world.level]} / ${world.completed ? 'MUNDO COMPLETADO' : world.unlocked ? 'TU EXPEDICIÓN' : 'PRÓXIMA FRONTERA'}</span><h2 id="quest-world-title" tabindex="-1">${escapeHtml(world.title)}</h2><p>${escapeHtml(world.subtitle)}</p></div><span class="world-score">${world.score}<small>/ 180 XP</small></span></div><p class="world-story">${escapeHtml(world.story)}</p><div class="concept-chips">${world.concepts.map((concept) => `<span>${escapeHtml(concept)}</span>`).join('')}</div>
    ${world.unlocked ? worldBody(world) : lockedBody(world)}
    </section>
    <section class="quest-trophy-case"><div><span class="eyebrow">TU COLECCIÓN</span><h2>Ideas que ya pusiste a prueba.</h2><p>Las insignias registran práctica y checkpoints superados. Podés volver a cualquier mundo sin perder tus logros.</p></div><div class="quest-badges">${worlds.map((w, i) => `<div class="quest-badge ${w.completed ? 'earned' : ''}" aria-label="${escapeHtml(w.badge)}: ${w.completed ? 'conseguida' : 'pendiente'}"><span aria-hidden="true">${icons[i]}</span><strong>${escapeHtml(w.badge)}</strong><small>${w.completed ? 'CONSEGUIDA' : 'POR DESCUBRIR'}</small></div>`).join('')}</div></section>
    <details class="quest-rules"><summary>Las reglas del juego y las herramientas que usamos</summary><div class="quest-rule-grid"><div><h3>XP que significa algo</h3><p>20 XP por las pruebas del ejercicio y 10 por su predicción correcta. Repetir no duplica puntos. Editar después no borra lo ganado. Las reflexiones no se califican por longitud.</p></div><div><h3>Ayuda sin castigos</h3><p>Las pistas son gratuitas. Ver una solución queda indicado como práctica con apoyo y cuenta para avanzar. El checkpoint te pide razonar sobre el concepto. Sin vidas, rachas obligatorias ni castigos por tardar.</p></div><div><h3>Herramientas existentes</h3><p>El IDE usa <a href="https://codemirror.net/" target="_blank" rel="noopener noreferrer">CodeMirror</a>; las celebraciones, <a href="https://github.com/catdad/canvas-confetti" target="_blank" rel="noopener noreferrer">canvas-confetti</a>. Nos inspiran los ejercicios con pistas de <a href="https://rustlings.rust-lang.org/usage/" target="_blank" rel="noopener noreferrer">Rustlings</a> y <a href="https://github.com/madhank93/golings" target="_blank" rel="noopener noreferrer">Golings</a>. Estas misiones son originales.</p></div></div><p class="quest-honesty">El avance se guarda en tu navegador y viaja con Exportar progreso. Es un juego de aprendizaje personal: los puntos y tests no certifican dominio profesional ni evalúan todas las soluciones posibles. Los errores del compilador son reales; la orientación es preparada para cada desafío.</p></details>`;
  }
  function lockedBody(world) {
    const previous = engine.getWorlds(language).find((w) => w.unlocked && !w.completed);
    return `<div class="quest-lock"><span class="lock-symbol" aria-hidden="true">◇</span><div><h3>Esta región tiene un requisito.</h3><p>Podés conocer su tema ahora. Sus misiones se habilitan cuando completes los mundos anteriores.</p><ul>${world.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>${previous ? `<button class="button" data-quest="world" data-id="${escapeHtml(previous.id)}">Volver a ${escapeHtml(previous.title)} →</button>` : ''}</div></div>`;
  }
  function worldBody(world) {
    const missions = world.missions.filter(
      (m) => filter === 'all' || missionType(itemFor(m.id)).startsWith(filter),
    );
    const next = world.missions.find((m) => m.allowed && (!m.code || !m.prediction));
    return `<div class="quest-brief"><div><span class="small-label">POR QUÉ EXPLORARLO</span><p>${escapeHtml(world.why)}</p></div><ol>${world.guide.map((step, i) => `<li><span>0${i + 1}</span>${escapeHtml(step)}</li>`).join('')}</ol></div>
    ${world.completed ? `<div class="quest-unlocked" role="status"><span aria-hidden="true">✳</span><div><strong>Insignia conseguida: ${escapeHtml(world.badge)}</strong><p>Podés completar los puntos que faltan o seguir al siguiente mundo.</p></div>${nextWorldButton(world)}</div>` : next ? `<div class="quest-next"><div><span class="small-label">TU SIGUIENTE MOVIMIENTO</span><strong>${escapeHtml(itemFor(next.id).title)}</strong><small>${next.code ? 'Código aprobado. Volvé a Descubrí y razoná la predicción.' : 'Una misión, una hipótesis y tres pruebas.'}</small></div><a class="button" href="${missionURL(world, next.id)}">${next.code ? 'Resolver predicción' : 'Entrar al IDE'} ↗</a></div>` : ''}
    <div class="quest-mission-top"><h3>Seis misiones para conectar las piezas.</h3><div class="quest-filters" role="group" aria-label="Tipo de misión">${['all', 'Entrenamiento', 'Reparación', 'Kata', 'Desafío final'].map((type) => `<button data-quest="filter" data-filter="${type}" aria-pressed="${filter === type}">${type === 'all' ? 'Todas' : type}</button>`).join('')}</div></div>
    <div class="quest-missions">${missions.map((m) => missionHTML(world, m)).join('')}</div>${checkpointHTML(world)}`;
  }
  function nextWorldButton(world) {
    const worlds = engine.getWorlds(language),
      index = worlds.findIndex((w) => w.id === world.id),
      next = worlds[index + 1];
    return next
      ? `<button class="button secondary" data-quest="world" data-id="${escapeHtml(next.id)}">Siguiente mundo →</button>`
      : '<a class="button secondary" href="#proyecto">Llevarlo a mi proyecto ↗</a>';
  }
  function missionHTML(world, mission) {
    const item = itemFor(mission.id),
      boss = item.id === world.bossId;
    return `<article class="quest-mission ${boss ? 'is-boss' : ''} ${mission.code && mission.prediction ? 'is-mastered' : ''} ${!mission.allowed ? 'is-locked' : ''}"><div class="quest-mission-title"><span class="mission-type">${escapeHtml(missionType(item))}</span><span class="mission-points">${mission.points}/30 XP</span></div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.objective)}</p><div class="mission-seals"><span class="${mission.code ? 'earned' : ''}">${mission.code ? '✓' : '○'} Pruebas · 20</span><span class="${mission.prediction ? 'earned' : ''}">${mission.prediction ? '✓' : '○'} Predicción · 10</span></div>${mission.assisted ? '<small class="mission-assisted">Práctica con solución de apoyo</small>' : ''}${mission.allowed ? `<a class="button small ${boss ? '' : 'secondary'}" href="${missionURL(world, item.id)}">${mission.code && mission.prediction ? 'Volver a experimentar' : boss ? 'Enfrentar el desafío final' : 'Abrir misión'} ↗</a>` : `<details class="mission-requirements"><summary>Ver qué falta para entrar</summary><ul>${mission.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul></details>`}</article>`;
  }
  function checkpointHTML(world) {
    const q = world.checkpoint,
      answer = world.checkpointAnswer;
    return `<section class="quest-checkpoint" id="quest-checkpoint" aria-labelledby="checkpoint-title"><div class="checkpoint-heading"><span aria-hidden="true">${world.checkpointPassed ? '✓' : '?'}</span><div><span class="small-label">CHECKPOINT · LA ÚLTIMA LLAVE</span><h3 id="checkpoint-title">${world.checkpointPassed ? 'Una idea que ya podés explicar.' : 'El código funciona. ¿Sabés por qué?'}</h3></div></div>${world.checkpointReady ? `<p class="checkpoint-question">${escapeHtml(q.question)}</p><div class="checkpoint-options">${q.options.map((option, i) => `<button data-quest="checkpoint" data-answer="${i}" aria-pressed="${answer === i}" class="${answer === i ? (i === q.answer ? 'correct' : 'incorrect') : ''}"><span>${String.fromCharCode(65 + i)}</span>${escapeHtml(option)}</button>`).join('')}</div><div class="checkpoint-feedback" role="status">${answer === null ? 'Elegí la explicación que mejor sostenga tu decisión.' : `<strong>${answer === q.answer ? 'Bien razonado.' : 'Revisemos esa idea.'}</strong> ${escapeHtml(world.checkpointFeedback)}`}</div>` : `<p>Se abre al verificar las seis misiones, reunir 150 XP y resolver la predicción del desafío final.</p><ul>${world.checkpointReasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>`}</section>`;
  }
  function onClick(event) {
    const button = event.target.closest('[data-quest]');
    if (!button) return;
    if (button.dataset.quest === 'world') {
      selected = button.dataset.id;
      filter = 'all';
      const url = new URL(location.href);
      url.search = '';
      url.searchParams.set('mundo', selected);
      history.replaceState(null, '', url);
      render();
      $('#quest-world')?.scrollIntoView({ block: 'start', behavior: 'instant' });
      focusAfter('#quest-world-title');
    }
    if (button.dataset.quest === 'filter') {
      filter = button.dataset.filter;
      render();
      focusAfter(`[data-quest="filter"][data-filter="${filter}"]`);
    }
    if (button.dataset.quest === 'checkpoint') {
      const before = engine.getWorlds(language).find((w) => w.id === selected),
        result = engine.answerCheckpoint(selected, Number(button.dataset.answer));
      if (!result.accepted) {
        notify(result.reasons.join(' '));
        return;
      }
      render();
      focusAfter(`[data-quest="checkpoint"][data-answer="${button.dataset.answer}"]`);
      const after = engine.getWorlds(language).find((w) => w.id === selected);
      if (!before.completed && after.completed) {
        window.TallerEffects?.celebrate();
        const finished =
          engine.getSummary(language).completedWorlds === engine.getWorlds(language).length;
        notify(
          `¡${after.badge}! ${finished ? 'Completaste los cuatro mundos. Es hora de llevarlo a tu proyecto.' : 'Un mundo completado. Tu próximo nivel está disponible.'}`,
        );
      } else
        notify(
          result.correct
            ? 'Checkpoint superado. Tu explicación conecta las piezas.'
            : 'Leé el porqué y probá otra explicación.',
        );
    }
  }
  function exerciseContextHTML(id, lang) {
    const worldId = new URLSearchParams(location.search).get('campana');
    if (!worldId) return '';
    refresh();
    const world = engine.getWorlds(lang).find((w) => w.id === worldId),
      mission = world?.missions.find((m) => m.id === id);
    if (!world || !mission) return '';
    return `<div class="quest-lab-context"><a href="${worldURL(world.id)}">← ${escapeHtml(world.title)}</a><span>${mission.points}/30 XP · ${escapeHtml(missionType(itemFor(id)))}</span><span>${mission.code ? '✓' : '○'} Pruebas ${mission.prediction ? '✓' : '○'} Predicción</span></div>`;
  }
  function lockedExerciseHTML(id, lang) {
    const worldId = new URLSearchParams(location.search).get('campana');
    if (!worldId) return '';
    const world = engine.getWorlds(lang).find((w) => w.id === worldId),
      mission = world?.missions.find((m) => m.id === id);
    const gate = engine.canAttempt(id, lang);
    if (world && mission && gate.allowed && gate.worldId === worldId) return '';
    return `<section class="quest-direct-lock"><div class="eyebrow">CAMPAÑA · ACCESO A LA MISIÓN</div><h1>Primero, las piezas<br><em>que te preparan.</em></h1><p>Esta misión todavía no está disponible en tu campaña.</p><ul>${(mission ? gate.reasons : ['El enlace no corresponde a una misión de este mundo.']).map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul><a class="button" href="${world ? worldURL(world.id) : '#campana'}">Ver mi mapa →</a></section>`;
  }
  window.TallerCampaign = {
    init,
    refresh,
    sync,
    mount,
    unmount,
    returnURL,
    exerciseContextHTML,
    lockedExerciseHTML,
  };
})();
