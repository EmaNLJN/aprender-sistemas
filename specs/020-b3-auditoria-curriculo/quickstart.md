# Quickstart: verificar B3 · Auditoría local del currículo

**Fecha**: 2026-10-28 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contratos**: [comando](./contracts/audit-command.md) y [resumen](./contracts/audit-summary.md)

Los comandos que comprueban la entrega, desde la raíz del repositorio. En un worktree, cada comando de Docker lleva su `COMPOSE_PROJECT_NAME=<nombre-del-worktree>` en la misma línea (`backend/api/AGENTS.md`). Las secciones 2 a 6 necesitan Docker y runsc; ninguna descarga nada si las imágenes siguen en el host (research.md).

## 1. Sin Docker

```sh
npm test                      # incluye go-warm-cache-check (operación) y audit-summary-check (web)
npm run lint
npm run format:check
node qa/go-warm-cache-check.ts
node qa/audit-summary-check.ts
```

- **SC-006:** `go-warm-cache-check` imprime `26 paquetes en 49 ejercicios de Go, todos en el caché`. Los dos negativos, a mano y deshechos después:
  1. sacá `_ "net/http"` de `backend/executor/images/go/warm/main.go` y corré `node qa/go-warm-cache-check.ts`: falla con `go-69 importa net/http, que no está en …`;
  2. con la lista intacta, sumá `- net/url` a los `imports` de `content/go/exercises/go-01/exercise.yaml`, corré `npm run curriculum && node qa/go-warm-cache-check.ts`: falla con `go-01 importa net/url, …`.
- **SC-009:** `audit-summary-check` imprime `14 audit-summary scenarios PASS.`; los seis de la spec son los escenarios 1 a 6.
- **El check como en la CI, en local:**

  ```sh
  printf 'Sin resumen.\n' > /tmp/cuerpo.md
  node qa/audit-summary-gate.ts --body-file=/tmp/cuerpo.md --base=HEAD~1 --head=HEAD
  ```

  Si el último commit no toca la superficie: `El PR no toca la superficie auditada …` y código 0. Si la toca: `FALLA Falta el resumen de la auditoría …` y código 1.

## 2. La corrida

Preparación (la primera vez y después de reconstruir las imágenes del sandbox):

```sh
docker image inspect --format '{{.Id}}' taller-sandbox-rust:local taller-sandbox-go:local
docker info --format '{{json .Runtimes}}' | grep -q '"runsc"' && echo runsc ok
docker compose --profile sandbox-images build      # semanal (ADR 0005); no baja nada con las bases en el host
docker compose up --build -d --wait                 # importa el contenido de esta rama
```

La corrida completa y de registro:

```sh
npm run api:audit
```

Lo esperado: el avance (`Auditados 32 de 552 programas…`), una línea por hallazgo, por programa sin veredicto y por aviso, y al final el resumen legible y el bloque `taller-audit-summary`. Archivos en `qa/curriculum-audit/`: `report.json`, `report.txt` y `summary.md`. Código de salida: 0 en verde, 1 con hallazgos, 2 si se negó a arrancar.

- **Primera corrida (T016):** código 1 y `De registro: sí · veredicto: rojo`, con al menos `HALLAZGO · rust-63 (rust, lab, completar) · inicial · compile_error · …` y `HALLAZGO · rust-71 (rust, lab, completar) · inicial · runtime_error · signal 6 · …`.
- **Corrida final (T018, SC-001):** `Programas: 552 · soluciones que aprueban: 274 de 274 · iniciales que fallan como corresponde: 274 de 274 · muestra de la prueba propia: 4 de 4`, `Hallazgos: 0 · avisos: <n> · sin veredicto: 0` y `De registro: sí · veredicto: verde`.

Variantes:

```sh
npm run api:audit -- --exercise=rust-63 --exercise=rust-71    # parcial: itera sobre un arreglo, nunca es de registro
npm run api:audit -- --language=go                             # parcial, con la muestra de Go
npm run api:audit -- --concurrency=2                           # menos lugares (FR-016)
npm run api:audit -- --runtime=runc                            # desarrollo sin gVisor: «De registro: no (runtime runc: …)»
```

Las negativas (FR-013), cada una con código 2 y su mensaje del contrato:

```sh
npm run api:audit -- --concurrency=9                           # api:audit: --concurrency va de 1 a 8 …
npm run api:audit -- --exercise=rust-999                       # rust-999 no es un ejercicio activo de rust y go.
docker compose --profile audit up -d --wait executor-audit && npm run api:audit; docker compose --profile audit rm --stop --force executor-audit
                                                               # api:audit: ya hay otra corrida de auditoría en curso …
```

## 3. Aislamiento y sin escrituras (SC-003)

Antes de la corrida, las filas de B2 y de la cola, y un señuelo con la etiqueta del servicio:

```sh
cuentas() {
  docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" taller -N -e "select (select count(*) from runs), (select count(*) from attempts), (select count(*) from attempt_tests), (select count(*) from attempt_payloads), (select count(*) from progress_heads), (select count(*) from exercise_progress), (select count(*) from jobs); checksum table runs, attempts, attempt_tests, attempt_payloads, progress_heads, exercise_progress, jobs"'
}
cuentas > qa/curriculum-audit/antes.txt
docker run -d --rm --name b3-senuelo --network none \
  --label taller.executor.run=servicio --label taller.executor.created=$(( $(date +%s) + 3600 )) \
  alpine:3.24 sleep 3600
```

(El señuelo dice que se creó dentro de una hora, así el barrido periódico del ejecutor del servicio no lo toca durante la corrida; si la instancia de auditoría barriera la etiqueta equivocada, lo borraría.)

Después de `npm run api:audit`:

```sh
cuentas > qa/curriculum-audit/despues.txt
diff qa/curriculum-audit/antes.txt qa/curriculum-audit/despues.txt && echo "0 filas nuevas o cambiadas"
docker ps -q --filter name=b3-senuelo | grep -q . && echo "el señuelo sigue: la auditoría no barrió al servicio"
docker rm -f b3-senuelo
```

Las redes (con la instancia arriba sola, fuera de una corrida):

```sh
docker compose --profile audit up -d --wait executor-audit
docker compose exec -T worker-runs sh -c 'wget -q -T 3 -O /dev/null http://executor-audit:8080/healthz && echo ALCANZA || echo NO_ALCANZA'      # NO_ALCANZA
docker compose --profile audit run --rm --no-deps -T --entrypoint sh audit -c 'wget -q -T 3 -O /dev/null http://executor:8080/healthz && echo ALCANZA || echo NO_ALCANZA'   # NO_ALCANZA
docker compose --profile audit run --rm --no-deps -T --entrypoint sh audit -c 'test -S /var/run/docker.sock && echo SOCKET || echo SIN_SOCKET'                           # SIN_SOCKET
docker compose --profile audit rm --stop --force executor-audit
```

## 4. Mediciones (SC-005)

El resumen legible trae lo que pide SC-005: la duración (`Inicio … · fin … · <m> min <s> s`), y por lenguaje y fase la mediana, el máximo y el margen mínimo contra el límite, más la cantidad de avisos. El detalle por programa está en `report.json` (`programs[].compile` y `.run`); por ejemplo, los diez más lentos al compilar:

```sh
node -e "const r=JSON.parse(require('node:fs').readFileSync('qa/curriculum-audit/report.json','utf8'));for(const p of r.programs.filter(p=>p.compile).sort((a,b)=>b.compile.ms-a.compile.ms).slice(0,10))console.log(p.exercise,p.role,p.compile.ms,p.compile.ratio)"
```

Se contrasta con la línea de base del host (spec), con la mediana de 1,1 s por ejecución de B2 y con el umbral del aviso (0,5). Las cifras van a la descripción del PR, no a `tasks.md`.

## 5. La compuerta (FR-038)

```sh
npm run audit:gate -- --body-file=qa/curriculum-audit/summary.md --base=origin/master
```

Código 0 con la corrida de registro en verde sobre el último commit. En GitHub, el job `audit-summary` corre al abrir el PR, con cada push y al editar la descripción. Para comprobarlo de punta a punta, en el PR de B3:

1. sin el bloque en la descripción, el job falla con `Falta el resumen de la auditoría …`;
2. con el bloque de `summary.md`, pasa;
3. cambiando a mano `verdict: green` por `verdict: red`, falla; al volver, pasa (`edited`).

## 6. Un hallazgo como bug (FR-029, T017)

```text
/speckit-bug-assess slug=rust-63-inicial-no-compila  <la línea HALLAZGO del informe y su diagnóstico>
/speckit-bug-fix rust-63-inicial-no-compila
/speckit-bug-test rust-63-inicial-no-compila
```

Entre el arreglo y la prueba: `npm run curriculum && npm test`, `docker compose up --build -d --wait` y `npm run api:audit -- --exercise=rust-63 --exercise=rust-71` en verde.

## 7. El cierre (SC-008)

```sh
npm test
npm run lint
npm run format:check
npm run api:test
npm run api:format:check
npm run api:analyse
npm run test:executor
git diff --check
```
