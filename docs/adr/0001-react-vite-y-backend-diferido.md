# ADR 0001 — React y Vite; backend diferido

- Estado: aceptada
- Fecha: 2026-10-03

## Contexto

El taller es una aplicación estática e interactiva. Nginx sirve un único HTML; el
navegador guarda el progreso y envía compilaciones directamente a los Playgrounds
oficiales. No existe una API propia, autenticación de servidor ni base de datos.
La fuente legacy usa scripts clásicos y globals; la dirección acordada evolucionó a
React con TypeScript/TSX, preservando el HTML autónomo y migrando por vistas
verificables. La entrada actual es `src/main.tsx` desde `src/index.html` y Vite
produce `dist/index.html`.

Se contrastaron documentación actual mediante Context7 y señales públicas de adopción
en GitHub el 2026-10-03. Las estrellas son una señal imperfecta, no una medida de
calidad: React tenía aproximadamente 250,9 mil, Vite 83,1 mil, Express 69,5 mil,
Astro 59,2 mil, Fastify 37,2 mil y Hono 32,4 mil.

## Decisión

1. Usar React 19 y Vite 8 para las vistas migradas, organizadas por funcionalidad;
   Vite es el único build de aplicación y genera `dist/index.html`.
2. Usar TypeScript (`.ts`/`.tsx`) y ES modules (`export`/`import`) en código nuevo.
   Migrar JavaScript legacy por funcionalidades. Mantener CommonJS sólo en
   checks `.cjs` heredados hasta migrarlos deliberadamente.
3. Migrar incrementalmente detrás de los seams `window.Taller*`; esos globals son
   adaptadores de compatibilidad y no se propagan dentro de las funcionalidades.
4. No agregar Express ni otro backend mientras el producto siga siendo estático.
   Vite construye y Nginx sirve la salida; un proceso HTTP adicional no aporta una
   capacidad del alumno.
5. Si aparece una necesidad real de backend, evaluar primero Hono por su interfaz
   basada en Web Standards y portabilidad de runtimes. Evaluar Fastify para un
   despliegue Node especializado y Express cuando su ecosistema sea determinante.

## Alternativas consideradas

- **Astro:** excelente para sitios centrados en contenido; renderiza HTML/CSS sin
  JavaScript por defecto y activa React mediante islas `client:*`. No se elige ahora
  porque la aplicación es altamente interactiva y sumaría otra migración antes de
  retirar los contratos legacy. Puede reevaluarse si el contenido estático pasa a
  dominar la arquitectura.
- **Express:** maduro y ampliamente adoptado. Resuelve routing y middleware HTTP,
  pero el taller no tiene hoy una interfaz de servidor que justifique ese proceso.
- **Fastify:** alternativa Node de bajo overhead y con schemas. Queda para una API
  futura cuyo runtime sea inequívocamente Node.
- **Hono:** framework ESM pequeño basado en Web Standards, ejecutable en Node, Deno,
  Bun y runtimes edge. Es la primera opción a evaluar si aparece una API portable.

## Consecuencias

- Cada slice React se integra desde la entrada Vite única y conserva comportamiento
  mediante el adaptador legacy hasta que el shell también migre.
- React aumenta el tamaño inicial; se controla con el check del HTML autónomo y se
  evita duplicar el runtime entre bundles futuros.
- No se instala una dependencia de backend sin contrato, despliegue y pruebas.
- La salida autónoma `dist/index.html` sigue vigente durante la migración.

## Fuentes

- [React: integración incremental](https://react.dev/learn/add-react-to-an-existing-project)
- [Vite: guía](https://vite.dev/guide/)
- [Astro: componentes e islas](https://docs.astro.build/en/guides/framework-components/)
- [Express](https://github.com/expressjs/express)
- [Fastify](https://github.com/fastify/fastify)
- [Hono](https://hono.dev/docs/concepts/web-standard)
