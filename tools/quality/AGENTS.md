# Herramientas de calidad

Este directorio mantiene las CLI separadas de las dependencias del taller.
React Doctor y Desloppify se instalaron el 2026-10-03, junto con sus skills en
`.agents/skills/`. Atlas ya migró a React/TypeScript con Vite; las demás vistas
conservan módulos JavaScript legacy detrás de adaptadores durante la migración.

## Instalación reproducible

Desde la raíz, con Node/npm y Python 3.11 o posterior:

```sh
npm ci --prefix tools/quality
python3 -m venv tools/quality/.venv
tools/quality/.venv/bin/python -m pip install -r tools/quality/requirements.txt
```

`package-lock.json` fija las dependencias de React Doctor. `requirements.txt`
fija Desloppify y las dependencias Python instaladas. Conservá los dos manifiestos
al actualizar deliberadamente una herramienta.

Si Python carece de pip/ensurepip, se puede preparar un entorno sin pip y usar
la [distribución portátil oficial de pip](https://pip.pypa.io/en/stable/installation/):

```sh
python3 -m venv --without-pip tools/quality/.venv
curl --fail --location --silent --show-error https://bootstrap.pypa.io/pip/pip.pyz --output /tmp/taller-quality-pip.pyz
python3 /tmp/taller-quality-pip.pyz --python tools/quality/.venv install -r tools/quality/requirements.txt pip
```

Esta alternativa se verificó en este entorno y evita instalar paquetes del sistema.
Las rutas `.venv/bin` son compatibles con Linux y macOS; el entorno se recrea
en cada máquina, no se copia ni versiona.

## React Doctor

Versión instalada: **0.9.14**. Fuente:
[millionco/react-doctor](https://github.com/millionco/react-doctor).
Leé `.agents/skills/react-doctor/SKILL.md` al verificar cambios React.

```sh
npm --prefix tools/quality run check:react
tools/quality/node_modules/.bin/react-doctor --help
```

El script analiza `frontend/`, donde está el código React y su configuración, y usa `--no-telemetry`, que también desactiva la
puntuación remota según la CLI instalada. Para una regresión contra una referencia
Git real, usá `--scope changed --base <referencia>` con el binario local.
El análisis React aplica a las vistas React migradas; la verificación de
instalación de la CLI sólo comprobó versión y ayuda.
Los trazados de navegador y los informes son estado local y van fuera de Git.
La configuración `frontend/doctor.config.ts` excluye `dist/`, skills, dependencias y
herramientas auxiliares. La cobertura depende de las vistas React
presentes y no representa por sí sola un score de calidad.

La CI lo corre en el job `react-doctor` de `.github/workflows/ci.yml`, con esta misma versión
(`npm ci --prefix tools/quality`), sólo cuando el cambio toca React según
`.github/scripts/touches-react.sh`: un `.tsx` o `.jsx`, un módulo de `frontend/` que importa
`react` o `react-dom`, `package.json`, esta configuración o el propio job. En un PR usa
`--scope changed --base <base del PR>` y falla sólo por un error nuevo; los avisos quedan en el
log. En un push a `master` analiza todo `frontend/`. Un falso positivo se silencia en su línea con
`// react-doctor-disable-next-line <regla> -- <motivo>`.

## Desloppify

Versión instalada: **1.0**, con extra `full` (incluye analizadores tree-sitter).
Fuente: [peteromallet/desloppify](https://github.com/peteromallet/desloppify).
Leé `.agents/skills/desloppify/SKILL.md` cuando se pida explícitamente un análisis
de salud, deuda técnica o un plan de limpieza.

```sh
tools/quality/.venv/bin/desloppify --version
tools/quality/.venv/bin/desloppify --help
tools/quality/.venv/bin/desloppify scan --help
```

Las exclusiones viven en `.desloppify/config.json`, que es estado local, así que la lista
versionada es `desloppify-excludes.txt`: dependencias, salidas generadas, skills importadas,
specs y docs, y `content/`, porque sus códigos iniciales tienen errores a propósito.
`make desloppify-config` la aplica (`desloppify exclude` es idempotente) y `make desloppify`
escanea. Para sumar o sacar una exclusión, editá la lista y volvé a aplicarla. Después del scan
seguí el flujo de la skill con `status` y `next`. La instalación no realiza un scan ni inicia
correcciones de la aplicación.

La skill de `.agents/skills/desloppify/` es la que distribuye Desloppify 1.0 (versión 7 de la
skill): para actualizarla, compará con `desloppify/data/global/` del paquete instalado. Una
búsqueda con `find-skills` del 2026-10-29 sólo encontró copias de terceros con una instalación.

## Gitleaks

Versión fijada: **8.30.1** (MIT). Fuente: [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks).
`install-gitleaks.sh` baja el binario de la release oficial para Linux o macOS (x64 o arm64),
comprueba su sha256 contra el archivo de checksums de la misma release y lo deja en
`tools/quality/bin/`, ignorado por Git. Para cambiar de versión, editá `version` en el script.

```sh
make secrets          # toda la historia de Git
make secrets-staged   # lo que está en stage
make hooks            # instala el pre-commit que corre secrets-staged, si no hay otro
```

`.gitleaks.toml`, en la raíz, extiende las reglas por omisión. Sus excepciones aplican sólo a
`generic-api-key`, la regla genérica que marca fixtures: las pruebas de la API, del ejecutor,
de Vitest y `qa/`; `specs/`, `docs/plans/` y las skills importadas; y las claves de
`localStorage` `taller-…`. Las reglas específicas (AWS, GitHub, claves privadas y demás)
siguen activas en todo el repositorio. Una excepción nueva va con su `description` y, si
alcanza, como regex del secreto antes que como ruta. Los escaneos usan `--redact`: nunca
imprimen el secreto. La CI corre gitleaks sobre los commits de cada PR y de cada push a
`master` (job `secrets`). Los escaneos son de Git, no de carpetas: `gitleaks dir .` leería
el `.env` local.

`.desloppify/`, `.venv/`, `bin/` y `node_modules/` están ignorados; `.dockerignore` excluye
este directorio y el estado del scanner del build web. Los resultados de estas
herramientas complementan TDD y los checks del taller, sin reemplazarlos.
