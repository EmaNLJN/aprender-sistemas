import type { GuideLanguage } from './types';

export type MilestoneHint = string | Readonly<Record<GuideLanguage, string>>;

export interface ProjectMilestone {
  suffix: string;
  title: string;
  task: string;
  doneWhen: string;
  hint: MilestoneHint;
}

export const MILESTONE_LANGUAGES: readonly GuideLanguage[] = ['rust', 'go'];

export const PROJECT_MILESTONES: readonly ProjectMilestone[] = [
  {
    suffix: 'memory',
    title: 'Un lugar para guardar cosas',
    task: 'Implementá SET, GET y DELETE sobre un almacén en memoria. Empezá llamando funciones desde un test; todavía no necesitás una terminal interactiva.',
    doneWhen:
      'Podés guardar una clave, leerla, reemplazar su valor y borrarla. Un test comprueba qué ocurre si la clave no existe.',
    hint: {
      rust: 'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.',
      go: 'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.',
    },
  },
  {
    suffix: 'commands',
    title: 'Tu programa entiende comandos',
    task: 'Leé comandos desde la entrada estándar. Separá el texto recibido de la operación que ejecuta el almacén y devolvé errores claros.',
    doneWhen:
      'SET nombre Ana y GET nombre funcionan. Un comando desconocido o incompleto muestra un error sin terminar el programa.',
    hint: 'Convertí el texto en una operación antes de cambiar datos. Definí una gramática pequeña: por ejemplo, claves sin espacios y el resto de la línea como valor. Probá líneas vacías y argumentos faltantes.',
  },
  {
    suffix: 'files',
    title: 'Los datos sobreviven al reinicio',
    task: 'Agregá una forma de guardar y cargar el contenido en un archivo. Decidí un formato sencillo y explicá sus límites.',
    doneWhen:
      'Cerrás el proceso, lo volvés a abrir y recuperás los datos. Tenés tests para un archivo vacío y uno inválido.',
    hint: 'Primero separá serializar de escribir un archivo. Probá el recorrido guardar → cargar con datos conocidos. Para este prototipo, documentá qué pasaría si el proceso se corta durante la escritura.',
  },
  {
    suffix: 'measure',
    title: 'Medir antes de optimizar',
    task: 'Elegí una operación, un conjunto fijo de datos y una pregunta. Medí una versión de referencia y después una modificación pequeña.',
    doneWhen:
      'Anotaste entorno, tamaño de entrada y varias mediciones comparables. Podés explicar si la modificación ayudó y por qué.',
    hint: 'Verificá primero que ambas versiones devuelven el mismo resultado. Evitá mezclar el tiempo de imprimir o generar datos con la operación que querés comparar. Una sola medición no alcanza.',
  },
  {
    suffix: 'network',
    title: 'Una conversación por TCP',
    task: 'Cuando la base esté clara, aceptá los mismos comandos desde una conexión TCP. Empezá con un cliente y mensajes delimitados por salto de línea.',
    doneWhen:
      'Un cliente guarda y consulta un valor. El servidor responde bien aunque un comando llegue en varios fragmentos.',
    hint: 'TCP transporta un flujo de bytes: cada lectura no equivale a un comando completo. Acumulá bytes hasta el delimitador. Después podés investigar varios clientes y acceso compartido a los datos.',
  },
];

export function milestoneId(language: GuideLanguage, milestone: ProjectMilestone): string {
  return `${language}-${milestone.suffix}`;
}

export function milestoneHint(milestone: ProjectMilestone, language: GuideLanguage): string {
  return typeof milestone.hint === 'string' ? milestone.hint : milestone.hint[language];
}
