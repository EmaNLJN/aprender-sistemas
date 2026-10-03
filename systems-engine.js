(() => {
  'use strict';
  const KEY = 'taller-systems-v1',
    languages = ['rust', 'go'];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const object = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const blank = () => ({ version: 1, records: {} });
  let state = blank(),
    catalog = new Map(),
    exercises = new Map(),
    storageAvailable = true;
  const key = (id, language) => `${language}:${id}`;
  const empty = () => ({
    observed: [],
    code: false,
    predicted: false,
    answer: null,
    steps: [],
    note: '',
  });
  function requireWorkshop(id, language) {
    if (!catalog.has(id) || !languages.includes(language))
      throw new Error('Taller o lenguaje desconocido.');
    return catalog.get(id);
  }
  function record(id, language) {
    requireWorkshop(id, language);
    return state.records[key(id, language)] || (state.records[key(id, language)] = empty());
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
    }
  }
  function validateImport(raw) {
    if (raw === undefined || raw === null) return undefined;
    if (!object(raw) || raw.version !== 1 || !object(raw.records))
      throw new Error('La copia de Sistemas no es compatible.');
    const clean = blank();
    for (const [name, value] of Object.entries(raw.records)) {
      const [language, id, ...rest] = name.split(':');
      if (rest.length || !languages.includes(language) || !catalog.has(id)) continue;
      const workshop = catalog.get(id),
        allowed = new Set(workshop.objectives.map((goal) => goal.id));
      if (!object(value) || !Array.isArray(value.observed) || !Array.isArray(value.steps))
        throw new Error('Progreso de taller inválido: ' + id);
      for (const field of ['code', 'predicted'])
        if (typeof value[field] !== 'boolean') throw new Error('Sello de taller inválido: ' + id);
      if (
        value.answer !== null &&
        (!Number.isInteger(value.answer) ||
          value.answer < 0 ||
          value.answer >= workshop.prediction.options.length)
      )
        throw new Error('Respuesta de taller inválida: ' + id);
      if (typeof value.note !== 'string') throw new Error('Nota de taller inválida: ' + id);
      clean.records[name] = {
        observed: [...new Set(value.observed.filter((goal) => allowed.has(goal)))],
        code: value.code,
        predicted: value.predicted,
        answer: value.answer,
        steps: [
          ...new Set(
            value.steps.filter(
              (index) => Number.isInteger(index) && index >= 0 && index < workshop.steps.length,
            ),
          ),
        ],
        note: value.note.slice(0, 10000),
      };
    }
    return clean;
  }
  function requireCore(workshop, language, allExercises) {
    const exercise = allExercises.get(workshop.code?.[language]);
    if (exercise?.language !== language) {
      throw new Error('Falta el núcleo programable de ' + workshop.id + ' en ' + language + '.');
    }
    const tests = exercise.tests;
    if (!Array.isArray(tests) || !tests.length) {
      throw new Error('Pruebas de núcleo inválidas: ' + exercise.id);
    }
    const validIds = tests.every(
      (test) => object(test) && typeof test.id === 'string' && test.id.trim(),
    );
    if (!validIds || new Set(tests.map((test) => test.id)).size !== tests.length) {
      throw new Error('IDs de pruebas de núcleo inválidos: ' + exercise.id);
    }
  }
  function init(config) {
    if (!Array.isArray(config?.workshops) || !config.models || !Array.isArray(config.exercises))
      throw new Error('Falta el catálogo de Sistemas.');
    const next = new Map(),
      allExercises = new Map(config.exercises.map((exercise) => [exercise.id, exercise]));
    for (const workshop of config.workshops) {
      if (
        !/^[a-z][a-z0-9-]*$/.test(workshop.id) ||
        next.has(workshop.id) ||
        !config.models[workshop.model]
      )
        throw new Error('Taller duplicado o modelo desconocido.');
      if (
        !Array.isArray(workshop.objectives) ||
        workshop.objectives.length !== 3 ||
        new Set(workshop.objectives.map((goal) => goal.id)).size !== 3
      )
        throw new Error('Se necesitan tres objetivos distintos por taller.');
      if (!Array.isArray(workshop.steps) || workshop.steps.length !== 4)
        throw new Error('Se necesitan cuatro etapas de proyecto.');
      const q = workshop.prediction;
      if (
        !q ||
        !Array.isArray(q.options) ||
        q.options.length < 2 ||
        !Number.isInteger(q.answer) ||
        q.answer < 0 ||
        q.answer >= q.options.length
      )
        throw new Error('Checkpoint de taller inválido.');
      for (const language of languages) requireCore(workshop, language, allExercises);
      next.set(workshop.id, clone(workshop));
    }
    catalog = next;
    exercises = allExercises;
    state = blank();
    storageAvailable = true;
    let loadWarning = '';
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const parsed = validateImport(JSON.parse(saved));
        if (!parsed) throw new Error('Estado vacío.');
        state = parsed;
      }
    } catch {
      loadWarning =
        'No se pudo leer el avance de Sistemas. Podés conservar esta sesión exportando tu progreso.';
      storageAvailable = false;
    }
    return { storageAvailable, loadWarning };
  }
  function get(id, language) {
    const workshop = requireWorkshop(id, language),
      r = record(id, language);
    const modelDone = workshop.objectives.every((goal) => r.observed.includes(goal.id));
    return {
      ...clone(workshop),
      progress: clone(r),
      modelDone,
      completed: modelDone && r.code && r.predicted,
      seals: Number(modelDone) + Number(r.code) + Number(r.predicted),
      storageAvailable,
    };
  }
  function observe(id, language, goals) {
    const workshop = requireWorkshop(id, language),
      r = record(id, language),
      allowed = new Set(workshop.objectives.map((goal) => goal.id));
    const added = (Array.isArray(goals) ? goals : []).filter(
      (goal) => allowed.has(goal) && !r.observed.includes(goal),
    );
    if (added.length) {
      r.observed = [...new Set([...r.observed, ...added])];
      persist();
    }
    return { added: [...new Set(added)], ...get(id, language) };
  }
  function answer(id, language, index) {
    const workshop = requireWorkshop(id, language);
    if (!Number.isInteger(index) || index < 0 || index >= workshop.prediction.options.length)
      throw new Error('Respuesta fuera de rango.');
    const r = record(id, language);
    r.answer = index;
    r.predicted = r.predicted || index === workshop.prediction.answer;
    persist();
    return {
      correct: index === workshop.prediction.answer,
      explanation: workshop.prediction.explanation,
      ...get(id, language),
    };
  }
  function syncLab(lab) {
    let changed = false;
    for (const workshop of catalog.values())
      for (const language of languages) {
        const exercise = exercises.get(workshop.code[language]),
          result = lab?.records?.[exercise.id]?.result;
        if (
          !result ||
          result.success !== true ||
          result.transportError === true ||
          typeof result.code !== 'string' ||
          !result.code.trim() ||
          !Array.isArray(result.tests)
        )
          continue;
        const passed = exercise.tests.every((test) => {
          const matches = result.tests.filter((row) => row?.id === test.id);
          return matches.length === 1 && matches[0].passed === true;
        });
        if (passed) {
          const r = record(workshop.id, language);
          if (!r.code) {
            r.code = true;
            changed = true;
          }
        }
      }
    if (changed) persist();
    return { changed, storageAvailable };
  }
  function importState(raw) {
    const incoming = validateImport(raw);
    if (!incoming) return;
    for (const [name, next] of Object.entries(incoming.records)) {
      const prev = state.records[name] || empty();
      state.records[name] = {
        observed: [...new Set([...prev.observed, ...next.observed])],
        code: prev.code || next.code,
        predicted: prev.predicted || next.predicted,
        answer: next.answer ?? prev.answer,
        steps: [...new Set([...prev.steps, ...next.steps])],
        note: next.note || prev.note,
      };
    }
    persist();
  }
  window.TallerSystemsEngine = {
    init,
    get,
    observe,
    answer,
    syncLab,
    validateImport,
    importState,
    list: (language) => [...catalog.keys()].map((id) => get(id, language)),
    setStep(id, language, index, checked) {
      const w = requireWorkshop(id, language);
      if (!Number.isInteger(index) || index < 0 || index >= w.steps.length)
        throw new Error('Etapa desconocida.');
      const r = record(id, language);
      r.steps = checked
        ? [...new Set([...r.steps, index])]
        : r.steps.filter((step) => step !== index);
      persist();
    },
    setNote(id, language, note) {
      record(id, language).note = String(note).slice(0, 10000);
      persist();
      return { storageAvailable };
    },
    exportState: () => clone(state),
    reset() {
      state = blank();
      persist();
    },
  };
})();
