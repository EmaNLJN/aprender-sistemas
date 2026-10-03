# Herramientas de calidad

Este directorio mantiene las CLI separadas de las dependencias del taller.
React Doctor y Desloppify se instalaron el 2026-10-03, junto con sus skills en
`.agents/skills/`. React es la preferencia futura; la aplicación aún usa vanilla.

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

El script apunta al repositorio y usa `--no-telemetry`, que también desactiva la
puntuación remota según la CLI instalada. Para una regresión contra una referencia
Git real, usá `--scope changed --base <referencia>` con el binario local.
El análisis React tendrá sentido cuando existan código y dependencias React;
la verificación actual de instalación sólo comprobó versión y ayuda.
Los trazados de navegador y los informes son estado local y van fuera de Git.

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

Para una auditoría solicitada, elegí el proyecto coherente a analizar y excluí
dependencias, fuentes importadas de skills y artefactos generados. Consultá
`exclude --help` y `scan --help` antes de configurarlo; después del scan seguí el
flujo de la skill y sus comandos `status` y `next`. La instalación no realiza
un scan ni inicia correcciones de la aplicación.

`.desloppify/`, `.venv/` y `node_modules/` están ignorados; `.dockerignore` excluye
este directorio y el estado del scanner del build web. Los resultados de estas
herramientas complementan TDD y los checks del taller, sin reemplazarlos.
