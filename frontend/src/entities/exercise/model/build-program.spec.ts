import { describe, expect, it } from 'vitest';
import { buildProgram, type BuildableExercise } from './build-program';

const rustItem: BuildableExercise = {
  language: 'rust',
  tests: [{ id: 'sum', expression: 'add(1, 2) == 3' }],
};

const goItem: BuildableExercise = {
  language: 'go',
  tests: [{ id: 'sum', expression: 'Add(1, 2) == 3' }],
  imports: ['strings'],
};

describe('buildProgram', () => {
  it('wraps Rust code with a panic-safe check per test', () => {
    const program = buildProgram(rustItem, 'fn add(a: i32, b: i32) -> i32 { a + b }');

    expect(program).toBe(
      'fn add(a: i32, b: i32) -> i32 { a + b }\n\n' +
        'fn main() {\n' +
        '    std::panic::set_hook(Box::new(|_| {}));\n' +
        '    let passed = std::panic::catch_unwind(|| { add(1, 2) == 3 }).unwrap_or(false);\n' +
        '    println!("__TALLER_TEST__sum:{}", if passed { "PASS" } else { "FAIL" });\n' +
        '}\n',
    );
  });

  it('appends the custom test to a Rust program with the id custom', () => {
    const program = buildProgram(rustItem, 'fn add() {}', '  add(2, 2) == 4  ');

    expect(program).toBe(
      'fn add() {}\n\n' +
        'fn main() {\n' +
        '    std::panic::set_hook(Box::new(|_| {}));\n' +
        '    let passed = std::panic::catch_unwind(|| { add(1, 2) == 3 }).unwrap_or(false);\n' +
        '    println!("__TALLER_TEST__sum:{}", if passed { "PASS" } else { "FAIL" });\n' +
        '    let passed = std::panic::catch_unwind(|| { add(2, 2) == 4 }).unwrap_or(false);\n' +
        '    println!("__TALLER_TEST__custom:{}", if passed { "PASS" } else { "FAIL" });\n' +
        '}\n',
    );
  });

  it('ignores a blank custom test', () => {
    expect(buildProgram(rustItem, 'x', '   ')).toBe(buildProgram(rustItem, 'x'));
  });

  it('wraps Go code with fmt first, the declared imports and a recovering check per test', () => {
    const program = buildProgram(goItem, 'func Add(a, b int) int { return a + b }');

    expect(program).toBe(
      'package main\n\nimport (\n    "fmt"\n    "strings"\n)\n\n' +
        'func Add(a, b int) int { return a + b }\n\n' +
        'func __tallerCheck(id string, test func() bool) {\n' +
        '    passed := false\n' +
        '    func() {\n' +
        '        defer func() { _ = recover() }()\n' +
        '        passed = test()\n' +
        '    }()\n' +
        '    if passed { fmt.Println("__TALLER_TEST__" + id + ":PASS") } else { fmt.Println("__TALLER_TEST__" + id + ":FAIL") }\n' +
        '}\n\n' +
        'func main() {\n' +
        '    __tallerCheck("sum", func() bool { return Add(1, 2) == 3 })\n' +
        '}\n',
    );
  });

  it('does not repeat fmt when the Go exercise already imports it and adds the custom test', () => {
    const item: BuildableExercise = { ...goItem, imports: ['fmt'] };

    const program = buildProgram(item, 'x', 'Add(2, 2) == 4');

    expect(program).toContain('import (\n    "fmt"\n)\n');
    expect(program).toContain(
      '    __tallerCheck("custom", func() bool { return Add(2, 2) == 4 })\n',
    );
  });

  it('does not change the exercise it receives', () => {
    buildProgram(rustItem, 'x', 'y');

    expect(rustItem.tests).toHaveLength(1);
  });
});
