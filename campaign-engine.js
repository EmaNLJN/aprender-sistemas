import { cloneJson } from './src/shared/lib/clone-json';
import { hasPassingEvidence } from './src/entities/exercise';
import { isPlainObject } from './src/shared/lib/is-plain-object';
import { LEVEL_IDS } from './src/shared/config/levels';
import {
  describeLoadResult,
  loadVersionedState,
  removeVersionedState,
  writeVersionedState,
} from './src/shared/lib/versioned-storage';
(() => {
  'use strict';
  const KEY = 'taller-campaign-v1';
  const LANGUAGES = ['rust', 'go'];
  const blank = () => ({ version: 1, seals: {}, checkpoints: {} });
  let state = blank(),
    exercises = new Map(),
    worlds = { rust: [], go: [] },
    worldById = new Map();
  let initialized = false,
    storageAvailable = true;

  function assertReady() {
    if (!initialized) throw new Error('Inicializá la campaña antes de usarla.');
  }
  function seal(id) {
    return state.seals[id] || { code: false, prediction: false, assisted: false };
  }
  function points(id) {
    const s = seal(id);
    return (s.code ? 20 : 0) + (s.prediction ? 10 : 0);
  }
  function totalXP(language) {
    return [...exercises.values()]
      .filter((ex) => !language || ex.language === language)
      .reduce((sum, ex) => sum + points(ex.id), 0);
  }
  function persist() {
    storageAvailable = writeVersionedState(KEY, state);
  }
  function assertBackupShape(raw) {
    if (
      !isPlainObject(raw) ||
      raw.version !== 1 ||
      !isPlainObject(raw.seals) ||
      !isPlainObject(raw.checkpoints)
    ) {
      throw new Error('La copia de campaña no tiene un formato compatible.');
    }
  }
  function sanitizeSeal(id, value) {
    if (!isPlainObject(value)) throw new Error('Sello de ejercicio inválido: ' + id);
    for (const key of ['code', 'prediction', 'assisted']) {
      if (value[key] !== undefined && typeof value[key] !== 'boolean')
        throw new Error('Sello de ejercicio inválido: ' + id);
    }
    return {
      code: value.code === true,
      prediction: value.prediction === true,
      assisted: value.assisted === true,
    };
  }
  function sanitizeCheckpoint(id, value) {
    if (!isPlainObject(value) || typeof value.passed !== 'boolean')
      throw new Error('Checkpoint inválido: ' + id);
    const answer = value.lastAnswer ?? null;
    if (
      answer !== null &&
      (!Number.isInteger(answer) ||
        answer < 0 ||
        answer >= worldById.get(id).checkpoint.options.length)
    ) {
      throw new Error('Respuesta de checkpoint inválida: ' + id);
    }
    return { passed: value.passed, lastAnswer: answer };
  }
  // Importación: estricta y todo-o-nada; un registro inválido rechaza la copia.
  function sanitize(raw) {
    assertBackupShape(raw);
    const clean = blank();
    for (const [id, value] of Object.entries(raw.seals)) {
      if (exercises.has(id)) clean.seals[id] = sanitizeSeal(id, value);
    }
    for (const [id, value] of Object.entries(raw.checkpoints)) {
      if (worldById.has(id)) clean.checkpoints[id] = sanitizeCheckpoint(id, value);
    }
    return clean;
  }
  // Carga: tolerante por registro. Descarta y cuenta los inválidos o de IDs desconocidos.
  function parseSaved(raw) {
    assertBackupShape(raw);
    const clean = blank();
    let dropped = 0;
    const keepValid = (entries, isKnown, normalize, target) => {
      for (const [id, value] of Object.entries(entries)) {
        try {
          if (!isKnown(id)) throw new Error('ID desconocido: ' + id);
          target[id] = normalize(id, value);
        } catch {
          dropped++;
        }
      }
    };
    keepValid(raw.seals, (id) => exercises.has(id), sanitizeSeal, clean.seals);
    keepValid(raw.checkpoints, (id) => worldById.has(id), sanitizeCheckpoint, clean.checkpoints);
    return { state: clean, dropped };
  }
  function loadWarningFor(loaded) {
    return describeLoadResult(loaded, 'de campaña');
  }
  function init(config) {
    if (!isPlainObject(config) || !Array.isArray(config.exercises))
      throw new Error('Faltan los ejercicios de la campaña.');
    const nextExercises = new Map();
    for (const ex of config.exercises) {
      if (
        !isPlainObject(ex) ||
        !/^(rust|go)-\d+$/.test(ex.id) ||
        !LANGUAGES.includes(ex.language) ||
        !ex.id.startsWith(ex.language + '-') ||
        nextExercises.has(ex.id) ||
        !Array.isArray(ex.tests) ||
        !ex.tests.length ||
        !ex.tests.every(
          (test) => isPlainObject(test) && typeof test.id === 'string' && test.id.trim(),
        ) ||
        new Set(ex.tests.map((test) => test.id)).size !== ex.tests.length
      ) {
        throw new Error('Ejercicio de campaña inválido.');
      }
      nextExercises.set(ex.id, ex);
    }
    const supplied = Array.isArray(config.worlds)
      ? Object.fromEntries(
          LANGUAGES.map((lang) => [lang, config.worlds.filter((world) => world.language === lang)]),
        )
      : config.worlds;
    if (!isPlainObject(supplied)) throw new Error('Faltan los mundos de la campaña.');
    const nextWorlds = { rust: [], go: [] },
      nextWorldById = new Map(),
      assigned = new Set();
    for (const language of LANGUAGES) {
      if (!Array.isArray(supplied[language])) throw new Error('Faltan mundos de ' + language + '.');
      for (const world of supplied[language]) {
        if (
          !isPlainObject(world) ||
          typeof world.id !== 'string' ||
          !/^[a-z][a-z0-9-]*$/.test(world.id) ||
          !world.id.startsWith(language + '-') ||
          nextWorldById.has(world.id) ||
          !LEVEL_IDS.includes(world.level) ||
          typeof world.title !== 'string' ||
          !world.title.trim() ||
          !Array.isArray(world.trainingIds) ||
          world.trainingIds.length !== 3 ||
          !Array.isArray(world.challengeIds) ||
          world.challengeIds.length !== 3
        )
          throw new Error('Mundo de campaña inválido.');
        const missionIds = [...world.trainingIds, ...world.challengeIds];
        if (new Set(missionIds).size !== 6 || world.bossId !== world.challengeIds[2])
          throw new Error('Cada mundo necesita seis misiones y un jefe final.');
        for (const id of missionIds) {
          if (nextExercises.get(id)?.language !== language || assigned.has(id))
            throw new Error('Misión desconocida, repetida o de otro lenguaje: ' + id);
          assigned.add(id);
        }
        const q = world.checkpoint;
        if (
          !isPlainObject(q) ||
          typeof q.question !== 'string' ||
          !q.question.trim() ||
          !Array.isArray(q.options) ||
          q.options.length < 2 ||
          !q.options.every((option) => typeof option === 'string' && option.trim()) ||
          !Number.isInteger(q.answer) ||
          q.answer < 0 ||
          q.answer >= q.options.length ||
          typeof q.explanation !== 'string' ||
          !q.explanation.trim()
        )
          throw new Error('Pregunta de checkpoint inválida.');
        const copied = { ...cloneJson(world), language, missionIds };
        nextWorlds[language].push(copied);
        nextWorldById.set(copied.id, copied);
      }
    }
    exercises = nextExercises;
    worlds = nextWorlds;
    worldById = nextWorldById;
    initialized = true;
    const loaded = loadVersionedState(KEY, { blank, parse: parseSaved });
    state = loaded.state;
    storageAvailable = loaded.status !== 'unavailable';
    return { ready: true, storageAvailable, loadWarning: loadWarningFor(loaded) };
  }
  function syncLab(labState) {
    assertReady();
    const before = totalXP();
    let changed = false;
    if (isPlainObject(labState?.records))
      for (const [id, record] of Object.entries(labState.records)) {
        if (!exercises.has(id) || !isPlainObject(record)) continue;
        const prior = seal(id),
          result = record.result,
          expected = exercises.get(id).tests;
        const code = hasPassingEvidence(result, expected);
        const next = {
          code: prior.code || code,
          prediction: prior.prediction || record.predictionCorrect === true,
          assisted: prior.assisted || record.assisted === true || record.solutionSeen === true,
        };
        if (
          next.code !== prior.code ||
          next.prediction !== prior.prediction ||
          next.assisted !== prior.assisted
        ) {
          state.seals[id] = next;
          changed = true;
        }
      }
    if (changed) persist();
    return { changed, xpGained: totalXP() - before, totalXP: totalXP(), storageAvailable };
  }
  function getWorlds(language) {
    assertReady();
    if (!LANGUAGES.includes(language)) throw new Error('Lenguaje de campaña inválido.');
    const derived = [];
    for (const world of worlds[language]) {
      const blockers = derived.filter((previous) => !previous.completed);
      const reasons = blockers.map(
        (previous) =>
          'Completá «' +
          previous.title +
          '»: ' +
          (previous.requirements.length
            ? previous.requirements.join('; ')
            : 'primero deben completarse sus mundos anteriores') +
          '.',
      );
      const unlocked = blockers.length === 0,
        score = world.missionIds.reduce((sum, id) => sum + points(id), 0);
      const boss = seal(world.bossId),
        checkpoint = state.checkpoints[world.id] || { passed: false, lastAnswer: null };
      const missingCode = world.missionIds.filter((id) => id !== world.bossId && !seal(id).code);
      const bossReasons = [
        ...reasons,
        ...missingCode.map(
          (id) => 'Verificá las pruebas de «' + exercises.get(id).title + '» (' + id + ').',
        ),
      ];
      const requirements = missingCode.map(
        (id) => 'Verificá las pruebas de «' + exercises.get(id).title + '» (' + id + ').',
      );
      if (score < 150)
        requirements.push('Sumá ' + (150 - score) + ' puntos para llegar a 150/180.');
      if (!boss.code)
        requirements.push(
          'Verificá las pruebas del jefe «' + exercises.get(world.bossId).title + '».',
        );
      if (!boss.prediction)
        requirements.push(
          'Acertá la predicción del jefe «' + exercises.get(world.bossId).title + '».',
        );
      const checkpointReasons = [...reasons, ...requirements];
      const checkpointReady = checkpointReasons.length === 0;
      const completionReasons = [...checkpointReasons];
      if (!checkpoint.passed) {
        const text = 'Respondé correctamente el checkpoint del mundo.';
        completionReasons.push(text);
        requirements.push(text);
      }
      derived.push({
        ...cloneJson(world),
        score,
        maxScore: 180,
        unlocked,
        completed: checkpointReady && checkpoint.passed,
        checkpointPassed: checkpoint.passed,
        checkpointReady,
        checkpointAnswer: checkpoint.lastAnswer,
        checkpointFeedback: checkpoint.lastAnswer === null ? '' : world.checkpoint.explanation,
        checkpointReasons,
        completionReasons,
        requirements,
        bossReady: bossReasons.length === 0,
        reasons,
        missions: world.missionIds.map((id) => ({
          id,
          ...seal(id),
          points: points(id),
          score: points(id),
          allowed: id === world.bossId ? bossReasons.length === 0 : unlocked,
          reasons: id === world.bossId ? [...bossReasons] : [...reasons],
        })),
      });
    }
    return derived;
  }
  function canAttempt(id, language) {
    assertReady();
    if (!LANGUAGES.includes(language) || exercises.get(id)?.language !== language)
      return {
        allowed: false,
        reasons: ['Ese ejercicio no pertenece al lenguaje elegido.'],
        worldId: null,
        isBoss: false,
      };
    for (const world of getWorlds(language)) {
      const mission = world.missions.find((item) => item.id === id);
      if (mission)
        return {
          allowed: mission.allowed,
          reasons: [...mission.reasons],
          worldId: world.id,
          isBoss: id === world.bossId,
        };
    }
    return { allowed: true, reasons: [], worldId: null, isBoss: false };
  }
  function answerCheckpoint(worldId, index) {
    assertReady();
    const world = worldById.get(worldId);
    if (!world)
      return {
        accepted: false,
        correct: false,
        passed: false,
        explanation: '',
        reasons: ['Ese mundo no existe.'],
      };
    const status = getWorlds(world.language).find((item) => item.id === worldId);
    if (!status.checkpointReady)
      return {
        accepted: false,
        correct: false,
        passed: status.checkpointPassed,
        explanation: '',
        reasons: status.checkpointReasons,
      };
    if (!Number.isInteger(index) || index < 0 || index >= world.checkpoint.options.length)
      return {
        accepted: false,
        correct: false,
        passed: status.checkpointPassed,
        explanation: '',
        reasons: ['Elegí una de las respuestas disponibles.'],
      };
    const correct = index === world.checkpoint.answer,
      passed = status.checkpointPassed || correct;
    state.checkpoints[worldId] = { passed, lastAnswer: index };
    persist();
    return {
      accepted: true,
      correct,
      passed,
      explanation: world.checkpoint.explanation,
      reasons: [],
    };
  }
  function getSummary(language) {
    const list = getWorlds(language),
      completed = list.filter((world) => world.completed);
    return {
      score: list.reduce((sum, world) => sum + world.score, 0),
      maxScore: list.length * 180,
      completedWorlds: completed.length,
      badges: completed.map((world) => world.badge),
      totalXP: totalXP(language),
      storageAvailable,
    };
  }
  function importState(raw) {
    assertReady();
    if (raw === undefined || raw === null) return { changed: false, storageAvailable };
    const incoming = sanitize(raw),
      before = JSON.stringify(state);
    for (const [id, value] of Object.entries(incoming.seals)) {
      const prior = seal(id);
      state.seals[id] = {
        code: prior.code || value.code,
        prediction: prior.prediction || value.prediction,
        assisted: prior.assisted || value.assisted,
      };
    }
    for (const [id, value] of Object.entries(incoming.checkpoints)) {
      const prior = state.checkpoints[id];
      state.checkpoints[id] = {
        passed: Boolean(prior?.passed || value.passed),
        lastAnswer: value.lastAnswer ?? prior?.lastAnswer ?? null,
      };
    }
    const changed = before !== JSON.stringify(state);
    if (changed) persist();
    return { changed, storageAvailable };
  }
  function reset() {
    assertReady();
    state = blank();
    removeVersionedState(KEY);
    return { storageAvailable };
  }
  window.TallerCampaignEngine = {
    init,
    syncLab,
    getWorlds,
    canAttempt,
    answerCheckpoint,
    getSummary,
    exportState: () => {
      assertReady();
      return cloneJson(state);
    },
    validateImport: (raw) => {
      assertReady();
      return raw === undefined || raw === null ? undefined : sanitize(raw);
    },
    importState,
    reset,
  };
})();
