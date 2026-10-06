import type { ExerciseLanguage } from './types';

export interface BuildableExercise {
  language: ExerciseLanguage;
  tests: readonly { id: string; expression: string }[];
  imports?: readonly string[];
}

export function buildProgram(item: BuildableExercise, code: string, customTest = ''): string {
  if (customTest.trim())
    item = { ...item, tests: [...item.tests, { id: 'custom', expression: customTest.trim() }] };
  if (item.language === 'rust')
    return `${code}\n\nfn main() {\n    std::panic::set_hook(Box::new(|_| {}));\n${item.tests.map((test) => `    let passed = std::panic::catch_unwind(|| { ${test.expression} }).unwrap_or(false);\n    println!("__TALLER_TEST__${test.id}:{}", if passed { "PASS" } else { "FAIL" });`).join('\n')}\n}\n`;
  const imports = [...new Set(['fmt', ...(item.imports || [])])];
  return `package main\n\nimport (\n${imports.map((name) => '    ' + JSON.stringify(name)).join('\n')}\n)\n\n${code}\n\nfunc __tallerCheck(id string, test func() bool) {\n    passed := false\n    func() {\n        defer func() { _ = recover() }()\n        passed = test()\n    }()\n    if passed { fmt.Println("__TALLER_TEST__" + id + ":PASS") } else { fmt.Println("__TALLER_TEST__" + id + ":FAIL") }\n}\n\nfunc main() {\n${item.tests.map((test) => `    __tallerCheck(${JSON.stringify(test.id)}, func() bool { return ${test.expression} })`).join('\n')}\n}\n`;
}
