# ADR 0003 — Integridad del progreso guardado

- Estado: aceptada
- Fecha: 2026-10-03

## Contexto

El progreso vive en cuatro claves de `localStorage`: `taller-learning-v1` (recorrido),
`taller-laboratorio-v1`, `taller-campaign-v1` y `taller-systems-v1`. La caracterización
previa al refactor (`qa/app-shell-check.ts`, `qa/lab-bridge-check.ts` y los checks de
cada motor) confirmó pérdidas de datos que contradicen `docs/architecture.md`
(«preservá los logros ya obtenidos», «no ocultes fallos con defaults que simulen éxito»):

- El recorrido sanea al cargar y reescribe la clave: un ID desconocido o un rollback
  borran progreso antes de que el alumno pueda exportarlo.
- Laboratorio, campaña y Sistemas tratan una copia ilegible como vacía o «no
  disponible», y la primera escritura la sobrescribe sin respaldo. En Sistemas basta un
  registro inválido para descartar todo el progreso.
- La importación del laboratorio hace un merge superficial: un respaldo sin
  `assisted`, `solutionSeen` o `predictionCorrect` pisa valores `true` locales.
- La regla de evidencia de código aprobado está copiada en tres módulos.
- Si la sincronización de campaña o Sistemas lanza después de compilar, el laboratorio
  reescribe un resultado aprobado como fallo de transporte.
- La importación global muta las notas locales antes de terminar de aplicar las
  secciones.

## Decisión

1. **Lectura versionada única.** `src/shared/lib/versioned-storage.ts` lee las cuatro
   claves y devuelve un estado explícito: `empty`, `loaded`, `unreadable` (JSON inválido,
   versión o forma desconocidas) o `unavailable` (el navegador bloquea el acceso).
2. **Nunca se escribe al cargar.** La primera escritura ocurre por una acción del
   alumno o por una sincronización que agrega evidencia nueva.
3. **Respaldo antes de perder datos.** Si la copia es ilegible o la carga descarta algún
   registro, el texto original se guarda en `<clave>:respaldo` antes de la primera
   escritura, sin pisar un respaldo existente, y el alumno recibe un aviso. Los avisos
   de los distintos almacenes se acumulan.
4. **Carga tolerante por registro.** Un registro malformado se descarta solo (con el
   respaldo del punto 3); los demás se conservan. La importación de una copia sigue
   siendo estricta y todo-o-nada.
5. **Fusión monótona al importar.** Sellos, checkpoints, objetivos observados y marcas
   de ayuda (`predictionCorrect`, `assisted`, `solutionSeen`) se combinan con OR;
   `solvedAt` conserva el valor más antiguo. Un resultado local con evidencia aprobada no
   se reemplaza por uno importado sin ella. Borradores, reflexiones y notas importados
   reemplazan a los locales sólo si no están vacíos.
6. **Importación atómica.** El estado combinado se construye sin mutar el local; se
   aplica sólo después de validar todas las secciones.
7. **Una sola regla de evidencia.** `src/entities/exercise` define cuándo un resultado
   del compilador prueba un ejercicio: éxito sin error de transporte, código no vacío y
   exactamente una evidencia aprobada por cada prueba esperada. Laboratorio, campaña y
   Sistemas la consumen.
8. **La sincronización no altera la ejecución.** Sincronizar campaña y Sistemas y
   notificar ocurre fuera del bloque que interpreta fallos de transporte; un error ahí
   se informa sin cambiar el resultado del compilador.

## Consecuencias

- Las caracterizaciones marcadas como `DEFECTO CONOCIDO` cambian en el mismo commit que
  cada corrección, siguiendo TDD.
- Un respaldo `<clave>:respaldo` no se borra solo; «Borrar todo» lo elimina junto con
  el progreso.
- Los formatos v1 y las claves actuales se conservan: no hace falta migración.
