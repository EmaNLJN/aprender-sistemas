# Specification Quality Checklist: F11 · Acceso y cuenta

**Purpose**: Validate specification completeness and quality before proceeding to planning

**Created**: 2026-10-07

**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Lo que queda abierto**

- **Los marcadores.** Quedan cinco `[NEEDS CLARIFICATION]`, uno por pregunta abierta: FR-003 (Q1), FR-045 (Q2), FR-012 (Q3), FR-052 (Q4) y FR-062 (Q5). Cada pregunta trae sus opciones, una recomendada y su costo. Son las cinco que admite el coordinador; la plantilla de `/speckit-specify` dice tres.
- **La partición** no es una pregunta: está en su sección, con su recomendación, y el usuario la acepta o la cambia al responder.
- **«Requirements are testable and unambiguous»** queda sin marcar hasta el clarify. Los cinco requisitos con marcador usan la opción recomendada como borrador; los otros 72 ya se pueden probar.

**El conteo**

- **77 requisitos,** con una sola obligación comprobable cada uno, contra los 52 de C3a, la mayor del épico. Por eso se propone partir en cuatro sin cortar el archivo:

| Parte | Requisitos propios | Con los 12 transversales (FR-066 a FR-077) |
| --- | --- | --- |
| F11a | 52 (FR-001 a FR-052) | 64 |
| F11b | 7 (FR-053 a FR-059) | 19 |
| F11c | 2 (FR-060 y FR-061) | 14 |
| F11d | 4 (FR-062 a FR-065) | 16 |

- **El motivo principal no es el tamaño:** sin partir, lo de D1 cierra un ciclo (A3 → F11 → D1c → A4 → A3).
- **La cobertura:** cada requisito de F11a a F11d está en el «Cubre» de alguna historia. Los transversales valen para todas, y sus criterios son SC-004, SC-005, SC-007, SC-008 y SC-011; FR-076 figura además en la historia 5.

**Excepciones deliberadas en «implementation details»**

F11 consume contratos HTTP ya entregados, así que nombra lo que consume y dónde entra. Son cuatro grupos:

1. Los endpoints, los campos y los códigos de C3a, C3b, C3c y D1, que son su objeto.
2. Las herramientas que fijan otros:
   - React Hook Form, por pedido del usuario;
   - Vitest, Testing Library, fishery y Playwright, por el ADR 0008;
   - Zustand, por `AGENTS.md`.
3. Las rutas del arranque de A2 donde entra la etapa.
4. Las reglas del contrato de CSS de F1 que limitan dónde va la entrada «Tu cuenta».

Los nombres de módulos y de slices son provisionales y los confirma el plan. No hay código.

**El lector y los criterios**

- **«Non-technical stakeholders»:** el lector es el dueño del taller, que tomó las decisiones del épico y conoce los contratos de C3. Los términos técnicos son los suyos, y los textos que lee el alumno van aparte, para que los corrija.
- **«Technology-agnostic»:** SC-002, SC-008 y SC-011 nombran los comandos, los checks y el límite de `build-check`, porque es lo que se ejecuta. Los demás criterios hablan de tokens, pedidos, mensajes, teclas y anchos.

**Lo que se verificó**

- **Los contratos,** contra el código de la API en `master` (`e87772d`):
  - las rutas de `backend/api/routes/api/` y `bootstrap/app.php`;
  - `ApiCode`, los controladores de ingreso, sesión, invitación, restablecimiento, cuenta, descarga y supresión, y sus `FormRequest`;
  - `PasswordPolicy`, `PlainPassword` y `PrivacyNotice`;
  - `config/taller.php` y `lang/es/` (`api`, `account`, `passwords`, `password-policy` y `validation`).

  De ahí salen tres hallazgos: la versión del aviso que no publica `GET /api/session` (Q2), la confirmación que `PUT /api/me/password` informa en `password` (FR-054), y que el largo se cuenta en puntos de código después de NFC (FR-029).
- **El arranque, en la rama `f2a/base` (`2ffbbc6`):**
  - `frontend/src/app/main.tsx` y `frontend/src/app/boot/`;
  - `qa/e2e/` (`playwright.config.ts`, `fixtures/`, `pages/shell.ts`, `specs/css-contract.spec.ts` y `specs/content-gate.spec.ts`);
  - `frontend/src/index.html` y los estilos móviles de `styles.css`.
- **La interfaz con A3,** contra su spec en la rama `spec/a3-contenido-api` (PR #49, `87445f7`): sus FR-001 a FR-003, FR-012, FR-021, FR-023, FR-024, FR-032 y FR-038, sus Q1 y Q2 y sus supuestos sobre F11. La spec adopta esa interfaz: la etapa de sesión es de A3, y F11 suma la de los tokens antes y la de acceso después.
- **Las medidas de peso** salen de los metadatos públicos del registro de npm y de bundlephobia, consultados el 2026-10-07 sin instalar ni bajar ningún paquete. Las de bundlephobia son estimaciones de un tercero sobre el paquete entero. El tamaño de `dist/index.html` es el de la línea base T020 de F2b; no se reconstruyó.
- **La documentación:** Context7 no estuvo disponible en esta sesión, así que la API de `setError` (`root.serverError`, `types` y `shouldFocus`) se tomó de la documentación oficial de React Hook Form.
- **Nada más se ejecutó:** ni `npm`, ni Docker, ni un navegador. Los 14 enlaces relativos de la spec se comprobaron con un script y todos resuelven.

**Discrepancias que la spec registra y no corrige**

- La hoja de ruta del front todavía dice que el límite de `build-check` es de 2 500 000 caracteres; desde A2 es 1 250 000.
- La fila de F11 en la hoja de ruta no cita a C3c, de la que depende pedir el enlace por correo.
- A2 nombra dos etapas previas, «la sesión de A3» y «el acceso de F11». Con la interfaz que propone A3 son tres: la de los tokens (F11), la de sesión (A3) y la de acceso (F11).
- La spec de A3 (016, PR #49) pone el aviso de privacidad en «la cuenta», y esta spec lo pone en F11a. Esa diferencia y otras tres de la interfaz están en «Relación con otros ítems», A3, para que las concilie el coordinador.
- La spec de C3c supone que F11 trae el registro y la verificación de email, y esta spec los deja fuera.
