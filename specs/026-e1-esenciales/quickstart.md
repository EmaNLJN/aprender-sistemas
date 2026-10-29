# Quickstart: verificar E1

Comandos para verificar la entrega, desde la raíz de `e1/base` con el árbol limpio. Los esperados con cifras suponen la etapa piloto (cinco ejercicios por lenguaje) y salen de la base de T001 más los deltas de [data-model.md](./data-model.md) §3.

## 1. El contenido y lo que no cambia

```sh
npm ci
npm run curriculum
node qa/content-baseline-check.ts --full   # 17 portions and 274 exercises equal the frozen baseline PASS
node qa/curriculum-meta-check.ts       # las 19 porciones y el harness, y Esenciales primero en la cadena
node qa/content-exercises-check.ts
node qa/content-check.ts
node qa/curriculum-ids-check.ts
```

Esperado:
- `content-baseline-check --full` pasa: SC-001. Sin `--full`, la parte permanente es la que corre dentro de `npm test`.
- En `build/curriculum.meta.json`, `catalogs[0]` es `{"code":"essentials","sliceBy":"language","chainPosition":1}` y `portions` tiene 20 claves.
- En `build/curriculum.json`, `essentials.rust` y `essentials.go` tienen cinco ejercicios cada uno, de `rust-138` a `rust-142` y de `go-138` a `go-142`, con la etapa 50 y `level: essentials`.

Con `node`:

```sh
node -e 'const d=require("./build/curriculum.json");for(const l of ["rust","go"])console.log(l,d.essentials[l].map(e=>[e.id,e.stage,e.level].join(":")).join(" "))'
```

## 2. El front

```sh
npm run build
npm test
npm run lint
npm run format:check
git diff --check
npm run test:e2e
```

Esperado:
- `npm test` suma un check (`content-baseline-check`) a los de T001.
- La red E2E pasa con dos ediciones de F1 (`views.spec.ts` y `reload.spec.ts`), los conteos de `lab-map.spec.ts` y los cinco casos de `lab-essentials.spec.ts`.
- `html.length` de `dist/index.html` queda bajo `BOOT_SIZE_LIMIT`.

**A mano, en el navegador** (`docker compose -f docker/compose.preview.yaml up --build -d --wait`, o el stack si A3 entró):
1. En `#laboratorio` con el almacenamiento vacío:
   - las pestañas son «Todos los niveles», «Esenciales · 5 · Tus primeros pasos», «Inicial», «Intermedio», «Avanzado» y «Experto»;
   - la primera tarjeta del mapa dice «01» y «Esenciales»;
   - «Entrar al laboratorio ↗» abre `rust-138`.
2. Con progreso que resolvió `rust-01`, «Un desafío para hoy» sugiere lo mismo que en `master`.
3. En `rust-01`, «←» lleva a `rust-142`, y `rust-137` sigue mostrando «Volver al mapa →».
4. El menú dice 284 en Laboratorio, 4 en Campaña, 25 en Sistemas y 15 en Biblioteca.
5. El Atlas sigue con cuatro niveles en su filtro y en su medidor; la campaña sigue con «4 mundos · 24 misiones».
6. Con teclado: la pestaña Esenciales se alcanza con Tab, se activa con Enter y queda con `aria-pressed="true"`.

## 3. La API

```sh
COMPOSE_PROJECT_NAME=e1 npm run api:test
COMPOSE_PROJECT_NAME=e1 npm run api:analyse
COMPOSE_PROJECT_NAME=e1 npm run api:format:check
```

Contra el stack (`COMPOSE_PROJECT_NAME=e1 CONTENT_SOURCE_COMMIT=$(git rev-parse HEAD) docker compose up --build -d --wait`):

```sh
COMPOSE_PROJECT_NAME=e1 npm run api:content:check   # las 19 porciones, con y sin compresión
```

Con una sesión en el navegador o con `curl -b`, se comprueba a mano:
- `GET /api/session` lista los catálogos `essentials` (posición 1), `cores`, `lab` y `quests`;
- `GET /api/exercises?catalog=essentials&language=rust` responde 200 con `ETag` y `Content-Version`;
- `GET /api/exercises?catalog=essentials&domain=pc` responde 422.

## 4. La base de datos

```sh
COMPOSE_PROJECT_NAME=e1 docker compose exec mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" taller -e "SHOW COLUMNS FROM exercises LIKE 'level'; SELECT catalog, level, COUNT(*) FROM exercises GROUP BY catalog, level; SELECT code, chain_position FROM catalogs;"
```

Esperado:
- `exercises.level` es `enum('beginner','medium','advanced','expert','essentials')`;
- hay 10 filas con `catalog` `essentials` y `level` `essentials`;
- `catalogs` tiene cuatro filas, y sólo `essentials` con posición (1).

## 5. La auditoría (T017)

Como dice `specs/020-b3-auditoria-curriculo/quickstart.md`, con runsc y la instancia propia del ejecutor, sobre el último commit con el árbol limpio.

Esperado:
- 284 soluciones aprueban y 284 iniciales fallan como corresponde, con 0 programas sin veredicto;
- Esenciales es la primera sección de cada lenguaje en el informe.

El resumen va en la descripción del PR.

## 6. SC-009 (medición)

```sh
node -e 'const fs=require("fs");const d=fs.readFileSync("build/curriculum.json");const j=JSON.parse(d);for(const l of ["rust","go"])console.log("essentials."+l, Buffer.byteLength(JSON.stringify(j.essentials[l])));console.log("documento", d.length)'
```

Se anota en `tasks.md`, en la línea de T016, junto al tamaño del documento de la base de T001.

El tamaño de la foto de progreso de una cuenta con todos los ejercicios con intento lo informa `COMPOSE_PROJECT_NAME=e1 npm run api:sync:check` (la medición de SC-010 de la spec 007). Se anota al lado del valor de D1a (737 474 bytes con 274 ejercicios).
