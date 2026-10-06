# Quickstart: validar B2

**Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Escenarios para comprobar que B2 funciona, con sus comandos y lo que tiene que dar. Ninguno se corrió al planificar: la sesión no usó Docker (los resultados que sí se midieron al planificar están en [research.md](./research.md), «Cómo se verificó al planificar»). Los escenarios 1 a 3 no necesitan el stack; el 4 en adelante, sí, y los que descargan o construyen imágenes piden permiso con nombre, origen y tamaño antes (ver «Descargas y permisos» en [plan.md](./plan.md)).

## Antes de empezar

```sh
sh backend/api/scripts/init-env.sh        # suma EXECUTOR_TOKEN y EXECUTOR_DOCKER_GID al .env, sin pisar lo que haya
export COMPOSE_PROJECT_NAME=taller-b2     # cada terminal usa su propio proyecto de Compose
```

Con gVisor registrado en Docker (`runsc`, como en B1) o, sólo en desarrollo, con `EXECUTOR_RUNTIME=runc` en el `.env`.

## 1. La API, sin el stack completo (Pest contra MySQL real)

```sh
npm run api:test -- --testsuite=Unit
npm run api:test -- --testsuite=Feature
npm run api:test -- --testsuite=Content
npm run api:test -- --testsuite=Concurrency
npm run api:test                            # las cuatro, también en orden aleatorio
npm run api:test:down
```

Pasan todas. Entre otras cosas ejercitan:

- la plantilla contra el fixture compartido (11 casos, 0 diferencias) y la clasificación, una prueba por cada fila de la tabla de [contracts/harness-template.md](./contracts/harness-template.md);
- la batería de SC-002: los 8 programas tramposos o accidentales dan `failed`, ninguno `passed`;
- veinte pedidos idénticos en paralelo dejan 1 ejecución, 1 trabajo y 1 pedido al ejecutor; dos pedidos de una cuenta con claves distintas dejan 1 aceptado y 1 en 429; cien admisiones desde veinte procesos dejan 0 ejecuciones sin trabajo y 0 trabajos sin ejecución (SC-003 y SC-004);
- el reencolado, el `infra_error`, el cierre que no duplica el intento y la época subida a mano (SC-006 y SC-007);
- la matriz de acceso ajeno y la de cuenta esperada (SC-008), el log sin código ni salida y la poda;
- el esquema: las columnas de las seis tablas contra el ADR, y un `DELETE FROM users` con todas pobladas que no falla ni deja filas (SC-011).

## 2. Análisis estático y formato

```sh
npm run api:analyse          # nivel 9, sin baseline: 0 errores
npm run api:format:check     # Pint
```

## 3. El generador y los checks de TypeScript

```sh
npm run curriculum
node qa/content-harness-check.ts && node qa/curriculum-meta-check.ts && node qa/content-exercises-check.ts && node qa/content-check.ts
npm test && npm run lint && npm run format:check
node tools/content/dump-globals.ts . | sha256sum        # cd1f9e62…, igual que antes
```

Para comprobar que el documento y las 17 porciones no cambiaron y que cambian exactamente 49 `gradingHash`, contra una copia de `master`:

```sh
mkdir -p /tmp/base && git archive master | tar -x -C /tmp/base && ln -s "$PWD/node_modules" /tmp/base/node_modules
(cd /tmp/base && node tools/content/build-curriculum.ts)
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const before = JSON.parse(readFileSync('/tmp/base/build/curriculum.meta.json', 'utf8'));
const after = JSON.parse(readFileSync('build/curriculum.meta.json', 'utf8'));
console.log('documento igual:', before.documentHash === after.documentHash);
console.log('las 17 porciones iguales:', Object.keys(before.portions).every((k) => before.portions[k] === after.portions[k]));
console.log('porciones:', Object.keys(after.portions).length, '(la última es', Object.keys(after.portions).at(-1) + ')');
const changed = Object.keys(after.exercises).filter((id) => before.exercises[id].gradingHash !== after.exercises[id].gradingHash);
console.log('gradingHash que cambian:', changed.length);
"
```

Esperado: `true`, `true`, `18 (la última es harness)` y `49`.

## 4. El contenido, con la plantilla, a través de Nginx

```sh
docker compose up --build -d --wait
npm run api:content:check
npm run api:smoke
```

Esperado: las 18 porciones salen con el sha256 que fija el generador y 304 ante su validador (`GET /api/harness` incluida), y `api:smoke` pasa, con el POST de 200 KiB a `/api/runs` en 413 (Nginx corta antes de PHP). Con C3a integrado, los dos checks se autentican con una cuenta propia que crean y retiran.

## 5. Las imágenes del sandbox y el aislamiento del ejecutor

```sh
docker compose --profile sandbox-images build      # taller-sandbox-rust:local y taller-sandbox-go:local (pide permiso si faltan las bases)
docker compose up --build -d --wait
docker compose ps                                  # executor y 4 worker-runs, todos sanos
docker compose exec php sh -c 'wget -q -T 2 -O- http://executor:8080/healthz'    # falla: php no alcanza al ejecutor
docker compose exec worker-runs sh -c 'php -r "echo file_get_contents(\"http://executor:8080/healthz\");"'   # ok
docker compose exec php printenv EXECUTOR_TOKEN    # vacío: el token no llega a php
docker compose port executor 8080                  # nada: no hay puertos publicados
```

## 6. Punta a punta con el ejecutor real (FR-048)

```sh
npm run api:runs:check
```

Crea dos cuentas de prueba (una por lenguaje, así 6 casos de cada una quedan bajo las 10 por minuto), corre y retira. Los 12 casos de SC-001:

| Caso | Rust (`rust-01`) | Go (`go-01`) | Esperado |
| --- | --- | --- | --- |
| Solución de referencia | su `solution` | su `solution` | `passed`, 3 pruebas en `pass` |
| Código inicial | su `starter` | su `starter` | `failed`, con las pruebas que fallan nombradas |
| Error de compilación | la `solution` con un `)` de más al final | ídem | `compile_error` |
| Salida con código distinto de 0 | la `solution` y la prueba propia `{ std::process::exit(101) }`, que corre después de las tres | la `solution` y `func init() { panic("boom") }` agregado al código | `runtime_error` |
| Bucle infinito | la `solution` y la prueba propia `{ loop {} }` | la `solution` y la prueba propia `func() bool { for {} }()` | `timeout` |
| Salida desbordada | la `solution` y la prueba propia `{ for _ in 0..200 { println!("{}", "x".repeat(1024)); } true }` | la `solution` y la prueba propia `func() bool { for i := 0; i < 200; i++ { fmt.Println(fmt.Sprintf("%01024d", 0)) }; return true }()` | `failed` con motivo `output_limit` (el centinela queda más allá de los 64 KiB que conserva el ejecutor) |

Además, de SC-003 (la 2.ª simultánea y la 11.ª de un minuto dan 429 `quota_exceeded` con `Retry-After`, y en una ráfaga de 40 cuentas la que supera las 32 en espera da 503 `queue_full` con `Retry-After`) y, como **medición** (SC-012, sin objetivo todavía), un aula simulada de 30 cuentas que ejecutan a la vez: imprime la mediana y el p95 del tiempo hasta el estado final, la espera del último y la cantidad de 503. El ADR 0005 espera una mediana de 1,5 a 3 s en reposo y el ADR 0006 estima unos 20 s para el último de un aula de 30: eso es lo que se contrasta.

## 7. Un worker que muere (SC-005)

Con una ejecución en curso (un `loop {}` de Rust, que dura 10 s):

```sh
docker kill "$(docker compose ps -q worker-runs | head -1)"
```

Esperado: el ejecutor no recibe un segundo pedido (su log muestra uno solo), y la ejecución termina `infra_error` en 4 minutos o menos (la reserva de 140 s más el minuto del barrido); la cuenta puede volver a ejecutar sin esperar más. Con el ejecutor ocupado (todos los slots tomados), una ejecución corre una sola vez cuando hay lugar, o termina `infra_error` a los 10 minutos con `executor_busy` o `expired`.

## 8. Los logs no llevan código ni salida (SC-008)

El check del escenario 6 corre con una línea inconfundible en el código, en la prueba propia y en la salida (`TALLER_CENTINELA_<azar>`). Después:

```sh
docker compose logs php worker-runs scheduler | grep -c TALLER_CENTINELA_    # 0
```

## 9. El despliegue

```sh
sh backend/api/scripts/deploy.sh
sh backend/api/scripts/deploy-check.sh
```

Esperado: el despliegue construye, corre `migrate` con la imagen nueva (con el primer import, que informa 49 ejercicios de Go con la corrección cambiada y suma 49 versiones a `exercise_grading_versions`) y recién entonces recrea `php`, `executor` y `worker-runs`. `deploy-check.sh` sigue pasando.

## 10. La poda

```sh
docker compose exec scheduler php artisan runs:prune
```

Imprime cuántas ejecuciones y cuántos payloads borró. Con un reloj adelantado, la prueba de Pest (`PruneTest`) comprueba que borra sólo lo vencido y conserva el payload de la última aprobación y el del último intento de cada ejercicio.
