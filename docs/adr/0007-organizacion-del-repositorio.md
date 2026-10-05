# ADR 0007 · Organización del repositorio en frontend, backend y docker

- **Estado:** aceptada por el usuario el 2026-10-05.
- **Contexto de la decisión:** pedido del usuario: «crear docker, backend y frontend como carpetas y luego poner todo donde corresponde».

## Contexto

La raíz mezcla todo:
- las seis vistas legacy, con sus cinco hojas de estilo;
- la configuración del front (Vite, TypeScript, ESLint, Prettier, React Doctor);
- el Dockerfile del front y `nginx.conf`;
- los dos archivos de Compose y las licencias del bundle;
- los dos servicios del backend (`api/` y `executor/`).

Quien entra no distingue qué es de la web, qué es del backend y qué es infraestructura.

Se consultaron:
- la estructura de monorepos de Turborepo (Context7: `apps/` y `packages/`);
- la documentación de Docker Compose (Context7: rutas relativas, `include` y `project_directory`);
- ejemplos de monorepos con Laravel, React y Docker.

`find-skills` sólo encontró skills de monorepos JavaScript (Turborepo, Nx), que no cubren PHP, Go ni Docker.

## Decisión

| Hoy | Después |
| --- | --- |
| `src/` | `frontend/src/` |
| `app.js`, `lab.js`, `campaign.js`, `systems.js`, `lab-explorers.js`, `quest-explorers.js` | `frontend/` |
| `styles.css`, `lab.css`, `campaign.css`, `systems.css`, `quest-explorers.css` | `frontend/` |
| `vite.config.ts`, `tsconfig.app.json`, `doctor.config.ts` | `frontend/` |
| `Dockerfile` (la web) | `frontend/Dockerfile`, con la raíz como contexto |
| `EDITOR-LICENSES.txt`, `THIRD-PARTY-NOTICES.txt` | `frontend/` |
| `api/` | `backend/api/` |
| `executor/` | `backend/executor/` |
| `compose.yaml` | `docker/compose.yaml` |
| `compose.preview.yaml` | `docker/compose.preview.yaml` |
| `nginx.conf` | `docker/nginx/nginx.conf` |

- **Las vistas legacy y sus estilos quedan en la raíz de `frontend/`,** junto a `src/`, con la misma relación que tienen hoy con la raíz. Así las importaciones de `src/app/main.tsx` no cambian, y van desapareciendo a medida que migran a React.
- **Cada Dockerfile vive con su servicio,** como recomienda Docker. `docker/` reúne la orquestación y la configuración de la infraestructura.
- **En la raíz queda un `compose.yaml` mínimo** con `name: taller-rust-go` y un `include` de `docker/compose.yaml` con `project_directory: .`. Así `docker compose …` sigue funcionando desde la raíz, el `.env` de la raíz sigue interpolando y las rutas del archivo incluido se resuelven desde la raíz.
- **Quedan en la raíz** porque los comparten la web, la API y las herramientas:
  - `content/` y `tools/`;
  - `qa/`, que es transversal, con checks del front, del contenido y de punta a punta contra el stack, y con sus `*-validation.json` intactos;
  - un único `package.json` con su `package-lock.json`;
  - la configuración común de TypeScript, ESLint y Prettier;
  - las salidas `build/` y `dist/`.

## Invariantes

1. **El stack de quien ya lo tiene levantado sigue igual después de `git pull` y `docker compose up`.** El nombre de proyecto `taller-rust-go`, los servicios, las redes y la clave del volumen `mysql-data` no cambian; si cambiaran, `up` crearía una base vacía. Se comprueba comparando con `master` la salida de `docker compose config --services` y `--volumes`, y el nombre del proyecto sin `COMPOSE_PROJECT_NAME`.
2. **Ningún comando documentado cambia.** Siguen igual `npm run build`, `npm test`, `npm run api:*`, `npm run test:executor` y `docker compose up --build -d --wait` desde la raíz. Sólo cambia la ruta de `compose.preview.yaml`.
3. **Los bytes no cambian:**
   - el sha256 de `build/curriculum.json`;
   - el volcado de `dump-globals` (SC-006);
   - `dist/index.html`, salvo que Vite embeba rutas de módulos. En ese caso se explica en el PR.
4. **Git ve los renombres.** El primer commit sólo mueve archivos con `git mv`, sin editarlos. Las correcciones de rutas van en commits aparte.

## Verificación

- Los checks del CI (`front`, `api` y `executor`), en local y en GitHub.
- `npm run api:analyse`.
- Un stack completo en un proyecto y un puerto propios: `up`, `api:smoke`, `api:content:check` y `deploy-check.sh`.
- `npm run dev` arranca.
- La prueba de concepto del `include` (2026-10-05) ya levantó el stack sano con `name` y `project_directory` en la raíz.

## Consecuencias

- **Se actualizan:**
  - las rutas de los Dockerfiles, de Compose, del CI y de los scripts;
  - la configuración de Vite y TypeScript;
  - los checks de `qa/` que leen archivos por ruta;
  - la etapa `curriculum` de la API, que pasa a copiar `frontend/src/shared/config`;
  - `.gitignore`, `.dockerignore` y `.prettierignore`;
  - los `AGENTS.md` (el de la raíz, el de `qa/` y los de `backend/api` y `backend/executor`, que se mueven con su carpeta), `docs/architecture.md`, el README y la constitución, que lista las rutas de los `AGENTS.md` locales.
- **Lo que no se reescribe:** las specs entregadas (`specs/001-*`), `docs/plans/` y los ADR anteriores. Son historia y conservan las rutas de su momento.
- **Lo que queda pendiente:** `tools/content` sigue importando la configuración compartida desde `frontend/src/shared/config`. Si en algún momento se separa como paquete propio, es otra decisión, igual que pasar a npm workspaces.

## Alternativas descartadas

- **`apps/`, `packages/` e `infra/`:** es la convención de Turborepo y Nx, pero el usuario prefirió `frontend/`, `backend/` y `docker/`.
- **Todos los Dockerfiles en `docker/`:** aleja cada Dockerfile de lo que construye.
- **npm workspaces con un `package.json` por carpeta:** la etapa `curriculum` de la API y el caché del CI dependen hoy del `package.json` de la raíz. Merece su propia decisión.
- **Mover `qa/` a `frontend/`:** el check de punta a punta y los de contenido no son del front.
