# ADR 0003 — Integridad del progreso guardado

- Estado: aceptada
- Fecha: 2026-10-03; revisada tras la fase P9 (revisión adversarial)

## Contexto

El progreso vive en cuatro claves de `localStorage`:

- `taller-learning-v1` (recorrido);
- `taller-laboratorio-v1`;
- `taller-campaign-v1`;
- `taller-systems-v1`.

La caracterización previa al refactor confirmó pérdidas de datos que contradicen
`docs/architecture.md` («preservá los logros ya obtenidos», «no ocultes fallos con
defaults que simulen éxito»):

- El recorrido saneaba al cargar y reescribía la clave.
- Una copia ilegible se trataba como vacía y la primera escritura la pisaba.
- En Sistemas bastaba un registro inválido para perder todo el progreso.
- La importación del laboratorio degradaba marcas de ayuda.
- La regla de evidencia estaba copiada en tres módulos.
- Un fallo de sincronización reescribía un resultado aprobado como error de transporte.

La primera versión de este ADR corrigió esos defectos. Una revisión adversarial
posterior encontró que la capa todavía no era segura para sincronizar:

- **A1:** se escribía al cargar, porque los renders sincronizaban campaña y Sistemas y
  persistían. Además el único respaldo nunca se reemplazaba, así que ante un segundo
  problema se perdía el texto original, y el aviso afirmaba una copia que no existía.
- **M1 y M2:** los IDs desconocidos y las pérdidas dentro de un registro se descartaban
  sin aviso.
- **M3:** la regla «un texto vacío no pisa» estaba escrita tres veces con semánticas
  distintas.
- **M4:** el laboratorio aprobaba con otra regla que la de evidencia. Con marcadores
  repetidos ganaba el último.
- **M5:** dos pestañas se pisaban los logros.
- **B1–B4:** casos menores de `solvedAt: 0`, evidencia vacía, importación parcialmente
  aplicada y sincronizaciones encadenadas.

La fase P9 corrigió todo eso. Este texto describe el comportamiento resultante.

## Decisión

1. **Un almacén por clave.** `openVersionedStore` (`src/shared/lib/versioned-storage.ts`)
   recibe `blank`, `parse` y `merge`. Cada carga devuelve:
   - `status`: `empty`, `loaded`, `unreadable` o `unavailable`;
   - `dropped`: registros descartados;
   - `lossy`: si la normalización quitó o cambió datos, comparando con
     `isLosslessNormalization`;
   - `backupKey`: la ranura que guarda la copia;
   - `writable`: si el almacén puede escribir.
2. **Nunca se escribe al cargar ni al renderizar.**
   - `load()` no toca la clave principal.
   - Los renders derivan la evidencia del laboratorio sólo en memoria (`refresh` /
     `refreshFromLab`).
   - Se persiste por acciones del alumno: ejecutar, predecir, responder un checkpoint,
     observar, editar notas o etapas, importar y reiniciar.
   - Si al cargar no se pudo leer el almacenamiento, ese almacén no escribe en toda la
     sesión, porque no sabe qué pisaría.
3. **Respaldo antes de perder datos.**
   - Hay cinco ranuras por clave: `<clave>:respaldo` y de `<clave>:respaldo-2` a
     `<clave>:respaldo-5`. Nunca se reemplazan, y el mismo texto reutiliza su ranura.
   - Una carga ilegible, con registros descartados o con cualquier pérdida de
     normalización asegura una copia del texto original.
   - Si no hay copia posible (ranuras llenas o cuota agotada), el almacén queda no
     escribible por esa sesión y el aviso lo dice. Nunca afirma una copia que no existe.
   - Los avisos de los cuatro almacenes se muestran juntos.
   - Método lista los respaldos y permite descargarlos. «Borrar todo» los elimina e
     informa si no pudo.
4. **Carga tolerante, importación estricta.**
   - La carga descarta sólo lo que no reconoce: lo respalda y avisa.
   - Un registro conocido pero inválido rechaza la importación entera.
   - Los IDs o datos desconocidos se omiten, y el aviso de la importación nombra las
     secciones afectadas.
5. **Fusión monótona al importar.**
   - Sellos, checkpoints aprobados, objetivos, etapas y marcas de ayuda se combinan con
     OR o unión.
   - `solvedAt` toma el valor positivo más antiguo.
   - Un resultado local que prueba el ejercicio contra sus pruebas esperadas no se
     reemplaza por uno que no lo prueba.
   - Un texto importado en blanco no pisa el local. La regla vive en `isBlankText` y la
     usan el laboratorio, Sistemas y el recorrido.
6. **Importación en dos fases.**
   - Primero, cada almacén arma un plan puro (`planImport`) sin tocar estado ni
     almacenamiento, y una sección inválida aborta antes de aplicar nada.
   - Después se aplican los planes (`applyImport`) y se sincronizan los sellos derivados.
7. **Una sola regla de evidencia.** `hasPassingEvidence` (`src/entities/exercise`) decide
   también si un ejercicio queda resuelto. Exige:
   - éxito sin error de transporte;
   - código no vacío;
   - exactamente un marcador aprobado por cada prueba esperada. Un marcador repetido
     cuenta como fallo, y sin pruebas esperadas no hay evidencia.

   La evidencia es autodeclarada por la salida del programa. Un servidor no debe tratarla
   como prueba.
8. **La sincronización no altera la ejecución.** `syncAfterRun` intenta Sistemas y campaña
   por separado, informa un fallo una sola vez y nunca reinterpreta el resultado. La usan
   la ejecución y la predicción.
9. **Varias pestañas.**
   - Una escritura fusiona sólo si otra pestaña cambió la clave desde la última lectura o
     escritura. Usa la regla de importación: el local gana en los campos editables y los
     logros de la otra pestaña sobreviven.
   - En una sola pestaña nunca se fusiona: desmarcar o vaciar se conserva.
   - El laboratorio fusiona en el lugar, porque sus handlers mantienen referencias a
     registros a través de `save()`.

## Pendiente para sincronizar (ADR 0004)

Estos límites son conocidos y aceptados para el uso local. El formato v2 y el backend los
resuelven:

- **Sin fecha por campo.** Con dos pestañas, el local gana siempre en los campos
  editables, y algo desmarcado en la otra pestaña puede volver. Falta «gana la última
  escritura» con fecha por campo, y lápidas.
- **Lo desconocido no se conserva en el estado.** Se respalda y se avisa.
- **Evidencia sin campo propio.** Una ejecución con fallo de transporte reemplaza el
  último resultado guardado; los sellos ya ganados se conservan. Falta `proof` separado
  de `result`.
- **Etapas de Sistemas por posición.** Agregar o reordenar una etapa cambia su
  significado. Faltan IDs estables.
- **«Borrar todo» no se propaga.** Una pestaña abierta puede volver a escribir lo que se
  borró en otra. Falta una época de documento.
- **XP de otra pestaña.** Con dos pestañas, el aviso de XP puede incluir lo que ganó la
  otra.

## Consecuencias

- Las claves y el formato v1 se conservan: no hace falta migración. La compatibilidad con
  master queda fijada por fixtures congeladas, `qa/fixtures/progress-*.json`:
  - el arranque con progreso de master no escribe, no respalda ni avisa;
  - lo que escribe esta versión vuelve a cargar sin pérdida;
  - las exportaciones de master y de d0e1b49 se importan sin omisiones.
- Las pruebas que cambiaron de expectativa lo hicieron a propósito y lo documentan sus
  commits. Por ejemplo, un `selected` inválido y la normalización de objetivos o etapas
  desconocidas ahora cuentan como pérdida.
- La afirmación «la carga no escribe» del commit 2c7d416 era falsa para campaña. La
  corrigió la parte 2 de P9.
