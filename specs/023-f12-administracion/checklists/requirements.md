# Specification Quality Checklist: F12 · Administración

**Purpose**: Validate specification completeness and quality before proceeding to planning

**Created**: 2026-10-28

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

- **Los marcadores.** Quedan tres `[NEEDS CLARIFICATION]`, uno por pregunta:
  - FR-003, por Q1 (dónde se monta);
  - FR-036, por Q3 (cómo se pide la contraseña);
  - la línea de C4 en «Dependencias reales», por Q2 (si C4 espera a F12a). Q2 decide una dependencia de otro ítem, no un comportamiento de F12, así que no tiene un requisito propio.

  Son tres, lo que admite la plantilla, y el coordinador admite hasta cinco preguntas. Cada pregunta trae sus opciones, una recomendada y su costo.
- **La partición** no es una pregunta: está en su sección, con su recomendación, y el usuario la acepta o la cambia al responder.
- **«Requirements are testable and unambiguous»** queda sin marcar hasta el clarify. FR-003 y FR-036 usan la opción recomendada como borrador, y los otros 59 ya se pueden probar.

**El conteo**

- **61 requisitos,** con una sola obligación comprobable cada uno, contra los 52 de C3a. Por eso se propone un corte, sin aplicarlo:

| Parte | Requisitos propios | Con los 12 transversales (FR-050 a FR-061) |
| --- | --- | --- |
| F12a · Sin correo (recomendada) | 43 (FR-001 a FR-043) | 55 |
| F12b · Con correo (espera a C3c) | 6 (FR-044 a FR-049) | 18 |

- **La alternativa en tres partes** queda en 28, 15 y 6 propios (40, 27 y 18 con los transversales): cuentas, invitaciones por enlace y correo.
- **El motivo principal no es el tamaño:** la parte del correo no se puede entregar hasta C3c, cuyo plan espera el dominio. Es el mismo motivo de F11c.
- **La cobertura:** cada requisito de FR-001 a FR-049 está en el «Cubre» de alguna historia (se comprobó con un script). Los transversales valen para todas, y sus criterios son SC-006, SC-007 y SC-009; FR-060 figura además en la historia 5.

**Excepciones deliberadas en «implementation details»**

F12 consume un contrato HTTP ya entregado, así que nombra lo que consume y dónde entra. Son cuatro grupos:

1. Los endpoints, los campos y los códigos de C3b, C3a y C3c, que son su objeto.
2. Las herramientas que fijan otros:
   - React Hook Form, por pedido del usuario;
   - Vitest, Testing Library, fishery y Playwright, por el ADR 0008.
3. Los elementos del shell y del arranque que limitan dónde se monta (`#main`, `.app-shell`, «Tu cuenta», `viewFromHash`) y las reglas de la red de F1 que Q1 mide.
4. Los archivos de la API citados como evidencia del contrato (controladores, `FormRequest`, pruebas de Pest y `lang/es/`).

Los nombres de módulos (`pages/admin`, `shared/api` y `entities/session`) son provisionales y los confirma el plan. No hay código.

**El lector y los criterios**

- **«Non-technical stakeholders»:** el lector es el dueño del taller, que tomó las decisiones del épico y conoce los contratos de C3b. Los términos técnicos son los suyos, y los textos que lee quien administra van aparte, para que los corrija.
- **«Technology-agnostic»:** SC-007 y SC-009 nombran los comandos y el límite de `build-check`, porque es lo que se ejecuta. Los demás criterios hablan de pedidos, enlaces, mensajes, teclas y anchos.

**Lo que se verificó**

- **El contrato de C3b,** contra el código de la API en `master` (`e87772d`):
  - las rutas de `backend/api/routes/api/` (`admin-users.php`, `admin-invitations.php`, `deletion.php` y `account.php`) y los grupos de `bootstrap/app.php`;
  - los controladores `Admin/UserController`, `Admin/InvitationController`, `Account/DeletionController`, `Auth/ConfirmPasswordController` y `SessionController`;
  - los `FormRequest` de `app/Http/Requests/Admin/`;
  - `PublishedAdminUser`, `PublishedInvitation`, `PageMeta`, `PublishedUser`, `RequirePassword`, `ApiCode` y `Limiters`;
  - `config/auth.php` (900 s), `config/taller.php` (los vencimientos y la poda) y `lang/es/` (`admin`, `invitations`, `api` y `account`);
  - las pruebas `PasswordConfirmMatrixTest`, `InvitationsEndpointTest`, `InvitationsListTest`, `UsersListTest`, `UserUpdateTest` y `DeleteUserTest`;
  - el listener de B2 (`CancelRunsOfRestrictedAccount`): cancela las ejecuciones al deshabilitar o al borrar, no al degradar, y el texto de «Quitar admin» no lo promete;
  - `AccountChanges`: sólo rechaza los cambios sobre una cuenta que se está borrando, así que una cuenta deshabilitada también admite «Hacer admin» y «Quitar admin», como dice la tabla de acciones por fila.

  De ahí salen los hallazgos de «Relación con otros ítems»: no hay un comando de consola para gestionar cuentas, los mensajes de `invitations.php` muestran los valores en inglés, y `GET /api/admin/users/{user}` no le hace falta a F12.
- **El front,** en la integración local de F2a, A2 y F2b (`2b37caf`):
  - `frontend/src/app/main.tsx` y `frontend/src/shared/config/url-grammar.ts` (`viewFromHash`);
  - `qa/build-check.ts` (el límite de 1 250 000 caracteres);
  - `qa/e2e/specs/views.spec.ts`, los Page Objects y las fixtures;
  - `frontend/src/index.html` (la barra superior) y los estilos de diálogo de `styles.css`;
  - el patrón de tabla con región que se desplaza de `frontend/systems.js` (`.sys-table-scroll`).
- **F11,** en su rama `spec/f11-acceso` (`7a97bf74`): el cliente, la sesión, «pedir el ingreso», el diálogo «Tu cuenta», el doble de la API, la partición y la nota sobre compartir el pedido de la contraseña con F12.
- **C3c, C4 y las dos hojas de ruta,** en `master`.
- **Nada más se ejecutó:** ni `npm`, ni Docker, ni un navegador. Los 9 enlaces relativos de la spec se comprobaron con un script, y todos resuelven. La spec de F11 se cita por rama y ruta, sin enlace, porque no está en `master`.
- **La documentación de librerías:** F12 no agrega ninguna. React Hook Form y Playwright se toman de lo que ya fijaron F11 y el ADR 0008.

**Discrepancias que la spec registra y no corrige**

- La hoja de ruta del front dice que F12 depende de F11. Depende de F11a; F11b sólo comparte el pedido de la contraseña.
- La hoja de ruta del front dice que F12 no bloquea a ningún otro ítem. Con Q2 en A, bloquea a C4.
- La hoja de ruta del front todavía dice que el límite de `build-check` es de 2 500 000 caracteres; desde A2 es 1 250 000.
- La compuerta G1 de C4 no nombra pantallas de administración, y su recorrido de la CSP no incluye las de F11 ni las de F12.
- Las pantallas de C5 no tienen dueño en ninguna de las dos hojas de ruta.
