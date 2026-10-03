/* The concept atlas is an original, offline reading and prediction companion. */
(() => {
  'use strict';
  const levels = [
    ['all', 'Todos los niveles'], ['beginner', 'Principiante'], ['medium', 'Intermedio'],
    ['advanced', 'Avanzado'], ['expert', 'Experto']
  ];
  const levelNames = Object.fromEntries(levels);
  const levelRanks = {beginner: 1, medium: 2, advanced: 3, expert: 4};
  const blank = () => ({query: '', level: 'all', category: 'all', selected: null, answers: {}, compared: {}, pitfalls: {}});
  const session = {rust: blank(), go: blank()};
  let host = null;
  let language = 'rust';
  let entries = [];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const state = () => session[language];
  const find = selector => host?.querySelector(selector);
  const langName = () => language === 'go' ? 'Go' : 'Rust';
  const safeLink = value => {
    try {const url = new URL(value); return url.protocol === 'https:' ? url.href : '#';}
    catch {return '#';}
  };
  function matching() {
    const current = state();
    const words = normalize(current.query).trim().split(/\s+/).filter(Boolean);
    return entries.filter(entry => (current.level === 'all' || entry.level === current.level)
      && (current.category === 'all' || entry.category === current.category)
      && words.every(word => normalize([entry.title, entry.category, entry.summary, entry.why, entry.comparison, entry.code].join(' ')).includes(word)));
  }
  function selected() {return entries.find(entry => entry.id === state().selected);}
  function paragraphs(value) {
    return String(value || '').split(/\n\s*\n/).filter(Boolean).map(part => '<p>' + escape(part).replace(/\n/g, '<br>') + '</p>').join('');
  }
  function levelMeter(level) {
    return '<span class="atlas-level-meter" aria-hidden="true">' + [1, 2, 3, 4].map(rank => '<i' + (rank <= levelRanks[level] ? ' class="filled"' : '') + '></i>').join('') + '</span>';
  }
  function render() {
    if (!host) return;
    const categories = [...new Set(entries.map(entry => entry.category))];
    host.innerHTML = `<section class="atlas-shell" aria-labelledby="atlas-title">
      <header class="atlas-heading"><div><p class="eyebrow"><span class="eyebrow-line"></span>ATLAS DEL LENGUAJE · ${langName().toUpperCase()}</p><h1 id="atlas-title">Entender el <em>porqué.</em></h1><p>Un mapa para conectar las ideas. Explorá un concepto, leé su razonamiento y poné a prueba tu intuición antes de llevarlo al código.</p></div><div class="atlas-stamp" aria-label="${entries.length} conceptos de ${langName()}"><span class="atlas-stamp-symbol" aria-hidden="true">${language === 'rust' ? '&' : '*'}</span><strong>${entries.length} conceptos</strong><span>DE LA SINTAXIS AL DISEÑO</span></div></header>
      <div class="atlas-tools"><label class="atlas-search"><span class="atlas-field-label">Buscar una idea</span><span class="atlas-search-field"><span aria-hidden="true">⌕</span><input id="atlas-search" type="search" value="${escape(state().query)}" placeholder="Punteros, funciones, memoria…" autocomplete="off" maxlength="160"></span></label><label class="atlas-category"><span class="atlas-field-label">Área del lenguaje</span><select id="atlas-category"><option value="all">Todas las áreas</option>${categories.map(category => `<option value="${escape(category)}" ${state().category === category ? 'selected' : ''}>${escape(category)}</option>`).join('')}</select></label></div>
      <div class="atlas-filter-row"><div class="atlas-levels" role="group" aria-label="Filtrar conceptos por nivel">${levels.map(([value, label]) => `<button type="button" class="atlas-level-filter" data-atlas-action="level" data-level="${value}" aria-pressed="${state().level === value}">${label}</button>`).join('')}</div><button type="button" class="atlas-reset" data-atlas-action="reset">Limpiar filtros ↺</button></div>
      <p id="atlas-results" class="atlas-results" role="status" aria-live="polite"></p>
      <div class="atlas-layout"><details class="atlas-index" open><summary><span>Índice de conceptos</span><span id="atlas-index-count"></span></summary><nav id="atlas-topics" aria-label="Conceptos de ${langName()}"></nav><p class="atlas-index-note">Elegí por curiosidad o avanzá en orden. Podés cambiar el lenguaje arriba.</p></details><div id="atlas-detail" class="atlas-detail"></div></div>
      <p class="atlas-session-note">Las respuestas de este atlas se mantienen durante esta visita. Al recargar la página se reinician; tu progreso del laboratorio se guarda por separado.</p>
    </section>`;
    renderPanels();
  }
  function renderPanels({focus = false} = {}) {
    if (!host) return;
    const filtered = matching();
    if (!filtered.some(entry => entry.id === state().selected)) state().selected = filtered[0]?.id || null;
    const topicList = find('#atlas-topics');
    const indexCount = find('#atlas-index-count');
    const results = find('#atlas-results');
    if (results) results.textContent = filtered.length + ' de ' + entries.length + ' conceptos · ' + langName();
    if (indexCount) indexCount.textContent = String(filtered.length).padStart(2, '0');
    if (topicList) topicList.innerHTML = filtered.length ? filtered.map(entry => {
      const index = entries.findIndex(candidate => candidate.id === entry.id) + 1;
      return `<button type="button" class="atlas-topic" data-atlas-action="topic" data-topic="${escape(entry.id)}" ${entry.id === state().selected ? 'aria-current="true"' : ''} aria-controls="atlas-detail"><span class="atlas-topic-number">${String(index).padStart(2, '0')}</span><span><strong>${escape(entry.title)}</strong><small>${escape(levelNames[entry.level] || entry.level)}</small></span><span class="atlas-topic-arrow" aria-hidden="true">↗</span></button>`;
    }).join('') : '<p class="atlas-index-empty">No hay coincidencias con estos filtros.</p>';
    const detail = find('#atlas-detail');
    if (detail) detail.innerHTML = filtered.length ? detailHTML(selected(), filtered) : `<section class="atlas-empty"><span aria-hidden="true">∅</span><h2>No encontré esa combinación.</h2><p>Probá otra palabra o ampliá el nivel y el área para volver a explorar.</p><button type="button" class="button secondary" data-atlas-action="reset">Mostrar todos los conceptos</button></section>`;
    if (focus) {
      const heading = find('#atlas-concept-title');
      heading?.focus({preventScroll: true});
      heading?.scrollIntoView({block: 'nearest', behavior: 'auto'});
    }
  }
  function quizHTML(entry) {
    const answer = state().answers[entry.id];
    const answered = Number.isInteger(answer);
    const correct = answered && answer === entry.quiz.answer;
    return `<section class="atlas-quiz" aria-labelledby="atlas-quiz-title"><div class="atlas-block-kicker"><span aria-hidden="true">?</span>ANTES DE SEGUIR</div><h3 id="atlas-quiz-title">${escape(entry.quiz.question)}</h3><div class="atlas-quiz-options" role="group" aria-label="Elegí tu predicción">${entry.quiz.options.map((option, index) => `<button type="button" class="atlas-answer${answered && answer === index ? correct ? ' is-correct' : ' is-selected' : ''}" data-atlas-action="answer" data-answer="${index}" aria-pressed="${answered && answer === index}"><span class="atlas-answer-letter" aria-hidden="true">${String.fromCharCode(65 + index)}</span><span>${escape(option)}</span></button>`).join('')}</div><div id="atlas-feedback" class="atlas-feedback${answered ? correct ? ' is-correct' : ' is-explained' : ''}" role="status" aria-live="polite">${answered ? `<strong>${correct ? 'Sí: esa es la idea.' : 'Esta diferencia importa.'}</strong><p>${!correct ? `La opción correcta es «${escape(entry.quiz.options[entry.quiz.answer])}». ` : ''}${escape(entry.quiz.explanation)}</p><button type="button" class="atlas-reset" data-atlas-action="retry">Volver a pensar la pregunta ↺</button>` : '<p>Elegí una respuesta para ver la explicación. Equivocarte también sirve para encontrar qué idea revisar.</p>'}</div></section>`;
  }
  function additionalSourcesHTML(entry) {
    if(!Array.isArray(entry.furtherSources)||!entry.furtherSources.length)return '';
    return `<div class="atlas-more-sources"><span class="atlas-block-kicker">PARA ESPECIALIZARTE</span>${entry.furtherSources.map(source=>`<a class="atlas-source" href="${escape(safeLink(source.url))}" target="_blank" rel="noopener noreferrer">${escape(source.title)} ↗</a>`).join('')}</div>`;
  }
  function detailHTML(entry, filtered) {
    if (!entry) return '';
    const index = filtered.findIndex(candidate => candidate.id === entry.id);
    const labLink = '?ejercicio=' + encodeURIComponent(entry.labId) + '&paso=learn#laboratorio';
    return `<article class="atlas-concept" aria-labelledby="atlas-concept-title"><header class="atlas-concept-heading"><div class="atlas-concept-meta"><span>${levelMeter(entry.level)}${escape(levelNames[entry.level] || entry.level)}</span><span>${escape(entry.category)}</span></div><h2 id="atlas-concept-title" tabindex="-1">${escape(entry.title)}</h2><p class="atlas-summary">${escape(entry.summary)}</p></header>
      <section class="atlas-why" aria-labelledby="atlas-why-title"><span class="atlas-why-icon" aria-hidden="true">∴</span><div><h3 id="atlas-why-title">Por qué existe esta idea</h3>${paragraphs(entry.why)}</div></section>
      <section class="atlas-example" aria-labelledby="atlas-example-title"><div class="atlas-code-title"><h3 id="atlas-example-title">Leé el código con intención.</h3><span>${langName()} · EJEMPLO ILUSTRATIVO</span></div><pre class="atlas-code" tabindex="0" aria-label="Ejemplo ilustrativo de ${langName()}, desplazable"><code>${escape(entry.code)}</code></pre><p class="atlas-code-caption">Este fragmento explica un concepto; puede necesitar contexto para compilar. Para editar y ejecutar, abrí el ejercicio relacionado.</p><div class="atlas-explanation"><span class="atlas-block-kicker">LO QUE ESTÁ PASANDO</span>${paragraphs(entry.explanation)}</div></section>
      <div class="atlas-perspectives"><section class="atlas-perspective"><button type="button" class="atlas-disclosure" data-atlas-action="compare" aria-expanded="${Boolean(state().compared[entry.id])}" aria-controls="atlas-comparison"><span><span class="atlas-disclosure-icon" aria-hidden="true">⇄</span>Ver la comparación</span><span aria-hidden="true">${state().compared[entry.id] ? '−' : '+'}</span></button><div id="atlas-comparison" class="atlas-disclosure-body" ${state().compared[entry.id] ? '' : 'hidden'}>${paragraphs(entry.comparison)}</div></section><section class="atlas-perspective"><button type="button" class="atlas-disclosure" data-atlas-action="pitfall" aria-expanded="${Boolean(state().pitfalls[entry.id])}" aria-controls="atlas-pitfall"><span><span class="atlas-disclosure-icon" aria-hidden="true">!</span>Mostrar la trampa habitual</span><span aria-hidden="true">${state().pitfalls[entry.id] ? '−' : '+'}</span></button><div id="atlas-pitfall" class="atlas-disclosure-body atlas-pitfall" ${state().pitfalls[entry.id] ? '' : 'hidden'}>${paragraphs(entry.pitfall)}</div></section></div>
      <div id="atlas-quiz-container">${quizHTML(entry)}</div>
      <footer class="atlas-concept-footer"><div class="atlas-practice-callout"><div><span class="atlas-block-kicker">DE LA IDEA A LAS MANOS</span><h3>Hacelo funcionar.</h3><p>Practicá este concepto con código editable, compilador real y revisión explicada.</p></div><a class="button" href="${escape(labLink)}">Ir al laboratorio <span aria-hidden="true">↗</span></a></div><a class="atlas-source" href="${escape(safeLink(entry.source.url))}" target="_blank" rel="noopener noreferrer">${escape(entry.source.title)} <span aria-hidden="true">↗</span><span class="atlas-sr-only"> (abre en una pestaña nueva)</span></a>${additionalSourcesHTML(entry)}<nav class="atlas-next" aria-label="Navegar conceptos filtrados"><button type="button" data-atlas-action="previous" ${index === 0 ? 'disabled' : ''}><span aria-hidden="true">←</span> Anterior</button><span>${index + 1} / ${filtered.length}</span><button type="button" data-atlas-action="next" ${index === filtered.length - 1 ? 'disabled' : ''}>Siguiente idea <span aria-hidden="true">→</span></button></nav></footer>
    </article>`;
  }
  function updateQuiz(focusIndex) {
    const entry = selected();
    const container = find('#atlas-quiz-container');
    if (!entry || !container) return;
    const answer = state().answers[entry.id];
    const answered = Number.isInteger(answer);
    const correct = answered && answer === entry.quiz.answer;
    container.querySelectorAll('[data-atlas-action="answer"]').forEach(button => {
      const picked = answered && Number(button.dataset.answer) === answer;
      button.setAttribute('aria-pressed', String(picked));
      button.classList.toggle('is-correct', picked && correct);
      button.classList.toggle('is-selected', picked && !correct);
    });
    const feedback = find('#atlas-feedback');
    feedback.className = 'atlas-feedback' + (answered ? correct ? ' is-correct' : ' is-explained' : '');
    feedback.innerHTML = answered
      ? `<strong>${correct ? 'Sí: esa es la idea.' : 'Esta diferencia importa.'}</strong><p>${!correct ? `La opción correcta es «${escape(entry.quiz.options[entry.quiz.answer])}». ` : ''}${escape(entry.quiz.explanation)}</p><button type="button" class="atlas-reset" data-atlas-action="retry">Volver a pensar la pregunta ↺</button>`
      : '<p>Elegí una respuesta para ver la explicación. Equivocarte también sirve para encontrar qué idea revisar.</p>';
    if (Number.isInteger(focusIndex)) find(`[data-atlas-action="answer"][data-answer="${focusIndex}"]`)?.focus({preventScroll: true});
  }
  function onClick(event) {
    const button = event.target.closest('[data-atlas-action]');
    if (!button || !host?.contains(button) || button.disabled) return;
    const action = button.dataset.atlasAction;
    const current = state();
    if (action === 'topic') {current.selected = button.dataset.topic; renderPanels({focus: true});}
    if (action === 'level') {
      current.level = button.dataset.level;
      host.querySelectorAll('[data-atlas-action="level"]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.level === current.level)));
      renderPanels();
    }
    if (action === 'reset') {
      current.query = ''; current.level = 'all'; current.category = 'all';
      render(); find('#atlas-search')?.focus();
    }
    if (action === 'next' || action === 'previous') {
      const filtered = matching();
      const index = filtered.findIndex(entry => entry.id === current.selected);
      const target = filtered[index + (action === 'next' ? 1 : -1)];
      if (target) {current.selected = target.id; renderPanels({focus: true});}
    }
    if (action === 'answer') {
      const entry = selected();
      const answer = Number(button.dataset.answer);
      if (!entry || !Number.isInteger(answer) || answer < 0 || answer >= entry.quiz.options.length) return;
      current.answers[entry.id] = answer;
      updateQuiz(answer);
    }
    if (action === 'retry') {delete current.answers[current.selected]; updateQuiz(0);}
    if (action === 'compare' || action === 'pitfall') {
      const isCompare = action === 'compare';
      const record = isCompare ? current.compared : current.pitfalls;
      record[current.selected] = !record[current.selected];
      const panel = find(isCompare ? '#atlas-comparison' : '#atlas-pitfall');
      if (panel) panel.hidden = !record[current.selected];
      button.setAttribute('aria-expanded', String(record[current.selected]));
      button.lastElementChild.textContent = record[current.selected] ? '−' : '+';
    }
  }
  function onInput(event) {
    if (event.target.id !== 'atlas-search') return;
    state().query = event.target.value;
    renderPanels();
  }
  function onChange(event) {
    if (event.target.id !== 'atlas-category') return;
    state().category = event.target.value;
    renderPanels();
  }
  function mount(element, requestedLanguage = 'rust') {
    unmount();
    host = element;
    language = requestedLanguage === 'go' ? 'go' : 'rust';
    entries = window.TALLER_ATLAS?.[language] || [];
    if (!host) return;
    host.addEventListener('click', onClick);
    host.addEventListener('input', onInput);
    host.addEventListener('change', onChange);
    render();
  }
  function unmount() {
    if (host) {
      host.removeEventListener('click', onClick);
      host.removeEventListener('input', onInput);
      host.removeEventListener('change', onChange);
    }
    host = null;
  }
  window.TallerAtlas = Object.freeze({mount, unmount});
})();
