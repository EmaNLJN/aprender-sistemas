export type KitLanguage = 'rust' | 'go';

export interface KitTestCase {
  id: string;
  label: string;
  expression: string;
  why: string;
}

export interface KitExercise {
  id: string;
  objective: string;
  instructions: string[];
  why: string;
  starter: string;
  solution: string;
  imports?: string[];
  tests: KitTestCase[];
}

export interface KitWorkshop {
  id: string;
  title: string;
  code: Record<string, string>;
  steps: { title: string; task: string; why: string; done: string }[];
  limits: string;
  bridge: Record<string, string>;
  sources: { title: string; url: string }[];
  progress?: { note?: string };
}

export interface KitDraftRecord {
  draft?: string;
  customTest?: string;
}

export interface KitOptions {
  solution?: boolean;
}

export interface Kit {
  name: string;
  files: Record<string, string>;
}

export function findCoreExercise(
  workshop: KitWorkshop,
  language: string,
  exercises: readonly KitExercise[],
): KitExercise {
  if (!['rust', 'go'].includes(language) || !workshop?.code?.[language])
    throw new Error('Taller desconocido.');
  const exercise = exercises.find((candidate) => candidate.id === workshop.code[language]);
  if (!exercise) throw new Error('No encontré el núcleo del taller.');
  return exercise;
}

function collectTests(
  exercise: KitExercise,
  record: KitDraftRecord,
  options: KitOptions,
): KitTestCase[] {
  const tests = [...exercise.tests];
  if (!options.solution && record.customTest?.trim())
    tests.push({
      id: 'custom',
      label: 'Tu caso adicional',
      expression: record.customTest.trim(),
      why: 'Hipótesis añadida en el editor.',
    });
  return tests;
}

function rustFiles(
  stem: string,
  code: string,
  exercise: KitExercise,
  tests: KitTestCase[],
): Record<string, string> {
  return {
    'Cargo.toml': `[package]\nname = ${JSON.stringify(stem)}\nversion = "0.1.0"\nedition = "2024"\n\n[dependencies]\n`,
    'src/lib.rs': `${code}\n\n// PRUEBAS DEL TALLER — agregá casos sin cambiar el contrato.\n#[cfg(test)]\nmod __taller_checks {\n    use super::*;\n${tests.map((test, index) => `    // ${test.why.replace(/\n/g, ' ')}\n    #[test]\n    fn caso_${index + 1}() {\n        assert!(({ ${test.expression} }), "{}", ${JSON.stringify(test.label)});\n    }`).join('\n')}\n}\n`,
    'reference/solution.rs.txt': exercise.solution + '\n',
    '.gitignore': '/target\n',
  };
}

function goFiles(
  workshop: KitWorkshop,
  code: string,
  exercise: KitExercise,
  tests: KitTestCase[],
): Record<string, string> {
  // The browser harness supplies fmt too. Use it in the test harness so a
  // comment or string mentioning fmt cannot produce an unused Go import.
  const imports = [...new Set(['testing', 'fmt', ...(exercise.imports || [])])];
  return {
    'go.mod': `module taller.local/${workshop.id}\n\ngo 1.23\n`,
    'exercise_test.go': `package workshop\n\nimport (\n${imports.map((name) => '    ' + JSON.stringify(name)).join('\n')}\n)\n\n${code}\n\n// PRUEBAS DEL TALLER — el núcleo y los tests comparten archivo para sus imports.\n${tests.map((test, index) => `func TestCaso${index + 1}(t *testing.T) {\n    // ${test.why.replace(/\n/g, ' ')}\n    if !(${test.expression}) { t.Fatal(fmt.Sprint(${JSON.stringify(test.label)})) }\n}`).join('\n\n')}\n`,
    'reference/solution.go.txt': exercise.solution + '\n',
    '.gitignore': '*.test\ncoverage.out\n',
  };
}

function readme(
  workshop: KitWorkshop,
  language: KitLanguage,
  exercise: KitExercise,
  tests: KitTestCase[],
): string {
  const command = language === 'rust' ? 'cargo test' : 'go test -v ./...';
  return `# ${workshop.title}\n\nKit del taller en ${language === 'rust' ? 'Rust' : 'Go'}. Contiene el núcleo del ejercicio ${exercise.id}, no una implementación completa del sistema descrito.\n\n## Empezar\n\nInstalá ${language === 'rust' ? 'Rust estable con Cargo (edición 2024)' : 'Go 1.23 o posterior'}. Desde esta carpeta ejecutá:\n\n\`\`\`sh\n${command}\n\`\`\`\n\nEl borrador es el que tenías en el navegador al descargar. Si todavía no lo resolviste, es normal que las pruebas fallen. No necesita dependencias externas. La solución de apoyo está como texto en reference/ para que no se compile automáticamente.\n\n## Contrato del núcleo\n\n${exercise.objective}\n\n${exercise.instructions.map((text) => '- ' + text).join('\n')}\n\n## Por qué\n\n${exercise.why}\n\n## Lo que prueban los casos\n\n${tests.map((test) => `- **${test.label}**: ${test.why}`).join('\n')}\n\n## Convertirlo en un proyecto\n\n${workshop.steps.map((step, index) => `### ${index + 1}. ${step.title}\n\n${step.task}\n\nPor qué: ${step.why}\n\nComprobación manual: ${step.done}`).join('\n\n')}\n\n## Límites del modelo\n\n${workshop.limits}\n\n${workshop.bridge[language]}\n\n## Fuentes\n\n${workshop.sources.map((source) => `- [${source.title}](${source.url})`).join('\n')}\n\n## Tu próximo experimento\n\n${workshop.progress?.note || 'Escribí una hipótesis y el test que podría refutarla.'}\n`;
}

export function buildKitFiles(
  workshop: KitWorkshop,
  language: KitLanguage,
  exercise: KitExercise,
  record: KitDraftRecord,
  options: KitOptions = {},
): Kit {
  const code = options.solution ? exercise.solution : (record.draft ?? exercise.starter);
  const tests = collectTests(exercise, record, options);
  const stem = `taller-${workshop.id}-${language}`;
  const languageFiles =
    language === 'rust'
      ? rustFiles(stem, code, exercise, tests)
      : goFiles(workshop, code, exercise, tests);
  return {
    name: stem,
    files: { ...languageFiles, 'README.md': readme(workshop, language, exercise, tests) },
  };
}
