# Implementation Plan: F12b · La administración, con correo

**Branch**: `023-f12-administracion` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F12, en su parte b: FR-044 a FR-049, los transversales FR-050 a FR-061 sobre lo suyo, SC-003, SC-006 a SC-009 y la historia 7. Decisiones, consultas y mediciones: [research-f12b.md](./research-f12b.md). Validación: [quickstart-f12b.md](./quickstart-f12b.md). Tareas: [tasks-f12b.md](./tasks-f12b.md). El [plan de F12a](./plan.md) fija la forma que este plan repite, y su [contrato](./contracts/admin-page.md), las piezas que F12b extiende.

**Objetivo:** que, cuando el taller tenga correo, quien administra invite y reenvíe por correo, vea si cada invitación salió, la pase a enlace y le mande a un alumno un enlace para elegir contraseña, sin que nada cambie mientras no haya correo.

**Arquitectura:**

- **Una sola bandera:** `features.passwordReset` de la sesión, leída con `selectMailAvailable` desde los tres componentes que cambian. Sin correo, todo queda como en F12a (R2).
- **Todo es aditivo y vale «sin correo» por omisión:** parámetros nuevos con valor por omisión, una propiedad opcional y una prop opcional. Las 79 specs de F12a y sus cuatro E2E siguen en verde sin editarse (R11).
- **Las piezas de F12a no cambian de forma:** `ActionDialog` suma sólo una prop opcional, y las dos entregas del reenvío son dos botones de la fila, cada uno con su confirmación (R3).

**Stack:** TypeScript y React 19.2.8, con lo que dejan F11a y F12a: Zustand 5.0.15, React Hook Form 7.89.0, Vitest 5.0.3 con jsdom, Testing Library, fishery 2.4.0 y Playwright 1.63.0. Ninguna dependencia nueva (FR-056).

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Restricciones globales», las «Reglas para todos los agentes», «Interfaces que cambian» y la sección de tu tarea, enteras. `tasks-f12b.md` tiene una línea por tarea (T027 a T041, después de las T001 a T026 de F12a) y remite acá.
> - **Dónde están los archivos.** Los de F12b van en `specs/023-f12-administracion/` con el sufijo `-f12b`, sin tocar los de F12a. Los scripts de Spec Kit buscan `plan.md` y `tasks.md` por nombre: un comando de Spec Kit sobre F12b tiene que recibir los archivos `-f12b`, como en F2b.
> - **La base.** `f12b/base` sale de `master` con F12a (y, con ella, F11a) y con la implementación de C3c. Las unidades U0 a U3 son PR contra `f12b/base`, y F12b llega a `master` en un solo PR, en T041 (research-f12b.md, R1).
> - **Los cambios sobre archivos de F12a van como diff.** Cada diff se escribió sobre el código del plan de F12a, y se aplica con `git apply` si F12a se implementó tal cual. T027 lo comprueba con `git apply --check` y anota lo que difiera. Si un diff no aplica, el cambio se hace a mano con el mismo resultado, y se avisa al coordinador.
> - **El código verificado.** El código de este plan corrió fuera del repositorio, en un arnés con F11a (`impl-f11a`, `a7b3c71d`) y el código del plan de F12a (research-f12b.md, «Mediciones»):
>   - 110 specs de Vitest en verde: las 79 de F12a, sin editar, y las 31 de F12b;
>   - `tsc`, ESLint y Prettier del repo, sin errores ni avisos;
>   - el estado en rojo de T028, T030, T034 y T036, con las fallas que dice cada tarea;
>   - cuatro pruebas que muerden, comprobadas rompiendo el código a propósito.
>
>   El E2E tipa y pasa ESLint, pero no corrió: necesita F11a y F12a cableadas.

## Summary

F12b trae lo que la administración hace cuando el taller tiene correo (C3c). El enfoque:

- **Cuatro unidades apiladas, con un solo merge a `master`** (R1):
  - **U0:** la línea base, con la comprobación de los diffs sobre F12a;
  - **U1:** el modelo, los pedidos, el texto del 503 en el diálogo y lo que el doble de la API necesita;
  - **U2:** «Invitaciones» y «Cuentas» con correo, y el E2E;
  - **U3:** la documentación, el peso, la verificación a mano y el PR.
- **El reenvío por correo tiene su propio parser** (R5): su 200 no trae `url`, y el de F12a lo leería como una respuesta inesperada.
- **La recuperación de un tercero es la cuarta acción de una fila, al final** (R6), para que «Borrar» conserve su lugar y el foco no se pierda.
- **El 503 `mail_unavailable` muestra el mensaje del servidor y el camino sin correo** (R7): «Usá un enlace para copiar.» en las invitaciones y la consola en la recuperación. Su `Retry-After: 3600` no arma ninguna espera.
- **Los dos 429 nuevos usan el manejo común** (R8), y nada se anuncia sin un 2xx.
- **La lista dice si cada correo salió**, con una marca debajo del email. El estado intermedio promete las 24 horas del plazo de reintentos de C3c (R9).
- **Ningún `style=`, ninguna regla de CSS nueva y ninguna dependencia.** El peso medido es de +4 001 caracteres (R12).

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; Node 24.21.0; las versiones de arriba.

**Primary Dependencies**: las de F11a y F12a. Ninguna nueva.

**Storage**: ninguno. Los emails y los enlaces siguen en el estado de los componentes y se descartan al cerrar (FR-008).

**Testing**:

- **Vitest,** en los proyectos `node` (`*.spec.ts`) y `dom` (`*.spec.tsx`, con `frontend/src/vitest.setup.ts`), en cinco archivos nuevos;
- **Playwright,** con un E2E nuevo, `qa/e2e/specs/admin-mail.spec.ts`, sobre el doble de la API con `sessionAccount: ADMIN` y `api.features = WITH_MAIL`.

Los valores esperados salen del contrato de C3c (`specs/011-c3c-correo/contracts/http.md`), de `backend/api/lang/es/` y de la spec, nunca del código que se prueba ni de una factory.

**Target Platform**: navegador moderno (ES2020), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web (front React/TypeScript con vistas legacy); pantallas que se extienden.

**Performance Goals**: ninguna de velocidad. El peso tiene una condición de corte (R12 y T041).

**Scale/Scope**:

- **Lo nuevo:** `pages/admin/model/mail.ts` y `pages/admin/ui/DeliveryField.tsx`; 5 specs de Vitest con 31 pruebas; 1 E2E con 8 escenarios.
- **Lo que cambia:** 15 archivos de `pages/admin` y 3 de `qa/e2e` (el doble, los datos del contrato y el Page Object), más `docs/architecture.md`, `qa/AGENTS.md` y `contracts/admin-page.md`.

## Restricciones globales

Valen para toda tarea. Los valores están copiados de la spec, de la constitución, del contrato de C3c y de las reglas que dejan F11a y F12a.

- **La red, sin editar** (FR-060):
  - los E2E de `qa/e2e/specs/` de la base, incluidos los cuatro `admin-*.spec.ts` de F12a;
  - los escenarios de `boot-check`, `dist-content-check` y `load-order-check`;
  - **y las specs de Vitest de F12a:** ningún `*.spec.ts` ni `*.spec.tsx` existente se modifica. Las de F12b van en archivos nuevos.
- **Lo que sí cambia en `qa/e2e/`:**
  - `fixtures/api-double.ts`, que suma el campo público `features`;
  - `lib/admin-contract.ts`, que suma `mail_unavailable` y `WITH_MAIL`;
  - `pages/admin.ts`, que suma la entrega a `invite`;
  - `specs/admin-mail.spec.ts`, nuevo.
- **Sin correo, nada cambia:** con `features.passwordReset: false`, la administración se ve y se comporta como en F12a.
- **El contrato de C3c,** sin cambios:
  - `features.passwordReset` es la única bandera de «hay correo»;
  - invitar por correo es `POST /api/admin/invitations` con `delivery: "email"`; `created` y `renewed` traen `expiresAt` y no `url`; `rate_limited` no trae nada más;
  - reenviar por correo es `POST /api/admin/invitations/{id}/resend` con `{delivery: "email"}`: 200 sin `url`, o 429 con `Retry-After` si el admin llegó a su tope, y entonces no rota nada;
  - pasar a enlace es el mismo pedido con `{delivery: "link"}`, como en F12a;
  - la recuperación de un tercero es `POST /api/admin/users/{id}/password-reset`, sin cuerpo: 202 sin cuerpo, 422 `errors.user`, 429 con `Retry-After` (un enlace cada 60 s por cuenta), 423, 404 y 503;
  - el 503 es `mail_unavailable`, con `Retry-After: 3600` y «El taller no puede mandar correos por ahora.»;
  - el tope es de 300 correos por admin cada 24 horas, y el plazo de los reintentos, de 24 horas (C3c-1, aceptada).
  - Todo lo que modifica lleva `X-Taller-User` con el id de la cuenta en memoria.
- **Los textos:** los de la spec, «Con correo (F12b)», tal cual. Los del servidor se muestran como llegan. Los que agrega el plan están en research-f12b.md, «Textos que agrega el plan».
- **El estilo:** ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` (FR-054), y ninguna regla de CSS nueva: las marcas usan `.admin-mark` de F12a.
- **La seguridad** (FR-008): ningún nombre, email ni enlace en `localStorage`, `sessionStorage`, una cookie propia, la URL, el historial, un store compartido ni la consola.
- **Los formularios** se envían sólo por `handleSubmit`, con `noValidate` y sin `action` (FR-055).
- **Los stubs del rojo** (TR-2): una función, `const f: (a: A) => R = () => { throw new Error('not implemented'); };`; un componente, `const X: FunctionComponent<Props> = () => { throw new Error('not implemented'); };`, sin parámetros sin usar.
- **El doble de la API** (TR-11 y la decisión del 2026-10-28): la forma canónica de F11a, con la ruta antes del CSRF y `ApiCall.search`, sin `query` propio ni otro `replyTo`. Cada respuesta que no es 2xx se declara con `pageIssues.expectIssue(/status of NNN/, …)` y su código, nunca con `/Failed to load resource/`. Las rutas con id se registran una por una.
- **El peso:**
  - `dist/index.html` queda bajo `BOOT_SIZE_LIMIT`, 1 500 000 caracteres (`qa/build-check.ts`);
  - F12b suma como mucho +6 000 sobre la línea base de T027;
  - si se pasa, T041 se detiene y decide el usuario.
- **La complejidad:** ninguna función nueva pasa de 10. Los avisos de `npm run lint` no suben respecto de T027.
- **La accesibilidad:** los botones de cada fila nombran a la persona o el email (FR-051); todo se hace con el teclado (FR-050); desde 320 px no hay desplazamiento horizontal (FR-052); ninguna animación (FR-053).
- **El backend:** no cambia.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa. Complexity Tracking registra una decisión.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules; `pages/admin` no importa otra página; `interface` para las formas; un componente por archivo con `export default`; estado local, sin Zustand nuevo ni nuqs |
| II. TDD y pruebas útiles | Sí | Cada par de tareas abre con su spec en rojo, contra stubs con la forma de TR-2. Los esperados salen del contrato de C3c, de `lang/es/` y de la spec; fishery arma las entradas |
| III. Código entendible | Sí | Una bandera leída en un lugar; `reactionTo` sigue siendo la única traducción de una falla; ninguna función pasa de 10 |
| IV. Contenido en Git, IDs estables | Sí | No toca `content/`, el progreso ni las URL |
| V. Capas y contratos explícitos | Sí | Todo queda en `pages/admin`; «Interfaces que cambian» fija las firmas, y T032 y T040 actualizan `contracts/admin-page.md` |
| VI. Español, accesibilidad y portabilidad | Sí | Los textos de la spec; teclado, foco y 320 px con E2E; comandos portables |
| VII. Secretos y salidas generadas fuera de Git | Sí | Ninguna salida nueva. Los enlaces no se guardan |
| VIII. Flow-forward | Sí | `tasks-f12b.md` con una línea por tarea, numerada después de F12a; el plan de F12a no se toca |

## Decisiones del usuario y hallazgos que aplica

| Fuente | Qué dice | Cómo lo aplica este plan |
| --- | --- | --- |
| **P3** (clarify del 2026-10-28) | F12b, con correo, espera a C3c | Este plan cubre FR-044 a FR-049. La base lleva C3c implementada; el dominio no hace falta (R1, decisión 1 del informe) |
| **F12-Q3** | La contraseña, a pedido ante un 423 | Los caminos nuevos usan el mismo `ActionDialog`: invitar por correo un admin, reenviar por correo una invitación de admin y la recuperación de un tercero (T038) |
| **C3c-1** (noche del 2026-10-28) | Las 24 horas de los reintentos, aceptadas con #68 | El estado intermedio de la lista las promete (R9) |
| **El doble canónico** | Ruta antes del CSRF y `ApiCall.search`; sin `query` ni `replyTo` propios | F12b suma sólo el campo `features` (T032; R11) |
| **La lista blanca** | `/status of NNN/` | Todas las E2E de F12b (T038) |
| **El slot `administration` de `AccountMenu`** (F11a-1 y F12a-3) | Lo deja F11a o F12a | F12b no lo toca; T027 comprueba que está |
| **Los stubs del rojo** (TR-2) | `const` tipados y `FunctionComponent` | T028, T030 y T034 |
| **El tope del HTML** (#76) | 1 500 000 | Restricciones globales; T041 |
| **F12b-1** | El reenvío por correo responde 429 con el tope; la recuperación, 429 a los 60 s | R8; T034, T036 y T038 |
| **F12b-2** | `rate_limited` es por 24 horas y gana sobre los otros resultados | R4; T028 y T038, con un email que ya tenía cuenta |
| **F12b-3** | El texto de «No salió» depende del plazo | R9 |
| **F12b-4** | `ActionDialog`, `reactionTo`, `EntryResult` y `ACTION_SLOTS` | «Interfaces que cambian» |
| **F12b-5** | Los supuestos de la spec 023 sobre C3c | Ya aplicados en el contrato de C3c; este plan los toma de ahí |
| **TR-6** | El proyecto `dom` y `frontend/src/vitest.setup.ts` | Technical Context |
| **TR-12** | F11a llega a `master` al final | La base es `master` con F12a, que ya trae F11a |

## Project Structure

### Documentation (this feature)

```text
specs/023-f12-administracion/
├── spec.md                      # F12 entera, con su clarify
├── plan.md, research.md, quickstart.md, tasks.md   # F12a, sin tocar
├── contracts/admin-page.md      # el contrato de F12a; T032 y T040 lo ponen al día
├── research-f12b.md             # decisiones, consultas y mediciones de F12b
├── plan-f12b.md                 # este archivo
├── quickstart-f12b.md           # cómo se verifica F12b
└── tasks-f12b.md                # T027 a T041
```

### Source Code (repository root)

Los archivos nuevos y los que cambian, con su dueño («Reparto en paralelo»):

```text
frontend/src/pages/admin/
├── model/
│   ├── types.ts                       # cambia (M): Delivery, rate_limited, MailedInvitation, los campos del correo
│   ├── mail.ts                        # nuevo (M): la bandera, los textos sin correo, la marca de la lista
│   ├── parse-admin.ts                 # cambia (M): la entrega, las marcas, las entradas por correo y parseMailedInvitation
│   ├── link-texts.ts                  # cambia (M): «Le llega por correo.» y rate_limited
│   ├── react-to-failure.ts            # cambia (M): el 503 mail_unavailable
│   ├── invitation-texts.ts            # cambia (M): las cuatro acciones de una invitación
│   ├── mail-model.spec.ts             # nuevo (M)
│   ├── user-actions.ts                # cambia (L): la acción reset-password
│   └── user-actions-mail.spec.ts      # nuevo (L)
├── api/
│   ├── admin-endpoints.ts             # cambia (M): la entrega al invitar, resendByEmail y sendPasswordReset
│   └── admin-endpoints-mail.spec.ts   # nuevo (M)
└── ui/
    ├── render-admin.tsx               # cambia (M): signInWithMail
    ├── ActionDialog.tsx, use-action-dialog.ts   # cambian (M): la prop opcional withoutMail
    ├── action-dialog-mail.spec.tsx    # nuevo (M)
    ├── DeliveryField.tsx              # nuevo (I)
    ├── InviteForm.tsx, InvitationsTable.tsx, InvitationsSection.tsx   # cambian (I)
    ├── invitations-mail.spec.tsx      # nuevo (I)
    ├── AccountsTable.tsx, AccountsSection.tsx   # cambian (L)
    └── accounts-mail.spec.tsx         # nuevo (L)
qa/e2e/
├── fixtures/api-double.ts             # cambia (E): el campo features
├── lib/admin-contract.ts              # cambia (E): mail_unavailable y WITH_MAIL
├── pages/admin.ts                     # cambia (E): invite con la entrega
└── specs/admin-mail.spec.ts           # nuevo (E)
docs/architecture.md, qa/AGENTS.md     # cambian (K, T040)
specs/023-f12-administracion/contracts/admin-page.md   # cambia (E en T032; K en T040)
```

**Structure Decision:** todo queda en `pages/admin`. La bandera se lee con un selector propio (R2), y ningún slice nuevo hace falta. `app/account`, `pages/account`, `entities/session` y `AdminPage` no cambian.

## Interfaces que cambian

Las firmas de F12a que F12b cambia, antes y después. Todas son aditivas: lo de F12a sigue compilando y sus specs siguen en verde.

```ts
// model/types.ts
// antes
export type InviteResult = 'created' | 'renewed' | 'user_exists' | 'invitation_pending';
export interface AdminInvitation { id; email; role; expiresAt; expired; invitedBy; createdAt }
export interface InviteEntry { email; result: EntryResult; link: IssuedLink | null }
// después
export type InviteResult = 'created' | 'renewed' | 'user_exists' | 'invitation_pending' | 'rate_limited';
export type Delivery = 'link' | 'email';
export interface AdminInvitation { id; email; role; delivery: Delivery; expiresAt; expired; sentAt: string | null; sendFailedAt: string | null; invitedBy; createdAt }
export interface MailedInvitation { readonly email: string; readonly expiresAt: string }
export interface InviteEntry { email; result: EntryResult; link: IssuedLink | null; mailed?: MailedInvitation }

// model/parse-admin.ts (nueva)
export function parseMailedInvitation(value: unknown): MailedInvitation | null;

// model/react-to-failure.ts
// antes
export function reactionTo(failure: ApiFailure, notFoundMessage: string, visibleFields?: readonly string[]): FailureReaction;
// después
export const USE_A_LINK = 'Usá un enlace para copiar.';
export function reactionTo(failure: ApiFailure, notFoundMessage: string, visibleFields?: readonly string[], withoutMail?: string): FailureReaction;

// model/invitation-texts.ts
// antes
export function invitationTexts(action: 'resend' | 'revoke', email: string): InvitationActionTexts; // { title; body; confirm; pending }
// después
export type InvitationAction = 'resend' | 'resend-by-email' | 'to-link' | 'revoke';
export function invitationActionsFor(mailAvailable: boolean): readonly InvitationAction[];
export function invitationTexts(action: InvitationAction, email: string): InvitationActionTexts; // suma button

// model/mail.ts (nuevo)
export const NO_MAIL_YET: string;
export const RECOVERY_BY_CONSOLE: string;
export const NOT_SENT: string;
export const ON_ITS_WAY: string;
export const DELIVERY_OPTIONS: readonly { value: Delivery; label: string }[];
export function selectMailAvailable(state: SessionSnapshot): boolean;
export function mailStatusText(invitation: Pick<AdminInvitation, 'delivery' | 'sentAt' | 'sendFailedAt'>): string | null;
export function resentByEmailNotice(email: string): string;

// model/user-actions.ts
// antes
export type UserAction = 'disable' | 'enable' | 'promote' | 'demote' | 'delete';
export const ACTION_SLOTS = ['status', 'role', 'delete'] as const;
export function actionsFor(user: AdminUser, ownId: number): readonly UserAction[];
export function changeFor(action: Exclude<UserAction, 'delete'>): UserChange;
// después
export type UserAction = 'disable' | 'enable' | 'promote' | 'demote' | 'delete' | 'reset-password';
export const ACTION_SLOTS = ['status', 'role', 'delete', 'reset-password'] as const;
export function actionsFor(user: AdminUser, ownId: number, mailAvailable?: boolean): readonly UserAction[]; // false por omisión
export function changeFor(action: Exclude<UserAction, 'delete' | 'reset-password'>): UserChange;

// api/admin-endpoints.ts
// antes
export function invite(client: ApiClient, adminId: number, emails: readonly string[], role: AccountRole): Promise<AdminOutcome<readonly InviteEntry[]>>;
// después
export function invite(client: ApiClient, adminId: number, emails: readonly string[], role: AccountRole, delivery?: Delivery): Promise<AdminOutcome<readonly InviteEntry[]>>; // 'link' por omisión
export function resendByEmail(client: ApiClient, adminId: number, invitationId: number): Promise<AdminOutcome<MailedInvitation>>;
export function sendPasswordReset(client: ApiClient, adminId: number, userId: number): Promise<AdminOutcome<true>>;

// ui/ActionDialog.tsx y ui/use-action-dialog.ts: una prop opcional
interface ActionDialogProps { adminId; start; notFoundMessage; withoutMail?: string; send(); onFinish(end) }
export interface DialogRequest { start; notFoundMessage; withoutMail?: string; send() }

// ui/AccountsTable.tsx e ui/InvitationsTable.tsx: una prop obligatoria
interface AccountsTableProps { titleId; users; ownId; busy; mailAvailable: boolean; onAction(…) }
interface InvitationsTableProps { titleId; invitations; busy; mailAvailable: boolean; onAction(action: InvitationAction, …) }
// InvitationsTable ya no exporta InvitationAction: vive en model/invitation-texts.ts

// ui/render-admin.tsx (la ayuda de las specs)
export function signInWithMail(user?: PublishedUser): void; // OLGA por omisión, con passwordReset: true

// qa/e2e/fixtures/api-double.ts
export interface SessionFeatures { passwordReset: boolean; registration: boolean }
class ApiDouble { features: SessionFeatures /* { passwordReset: false, registration: false } */ }

// qa/e2e/lib/admin-contract.ts
export const ADMIN_MESSAGES: { …los de F12a; mail_unavailable };
export const WITH_MAIL: { passwordReset: true; registration: false };

// qa/e2e/pages/admin.ts
invite(emails: readonly string[], role?: 'Alumno' | 'Admin', delivery?: 'Por correo' | 'Enlace para copiar'): Promise<void>;
```

`AdminPage`, `AdminSection`, `isAdmin`, `AccountMenu`, `AdminDialog` y `reloadDocument` no cambian.

## Review Focus

Lo que el revisor mira primero:

- **Sin correo, nada cambia.** El diff no modifica ninguna spec de F12a, y las cuatro E2E de F12a pasan sin editarse.
- **La bandera,** leída sólo con `selectMailAvailable`, y ningún `useStore` sin selector.
- **Nada se anuncia sin un 2xx.** «Reenviamos…» y «Le mandamos…» se escriben después de mirar el resultado.
- **`ActionDialog`** suma una prop opcional y nada más.
- **El peso y los estilos.** La medida contra T027, ningún `style=` y ninguna regla de CSS nueva.

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba,** cada caso con la prueba que lo fija y la tarea que la suma:

1. **El 200 del reenvío por correo no trae enlace.** Leído con el parser de F12a, un éxito se mostraría como «El taller no respondió como esperábamos». Lo fijan «resends by mail and reads the answer without a link» (T030) y «resends by mail, announces it and asks for the list again» (T034), que fallan si `resendByEmail` lee con `parseIssuedLink`.
2. **El `Retry-After: 3600` del 503 no es una espera.** Si se tomara, el admin no podría pasar a enlace durante una hora. Lo fijan «adds the way without mail to the message of a 503» (T028), «shows the message of a 503 with the way of the link and lets the action be sent again» (T030) y «shows the 503 with the way of the link, keeps the emails and creates nothing» (T034).
3. **Un 429 no es un envío.** Ni el tope del reenvío por correo ni los 60 s de la recuperación pueden terminar en «Reenviamos…» o «Le mandamos…». Lo fijan «keeps the confirmation waiting when the cap stops a resend by mail, and says nothing went out» (T034) y «never says that the link went out when the server waits 60 seconds» (T036), que falla si el aviso se escribe antes de mirar la respuesta.
4. **La acción nueva va al final.** Antes de «Borrar», una fila sin ella movería «Borrar» de lugar y React lo volvería a montar. Lo fijan «offers the reset link last…» (T036) y «is offered last, only to an active student and only with mail» (T036).
5. **Un 423, la contraseña y después un 503.** La acción se repite una sola vez, y el 503 se muestra sin volver a pedir la contraseña. Lo fija «shows a 503 after the password once, without asking for it again nor repeating» (T030).

## Reparto en paralelo

Los dueños tienen archivos disjuntos («Project Structure»). Cada uno trabaja en su worktree sobre `f12b/base` y entrega una rama.

- **Delegables al subagente `implementador`:** M, E, I y L (`AGENTS.md`, «Trabajo con subagentes»). Se les dan sus archivos, el contrato, los valores exactos y los checks, y se les dice que no dejen comentarios.
- **K, el coordinador,** es el agente principal: hace U0, las compuertas, la documentación, la verificación a mano y el PR, y revisa cada diff.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T027 (U0) |
| 1 | M y E a la vez | **M:** T028 a T031. **E:** T032 |
| 1b | K | T033 (compuerta de U1) |
| 2 | I, L y E a la vez | **I:** T034 y T035. **L:** T036 y T037. **E:** T038 (el E2E, en rojo) |
| 2b | K | T039 (compuerta de U2) |
| 3 | K | T040 (documentación) y T041 (peso, compuerta final, verificación a mano y PR a `master`) |

**Puntos de sincronización:**

- **S1:** M entregó T031 y E entregó T032, y K cerró T033. I y L usan el modelo, los pedidos y la prop `withoutMail`; E usa el doble con `features`.
- **S2:** I entregó T035 y L entregó T037. El E2E de T038 pasa a verde.
- **S3:** cada compuerta (T033, T039 y T041) integra su unidad en `f12b/base`.

**Puertos de los E2E** (`vite preview` usa `--strictPort`): K `E2E_PORT=4173` y E `4195`.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y la constitución;
  - la spec (historia 7, FR-044 a FR-061), research-f12b.md, «Interfaces que cambian» y tu tarea;
  - el contrato HTTP de C3c (`specs/011-c3c-correo/contracts/http.md`), en «Administración (C3b)» y «Lo que toman F11c y F12b»;
  - las skills `tdd`, `clean-code`, `vitest`, `react-testing` y las de Vercel; si escribís E2E, `playwright-best-practices`.
- **TDD, siempre.**
  - Cada función o componente nuevo empieza con su stub (TR-2), para que la spec falle por comportamiento y no por un import.
  - La spec en rojo y su implementación van en commits separados. El commit rojo no pasa `npm test` ni `npm run typecheck`; el PR entero sí.
  - Los valores esperados salen del contrato de C3c, de `backend/api/lang/es/`, de la spec o de un ejemplo resuelto a mano, nunca del módulo que se prueba ni de una factory.
  - **Ninguna spec existente se edita.** Las de F12b van en sus archivos nuevos.
- **Los diffs.** Un bloque `diff` de este plan es un parche sobre el archivo de F12a: guardalo en un archivo fuera del repositorio y aplicalo con `git apply <archivo>`. Si no aplica, hacé el mismo cambio a mano y avisá al coordinador.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Imports:**
  - un slice se importa por su `index.ts`; dentro de `pages/admin`, por ruta directa;
  - las ayudas de specs (`shared/api/http/fake-fetch.ts`, `pages/admin/model/admin.factory.ts` y `pages/admin/ui/render-admin.tsx`), por ruta directa y sólo desde specs.
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`;
  - `npm run test:unit -- <ruta>`, `npm run typecheck` y `npm run lint`;
  - `npx prettier --write <tus archivos>` antes de cada commit y, después, `npm run format:check`;
  - `npm run build` y, después, `E2E_PORT=<tu puerto> npm run test:e2e -- specs/<archivo>`.

  Si un comando intenta descargar algo, pará y pedí permiso. Docker lo corre sólo K, con permiso.
- **Estilo.**
  - Código, nombres de test y comentarios en inglés; la interfaz en español rioplatense, con el texto exacto de la spec.
  - **Sin comentarios.** Este plan no escribe ninguno.
  - `interface` para las formas de objetos; un componente o un hook por archivo, declarado como `const` con nombre y `export default` al final; las funciones y las constantes, con exports nombrados.
  - Ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText`.
- **Commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(front): …` o `test(qa): …` para la spec en rojo;
  - `feat(front): …` para lo nuevo;
  - `docs: …` para la documentación.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. U0 · La base (coordinador K, onda 0)

**Cubre:** FR-057 (la medida inicial) y FR-060 (la red de partida).

### Tarea 0.1 · La línea base (T027)

- **Quién y cuándo:** K, sobre `f12b/base` recién creada (`master` con F12a y con la implementación de C3c) y antes de cualquier cambio.
- **Comprobar primero:**
  - **F12a:** existen `frontend/src/pages/admin/` con los archivos que lista «Project Structure», `frontend/src/app/account/AdminDialog.tsx` y los cuatro `qa/e2e/specs/admin-*.spec.ts`;
  - **el slot de F11a y F12a:** `AccountMenu` recibe la prop `administration` y `AccountRoot` le pasa `AdminDialog` (F11a-1 y F12a-3). F12b no lo toca;
  - **C3c:** existen `backend/api/app/Auth/Features.php` y `backend/api/app/Admin/AdminMailQuota.php`, y `backend/api/routes/api/admin-invitations.php` ya no responde 503 por correo cuando hay correo;
  - **el doble:** si `ApiDouble` ya tiene un campo `features` (lo pudo sumar F11c, F11c-2), T032 sólo lo usa;
  - **los diffs:** cada bloque `diff` de T029, T031, T032, T035 y T037 se guarda en un archivo y se prueba con `git apply --check`. Lo que no aplique se anota, con el archivo y el motivo.

  Si F12a o C3c no están en `master`, F12b no empieza.
- **Entrega:** un commit de documentación que suma a research-f12b.md la sección «Línea base de la implementación», con:
  - el hash de la base y la fecha;
  - `html.length` de `dist/index.html`;
  - la cantidad de checks de `npm test` y de pruebas de Vitest, y cuántas son de `pages/admin` (el plan de F12a deja 79);
  - los avisos de `npm run lint`;
  - la cantidad de E2E;
  - el resultado de `git apply --check` de cada diff y, si `ApiDouble` ya trae `features`, su forma.
- **Pasos:**
  1. Correr, todo en verde: `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`. Si algo falla, F12b no empieza.
  2. Medir `node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"` y contar los avisos (`npm run lint 2>&1 | grep -c warning`).
  3. Registrar los valores. El presupuesto de F12b (+6 000) se cuenta desde lo medido acá.
- **Commit:** `docs(specs): línea base de la implementación de F12b`.

### 0.2 · La compuerta de cada unidad

K la corre antes de integrar cada unidad en `f12b/base` (T033, T039 y T041). Cada dueño corre en lo suyo los pasos 2 y 3, sin Docker. La unidad no se integra con una sola casilla en rojo.

1. **Antes de empezar:** sobre su base, `npm test` y la red E2E, en verde.
2. **Los comandos:** `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y `E2E_PORT=4173 npm run test:e2e`.
3. **La red y las specs, sin editar:**
   - `git diff --name-only f12b/base -- qa/e2e/specs qa/boot-check.ts qa/dist-content-check.ts qa/load-order-check.ts` lista, como mucho, `qa/e2e/specs/admin-mail.spec.ts`;
   - `git diff --diff-filter=M --name-only f12b/base -- qa/e2e/specs frontend/src | grep -E '\.spec\.tsx?$'` no imprime nada.
4. **Sin estilos en línea:** `git diff f12b/base -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText|sr-only)'` no imprime nada, y `git diff --name-only f12b/base -- '*.css'` tampoco.
5. **Complejidad:** `npm run lint` da 0 errores y, como mucho, los avisos de T027.
6. **Peso:** `html.length` de `dist/index.html`, anotado en la descripción del PR con la diferencia contra T027.
7. **El PR,** contra `f12b/base`, con título y descripción en inglés. La descripción cuenta el contexto, qué faltaba, qué cambia, cómo se verificó (con los comandos y las medidas de arriba) y qué queda pendiente.

## 1. U1 · El modelo, los pedidos y el doble (onda 1: M y E; onda 1b: K)

**Cubre:**

- **el modelo:** FR-045, FR-046 y FR-049; las partes de FR-044 y FR-047 que son datos (las opciones de la entrega y las acciones de una invitación);
- **los pedidos:** FR-044, FR-047 y FR-048 en su parte HTTP, y FR-039;
- **el diálogo:** FR-049 con el camino que recibe;
- **la base de los E2E:** FR-059.

**Entrega:** el modelo con correo, los tres pedidos, la prop `withoutMail` y el doble con `features`. Nadie ve nada todavía: las secciones no leen la bandera hasta U2.

### Tarea 1.1 · Las specs del modelo con correo, en rojo (T028, M)

**Archivos:** en `frontend/src/pages/admin/model/`, `types.ts` (entero), los stubs de `mail.ts`, `parseMailedInvitation` e `invitationActionsFor`, y `mail-model.spec.ts`.

**Consume:** de F11a, `SessionSnapshot` y `ApiFailure`; de F12a, el modelo. **Produce:** los tipos de «Interfaces que cambian», que usan T029 a T037.

1. **`types.ts`.** Este diff, entero:

   ```diff
   diff --git a/frontend/src/pages/admin/model/types.ts b/frontend/src/pages/admin/model/types.ts
   --- a/frontend/src/pages/admin/model/types.ts
   +++ b/frontend/src/pages/admin/model/types.ts
   @@ -3,9 +3,11 @@ import type { ApiFailure } from '../../../shared/api/http';

    export type AdminSection = 'accounts' | 'invitations';
    export type AccountStatus = 'active' | 'disabled' | 'deleting';
   -export type InviteResult = 'created' | 'renewed' | 'user_exists' | 'invitation_pending';
   +export type InviteResult =
   +  'created' | 'renewed' | 'user_exists' | 'invitation_pending' | 'rate_limited';
    export type EntryResult = InviteResult | 'resent';
    export type InvitationState = 'pending' | 'expired';
   +export type Delivery = 'link' | 'email';

    export interface AdminUser {
      readonly id: number;
   @@ -21,8 +23,11 @@ export interface AdminInvitation {
      readonly id: number;
      readonly email: string;
      readonly role: AccountRole;
   +  readonly delivery: Delivery;
      readonly expiresAt: string;
      readonly expired: boolean;
   +  readonly sentAt: string | null;
   +  readonly sendFailedAt: string | null;
      readonly invitedBy: string | null;
      readonly createdAt: string;
    }
   @@ -44,10 +49,16 @@ export interface IssuedLink {
      readonly expiresAt: string;
    }

   +export interface MailedInvitation {
   +  readonly email: string;
   +  readonly expiresAt: string;
   +}
   +
    export interface InviteEntry {
      readonly email: string;
      readonly result: EntryResult;
      readonly link: IssuedLink | null;
   +  readonly mailed?: MailedInvitation;
    }

    export interface Deletion {
   ```

2. **El stub de `mail.ts`.** Las constantes van con su valor final, y las funciones lanzan `not implemented`:

   ```ts
   import type { SessionSnapshot } from '../../../entities/session';
   import type { AdminInvitation, Delivery } from './types';

   export const NO_MAIL_YET =
     'El taller todavía no manda correos: copiá cada enlace y entregáselo a su persona.';
   export const RECOVERY_BY_CONSOLE =
     'Para recuperar el acceso de alguien, generá el enlace con la consola del taller (taller:password-reset-link).';
   export const NOT_SENT = 'No salió: reenviala o pasala a enlace.';
   export const ON_ITS_WAY = 'Por correo, en camino. Si no sale en 24 horas, lo vas a ver acá.';

   export const DELIVERY_OPTIONS = [
     { value: 'email', label: 'Por correo' },
     { value: 'link', label: 'Enlace para copiar' },
   ] as const satisfies readonly { readonly value: Delivery; readonly label: string }[];

   export const selectMailAvailable: (state: SessionSnapshot) => boolean = () => {
     throw new Error('not implemented');
   };

   export const mailStatusText: (
     invitation: Pick<AdminInvitation, 'delivery' | 'sentAt' | 'sendFailedAt'>,
   ) => string | null = () => {
     throw new Error('not implemented');
   };

   export const resentByEmailNotice: (email: string) => string = () => {
     throw new Error('not implemented');
   };
   ```

3. **El stub de `parseMailedInvitation`,** al final de `parse-admin.ts`, con `MailedInvitation` sumado al `import type` de `./types`:

   ```ts
   export const parseMailedInvitation: (value: unknown) => MailedInvitation | null = () => {
     throw new Error('not implemented');
   };
   ```

4. **El stub de `invitationActionsFor`,** al final de `invitation-texts.ts`:

   ```ts
   export type InvitationAction = 'resend' | 'resend-by-email' | 'to-link' | 'revoke';

   export const invitationActionsFor: (mailAvailable: boolean) => readonly InvitationAction[] = () => {
     throw new Error('not implemented');
   };
   ```

5. **`mail-model.spec.ts`.** Los textos son los de la spec y del contrato de C3c; el estado intermedio, el de research-f12b.md:

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { ApiFailure } from '../../../shared/api/http';
   import { adminInvitationBodyFactory } from './admin.factory';
   import { invitationActionsFor, invitationTexts } from './invitation-texts';
   import { entryText } from './link-texts';
   import { mailStatusText } from './mail';
   import { parseAdminInvitation, parseInviteEntries, parseMailedInvitation } from './parse-admin';
   import { reactionTo } from './react-to-failure';

   const MAIL_UNAVAILABLE: ApiFailure = {
     kind: 'response',
     status: 503,
     code: 'mail_unavailable',
     message: 'El taller no puede mandar correos por ahora.',
     fieldErrors: {},
     retryAfterSeconds: 3600,
   };

   describe('the invitations sent by mail', () => {
     it('keeps how an invitation was delivered and whether the mail went out', () => {
       const body = adminInvitationBodyFactory.build({
         delivery: 'email',
         sentAt: null,
         sendFailedAt: '2026-10-06T12:00:00.000Z',
       });
       expect(parseAdminInvitation(body)).toMatchObject({
         delivery: 'email',
         sentAt: null,
         sendFailedAt: '2026-10-06T12:00:00.000Z',
       });
     });

     it('rejects a delivery or a mark outside the contract', () => {
       expect(
         parseAdminInvitation({ ...adminInvitationBodyFactory.build(), delivery: 'fax' }),
       ).toBeNull();
       expect(parseAdminInvitation({ ...adminInvitationBodyFactory.build(), sentAt: 3 })).toBeNull();
     });

     it('keeps the expiry of an invitation sent by mail, which comes without a link', () => {
       const body = {
         data: [
           { email: 'beto@x.com', result: 'created', expiresAt: '2026-10-12T12:00:00.000Z' },
           { email: 'ana@x.com', result: 'rate_limited' },
         ],
       };
       expect(parseInviteEntries(body)).toEqual([
         {
           email: 'beto@x.com',
           result: 'created',
           link: null,
           mailed: { email: 'beto@x.com', expiresAt: '2026-10-12T12:00:00.000Z' },
         },
         { email: 'ana@x.com', result: 'rate_limited', link: null },
       ]);
     });

     it('reads the 200 of a resend by mail, which has no link', () => {
       const data = {
         id: 5,
         email: 'beto@x.com',
         role: 'student',
         delivery: 'email',
         expiresAt: '2026-10-12T12:00:00.000Z',
       };
       expect(parseMailedInvitation(data)).toEqual({
         email: 'beto@x.com',
         expiresAt: '2026-10-12T12:00:00.000Z',
       });
       expect(parseMailedInvitation({ ...data, delivery: 'link' })).toBeNull();
     });
   });

   describe('the texts of the mail', () => {
     it('says that an invitation goes by mail, and that the cap stopped another', () => {
       const mailed = {
         email: 'beto@x.com',
         result: 'renewed',
         link: null,
         mailed: { email: 'beto@x.com', expiresAt: '2026-10-12T12:00:00.000Z' },
       } as const;
       expect(entryText(mailed)).toMatch(
         /^Tenía una invitación vencida: la renovamos\. Le llega por correo\. Vence el .+ de octubre de 2026 a las .+\.$/,
       );
       expect(entryText({ email: 'ana@x.com', result: 'rate_limited', link: null })).toBe(
         'No salió: llegaste al tope de 300 correos por día. Probá mañana o usá un enlace.',
       );
     });

     it('says whether a mail went out, did not go out or is still on its way', () => {
       const byMail = { delivery: 'email', sentAt: null, sendFailedAt: null } as const;
       expect(mailStatusText({ ...byMail, delivery: 'link' })).toBeNull();
       expect(mailStatusText({ ...byMail, sendFailedAt: '2026-10-06T12:00:00.000Z' })).toBe(
         'No salió: reenviala o pasala a enlace.',
       );
       expect(mailStatusText({ ...byMail, sentAt: '2026-10-05T15:30:00.000Z' })).toMatch(
         /^Entregada al proveedor el 5 de octubre de 2026 a las .+\.$/,
       );
       expect(mailStatusText(byMail)).toBe(
         'Por correo, en camino. Si no sale en 24 horas, lo vas a ver acá.',
       );
     });

     it('adds the way without mail to the message of a 503', () => {
       expect(reactionTo(MAIL_UNAVAILABLE, '')).toMatchObject({
         kind: 'show',
         description: {
           generalMessages: [
             'El taller no puede mandar correos por ahora.',
             'Usá un enlace para copiar.',
           ],
           retryAfterSeconds: null,
         },
       });
       expect(reactionTo(MAIL_UNAVAILABLE, '', [], 'Usá la consola.')).toMatchObject({
         description: {
           generalMessages: ['El taller no puede mandar correos por ahora.', 'Usá la consola.'],
         },
       });
     });
   });

   describe('the actions on an invitation with mail', () => {
     it('offers to resend by mail or to turn into a link only with mail', () => {
       expect(invitationActionsFor(false)).toEqual(['resend', 'revoke']);
       expect(invitationActionsFor(true)).toEqual(['resend-by-email', 'to-link', 'revoke']);
       expect(invitationTexts('resend-by-email', 'beto@x.com')).toMatchObject({
         button: 'Reenviar por correo la invitación de beto@x.com',
         confirm: 'Reenviar por correo',
         pending: 'Generando…',
       });
       expect(invitationTexts('to-link', 'beto@x.com')).toMatchObject({
         button: 'Pasar a enlace la invitación de beto@x.com',
         confirm: 'Pasar a enlace',
       });
     });
   });
   ```

6. **Correr** `npm run test:unit -- frontend/src/pages/admin/model`: las 8 pruebas de `mail-model.spec.ts`, en rojo (por `not implemented` o porque el código de F12a todavía no conoce el correo); las 28 del modelo de F12a, en verde.
7. **Commit:** `test(front): specs del modelo de la administración con correo, en rojo`.

### Tarea 1.2 · El modelo con correo (T029, M)

**Archivos:** en `frontend/src/pages/admin/model/`, `mail.ts`, `parse-admin.ts`, `invitation-texts.ts`, `link-texts.ts` y `react-to-failure.ts`.

1. **`mail.ts`,** entero (reemplaza el stub). La bandera se lee en un solo lugar (R2), y la marca sigue la tabla de R9:

   ```ts
   import type { SessionSnapshot } from '../../../entities/session';
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import type { AdminInvitation, Delivery } from './types';

   export const NO_MAIL_YET =
     'El taller todavía no manda correos: copiá cada enlace y entregáselo a su persona.';
   export const RECOVERY_BY_CONSOLE =
     'Para recuperar el acceso de alguien, generá el enlace con la consola del taller (taller:password-reset-link).';
   export const NOT_SENT = 'No salió: reenviala o pasala a enlace.';
   export const ON_ITS_WAY = 'Por correo, en camino. Si no sale en 24 horas, lo vas a ver acá.';

   export const DELIVERY_OPTIONS = [
     { value: 'email', label: 'Por correo' },
     { value: 'link', label: 'Enlace para copiar' },
   ] as const satisfies readonly { readonly value: Delivery; readonly label: string }[];

   export function selectMailAvailable(state: SessionSnapshot): boolean {
     return state.features.passwordReset;
   }

   export function mailStatusText({
     delivery,
     sentAt,
     sendFailedAt,
   }: Pick<AdminInvitation, 'delivery' | 'sentAt' | 'sendFailedAt'>): string | null {
     if (delivery === 'link') return null;
     if (sendFailedAt !== null) return NOT_SENT;
     if (sentAt !== null) return `Entregada al proveedor el ${formatLocalDateTime(sentAt)}.`;
     return ON_ITS_WAY;
   }

   export function resentByEmailNotice(email: string): string {
     return `Reenviamos la invitación de ${email}. Le llega por correo.`;
   }
   ```

2. **`parse-admin.ts`,** entero (reemplaza el stub de T028). Suma la entrega y las dos marcas a `parseAdminInvitation`, la entrada por correo a `parseInviteEntry` y `parseMailedInvitation` (R4 y R5):

   ```ts
   import { isPlainObject } from '../../../shared/lib/is-plain-object';
   import type {
     AccountStatus,
     AdminInvitation,
     AdminUser,
     Deletion,
     Delivery,
     InviteEntry,
     InviteResult,
     IssuedLink,
     ListPage,
     MailedInvitation,
   } from './types';

   const ROLES = ['admin', 'student'] as const;
   const STATUSES: readonly AccountStatus[] = ['active', 'disabled', 'deleting'];
   const DELIVERIES: readonly Delivery[] = ['link', 'email'];
   const RESULTS: readonly InviteResult[] = [
     'created',
     'renewed',
     'user_exists',
     'invitation_pending',
     'rate_limited',
   ];

   function oneOf<T extends string>(options: readonly T[], value: unknown): value is T {
     return options.some((option) => option === value);
   }

   function inviterName(value: unknown): string | null | undefined {
     if (value === null) return null;
     return isPlainObject(value) && typeof value.name === 'string' ? value.name : undefined;
   }

   function instantOrNull(value: unknown): string | null | undefined {
     if (value === null) return null;
     return typeof value === 'string' ? value : undefined;
   }

   export function parseAdminUser(value: unknown): AdminUser | null {
     if (!isPlainObject(value)) return null;
     const { id, name, email, role, status, emailVerified, createdAt } = value;
     if (typeof id !== 'number' || typeof name !== 'string' || typeof email !== 'string') return null;
     if (!oneOf(ROLES, role) || !oneOf(STATUSES, status)) return null;
     if (typeof emailVerified !== 'boolean' || typeof createdAt !== 'string') return null;
     return { id, name, email, role, status, emailVerified, createdAt };
   }

   function parseMailState(
     value: Record<string, unknown>,
   ): Pick<AdminInvitation, 'delivery' | 'sentAt' | 'sendFailedAt'> | null {
     const { delivery } = value;
     const sentAt = instantOrNull(value.sentAt);
     const sendFailedAt = instantOrNull(value.sendFailedAt);
     if (!oneOf(DELIVERIES, delivery) || sentAt === undefined || sendFailedAt === undefined)
       return null;
     return { delivery, sentAt, sendFailedAt };
   }

   export function parseAdminInvitation(value: unknown): AdminInvitation | null {
     if (!isPlainObject(value)) return null;
     const { id, email, role, expiresAt, expired, createdAt } = value;
     const invitedBy = inviterName(value.invitedBy);
     const mailState = parseMailState(value);
     if (typeof id !== 'number' || typeof email !== 'string' || !oneOf(ROLES, role)) return null;
     if (
       typeof expiresAt !== 'string' ||
       typeof expired !== 'boolean' ||
       typeof createdAt !== 'string'
     )
       return null;
     if (invitedBy === undefined || mailState === null) return null;
     return { id, email, role, ...mailState, expiresAt, expired, invitedBy, createdAt };
   }

   export function parsePage<T>(
     body: unknown,
     parseItem: (value: unknown) => T | null,
   ): ListPage<T> | null {
     if (!isPlainObject(body) || !Array.isArray(body.data) || !isPlainObject(body.meta)) return null;
     const { page, lastPage, total } = body.meta;
     if (typeof page !== 'number' || typeof lastPage !== 'number' || typeof total !== 'number')
       return null;
     const items: T[] = [];
     for (const entry of body.data) {
       const item = parseItem(entry);
       if (item === null) return null;
       items.push(item);
     }
     return { items, meta: { page, lastPage, total } };
   }

   export function parseIssuedLink(value: unknown): IssuedLink | null {
     if (!isPlainObject(value)) return null;
     const { email, url, expiresAt } = value;
     if (typeof email !== 'string' || typeof url !== 'string' || typeof expiresAt !== 'string')
       return null;
     return { email, url, expiresAt };
   }

   export function parseMailedInvitation(value: unknown): MailedInvitation | null {
     if (!isPlainObject(value) || value.delivery !== 'email') return null;
     const { email, expiresAt } = value;
     if (typeof email !== 'string' || typeof expiresAt !== 'string') return null;
     return { email, expiresAt };
   }

   function parseInviteEntry(value: unknown): InviteEntry | null {
     if (!isPlainObject(value) || typeof value.email !== 'string' || !oneOf(RESULTS, value.result))
       return null;
     const entry = { email: value.email, result: value.result, link: parseIssuedLink(value) };
     if (entry.link !== null || typeof value.expiresAt !== 'string') return entry;
     return { ...entry, mailed: { email: value.email, expiresAt: value.expiresAt } };
   }

   export function parseInviteEntries(body: unknown): readonly InviteEntry[] | null {
     if (!isPlainObject(body) || !Array.isArray(body.data)) return null;
     const entries = body.data.map(parseInviteEntry);
     return entries.every((entry) => entry !== null) ? entries : null;
   }

   export function parseDeletion(body: unknown): Deletion | null {
     if (!isPlainObject(body) || !isPlainObject(body.data) || typeof body.message !== 'string')
       return null;
     const { status } = body.data;
     return oneOf(STATUSES, status) ? { status, message: body.message } : null;
   }
   ```

3. **`invitation-texts.ts`,** entero (reemplaza el stub de T028). La acción `'resend'` conserva los textos de F12a, y su botón, el nombre que tenía en `InvitationsTable` (R3):

   ```ts
   export type InvitationAction = 'resend' | 'resend-by-email' | 'to-link' | 'revoke';

   export interface InvitationActionTexts {
     readonly button: string;
     readonly title: string;
     readonly body: string;
     readonly confirm: string;
     readonly pending: string;
   }

   const NEW_LINK_EXPIRY = 'El nuevo vence en 7 días, o en 48 horas si la invitación es de admin.';

   export function invitationActionsFor(mailAvailable: boolean): readonly InvitationAction[] {
     return mailAvailable ? ['resend-by-email', 'to-link', 'revoke'] : ['resend', 'revoke'];
   }

   export function invitationTexts(action: InvitationAction, email: string): InvitationActionTexts {
     switch (action) {
       case 'resend':
         return {
           button: `Reenviar la invitación de ${email}`,
           title: `¿Generar un enlace nuevo para ${email}?`,
           body: `El enlace anterior deja de valer. ${NEW_LINK_EXPIRY}`,
           confirm: 'Generar el enlace',
           pending: 'Generando…',
         };
       case 'resend-by-email':
         return {
           button: `Reenviar por correo la invitación de ${email}`,
           title: `¿Reenviar por correo la invitación de ${email}?`,
           body: `El enlace anterior deja de valer, y le mandamos uno nuevo por correo. ${NEW_LINK_EXPIRY}`,
           confirm: 'Reenviar por correo',
           pending: 'Generando…',
         };
       case 'to-link':
         return {
           button: `Pasar a enlace la invitación de ${email}`,
           title: `¿Pasar a enlace la invitación de ${email}?`,
           body: `El enlace anterior deja de valer, y el nuevo no sale por correo: se ve una sola vez acá, para que lo copies. ${NEW_LINK_EXPIRY}`,
           confirm: 'Pasar a enlace',
           pending: 'Generando…',
         };
       case 'revoke':
         return {
           button: `Revocar la invitación de ${email}`,
           title: `¿Revocar la invitación de ${email}?`,
           body: 'El enlace deja de valer, y nadie puede crear la cuenta con él.',
           confirm: 'Revocar',
           pending: 'Revocando…',
         };
     }
   }
   ```

4. **`link-texts.ts`,** este diff (R4):

   ```diff
   diff --git a/frontend/src/pages/admin/model/link-texts.ts b/frontend/src/pages/admin/model/link-texts.ts
   --- a/frontend/src/pages/admin/model/link-texts.ts
   +++ b/frontend/src/pages/admin/model/link-texts.ts
   @@ -12,11 +12,16 @@ const RESULT_TEXTS: Readonly<Record<EntryResult, string>> = {
      user_exists: 'Ya tiene una cuenta.',
      invitation_pending:
        'Ya tiene una invitación vigente. Si perdió el enlace, generá otro con «Reenviar».',
   +  rate_limited: 'No salió: llegaste al tope de 300 correos por día. Probá mañana o usá un enlace.',
    };

   -export function entryText({ result, link }: InviteEntry): string {
   +const MAILED = 'Le llega por correo.';
   +
   +export function entryText({ result, link, mailed }: InviteEntry): string {
      const text = RESULT_TEXTS[result];
   -  return link === null ? text : `${text} Vence el ${formatLocalDateTime(link.expiresAt)}.`;
   +  if (link !== null) return `${text} Vence el ${formatLocalDateTime(link.expiresAt)}.`;
   +  if (mailed === undefined) return text;
   +  return `${text} ${MAILED} Vence el ${formatLocalDateTime(mailed.expiresAt)}.`;
    }

    export function linksOf(entries: readonly InviteEntry[]): IssuedLink[] {
   ```

5. **`react-to-failure.ts`,** este diff (R7):

   ```diff
   diff --git a/frontend/src/pages/admin/model/react-to-failure.ts b/frontend/src/pages/admin/model/react-to-failure.ts
   --- a/frontend/src/pages/admin/model/react-to-failure.ts
   +++ b/frontend/src/pages/admin/model/react-to-failure.ts
   @@ -6,6 +6,7 @@ export const ACCOUNT_GONE = 'Esa cuenta ya no existe.';
    export const INVITATION_GONE =
      'Esa invitación ya no existe: puede que la hayan aceptado o revocado.';
    export const UNCHANGED = 'No se hizo ningún cambio.';
   +export const USE_A_LINK = 'Usá un enlace para copiar.';

    export type FailureReaction =
      | { readonly kind: 'sign-in' }
   @@ -33,6 +34,7 @@ export function reactionTo(
      failure: ApiFailure,
      notFoundMessage: string,
      visibleFields: readonly string[] = [],
   +  withoutMail: string = USE_A_LINK,
    ): FailureReaction {
      const description = describeFailure(failure, visibleFields);
      if (description.signedOut) return { kind: 'sign-in' };
   @@ -45,5 +47,11 @@ export function reactionTo(
        const generalMessages = [failure.message, FORBIDDEN_HINT];
        return { kind: 'show', description: { ...description, generalMessages, offerReload: true } };
      }
   +  if (failure.code === 'mail_unavailable') {
   +    return {
   +      kind: 'show',
   +      description: { ...description, generalMessages: [failure.message, withoutMail] },
   +    };
   +  }
      return { kind: 'show', description };
    }
   ```

6. **Correr** `npm run test:unit -- frontend/src/pages/admin`, en verde, y después `npm run typecheck` y `npm run lint`.
7. **Commit:** `feat(front): el modelo de la administración con correo`.

### Tarea 1.3 · Las specs de los pedidos y del diálogo, en rojo (T030, M)

**Archivos:**

- en `frontend/src/pages/admin/api/`, los stubs de `resendByEmail` y `sendPasswordReset` y `admin-endpoints-mail.spec.ts`;
- en `frontend/src/pages/admin/ui/`, `render-admin.tsx` (con `signInWithMail`) y `action-dialog-mail.spec.tsx`.

1. **Los stubs,** al final de `admin-endpoints.ts`, con `MailedInvitation` sumado al `import type` de `../model/types`:

   ```ts
   export const resendByEmail: (
     client: ApiClient,
     adminId: number,
     invitationId: number,
   ) => Promise<AdminOutcome<MailedInvitation>> = () => {
     throw new Error('not implemented');
   };

   export const sendPasswordReset: (
     client: ApiClient,
     adminId: number,
     userId: number,
   ) => Promise<AdminOutcome<true>> = () => {
     throw new Error('not implemented');
   };
   ```

2. **`render-admin.tsx`,** este diff:

   ```diff
   diff --git a/frontend/src/pages/admin/ui/render-admin.tsx b/frontend/src/pages/admin/ui/render-admin.tsx
   --- a/frontend/src/pages/admin/ui/render-admin.tsx
   +++ b/frontend/src/pages/admin/ui/render-admin.tsx
   @@ -43,6 +43,15 @@ export function signInAs(user: PublishedUser = OLGA): void {
      });
    }

   +export function signInWithMail(user: PublishedUser = OLGA): void {
   +  sessionStore.setState({
   +    status: 'signed-in',
   +    user,
   +    features: { passwordReset: true, registration: false },
   +    contentVersion: null,
   +  });
   +}
   +
    export function renderWithFetch(element: ReactElement, fetch: FetchLike): AdminUserEvent {
      const user = userEvent.setup();
      const client = createApiClient({ fetch, readCookies: () => 'XSRF-TOKEN=abc' });
   ```

3. **`admin-endpoints-mail.spec.ts`.** Los métodos, las rutas, los cuerpos y los encabezados son los del contrato de C3c:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { createApiClient } from '../../../shared/api/http';
   import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
   import { invite, resendByEmail, sendPasswordReset } from './admin-endpoints';

   const OLGA_ID = 1;

   function clientWith(replies: readonly (FakeReply | 'network-error')[]) {
     const fake = createFakeFetch(replies);
     const client = createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' });
     return { client, calls: fake.calls };
   }

   describe('the requests with mail', () => {
     it('invites by mail when asked to', async () => {
       const { client, calls } = clientWith([{ status: 200, json: { data: [] } }]);
       await invite(client, OLGA_ID, ['ana@x.com'], 'student', 'email');
       expect(calls[0]?.body).toEqual({ emails: ['ana@x.com'], role: 'student', delivery: 'email' });
     });

     it('resends by mail and reads the answer without a link', async () => {
       const data = {
         id: 5,
         email: 'beto@x.com',
         role: 'student',
         delivery: 'email',
         expiresAt: '2026-10-12T12:00:00.000Z',
       };
       const { client, calls } = clientWith([{ status: 200, json: { data } }]);
       expect(await resendByEmail(client, OLGA_ID, 5)).toEqual({
         ok: true,
         value: { email: 'beto@x.com', expiresAt: '2026-10-12T12:00:00.000Z' },
       });
       expect(calls[0]).toMatchObject({
         method: 'POST',
         path: '/api/admin/invitations/5/resend',
         body: { delivery: 'email' },
       });
       expect(calls[0]?.headers['x-taller-user']).toBe('1');
     });

     it('passes the 429 of the cap with its Retry-After', async () => {
       const { client } = clientWith([
         {
           status: 429,
           headers: { 'Retry-After': '3600' },
           json: {
             message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
             code: 'too_many_requests',
           },
         },
       ]);
       expect(await resendByEmail(client, OLGA_ID, 5)).toMatchObject({
         ok: false,
         failure: { kind: 'response', status: 429, retryAfterSeconds: 3600 },
       });
     });

     it('asks for a reset link without a body and accepts the 202 without a body', async () => {
       const { client, calls } = clientWith([{ status: 202 }]);
       expect(await sendPasswordReset(client, OLGA_ID, 12)).toEqual({ ok: true, value: true });
       expect(calls[0]).toMatchObject({
         method: 'POST',
         path: '/api/admin/users/12/password-reset',
         body: undefined,
       });
       expect(calls[0]?.headers['x-taller-user']).toBe('1');
     });
   });
   ```

4. **`action-dialog-mail.spec.tsx`.** Fija las Review Focus 2 y 5:

   ```tsx
   import { screen } from '@testing-library/react';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import type { ActionResult, DialogStart } from '../model/types';
   import ActionDialog from './ActionDialog';
   import { OLGA, renderAdmin, signInWithMail, stubDialogs } from './render-admin';

   const MAIL_UNAVAILABLE = {
     kind: 'failed',
     failure: {
       kind: 'response',
       status: 503,
       code: 'mail_unavailable',
       message: 'El taller no puede mandar correos por ahora.',
       fieldErrors: {},
       retryAfterSeconds: 3600,
     },
   } as const satisfies ActionResult;
   const LOCKED = {
     kind: 'failed',
     failure: {
       kind: 'response',
       status: 423,
       code: 'password_confirmation_required',
       message: 'Confirmá tu contraseña para continuar.',
       fieldErrors: {},
       retryAfterSeconds: null,
     },
   } as const satisfies ActionResult;
   const RESEND: DialogStart = {
     kind: 'confirm',
     title: '¿Reenviar por correo la invitación de root@x.com?',
     confirmation: {
       body: ['El enlace anterior deja de valer, y le mandamos uno nuevo por correo.'],
       confirmLabel: 'Reenviar por correo',
       pendingLabel: 'Generando…',
     },
   };

   beforeAll(stubDialogs);
   beforeEach(() => signInWithMail());

   describe('the dialog without mail', () => {
     it('shows the message of a 503 with the way of the link and lets the action be sent again', async () => {
       const send = vi.fn<() => Promise<ActionResult>>().mockResolvedValue(MAIL_UNAVAILABLE);
       const { user } = renderAdmin(
         <ActionDialog
           adminId={OLGA.id}
           start={RESEND}
           notFoundMessage=""
           send={send}
           onFinish={vi.fn()}
         />,
         [],
       );
       await user.click(screen.getByRole('button', { name: 'Reenviar por correo' }));
       const alert = screen.getByRole('alert');
       expect(alert).toHaveTextContent('El taller no puede mandar correos por ahora.');
       expect(alert).toHaveTextContent('Usá un enlace para copiar.');
       expect(screen.getByRole('button', { name: 'Reenviar por correo' })).toBeEnabled();
     });

     it('uses the way it receives when the link cannot be copied from here', async () => {
       const send = vi.fn<() => Promise<ActionResult>>().mockResolvedValue(MAIL_UNAVAILABLE);
       const { user } = renderAdmin(
         <ActionDialog
           adminId={OLGA.id}
           start={RESEND}
           notFoundMessage=""
           withoutMail="Generá el enlace con la consola."
           send={send}
           onFinish={vi.fn()}
         />,
         [],
       );
       await user.click(screen.getByRole('button', { name: 'Reenviar por correo' }));
       expect(screen.getByRole('alert')).toHaveTextContent('Generá el enlace con la consola.');
       expect(screen.getByRole('alert')).not.toHaveTextContent('Usá un enlace para copiar.');
     });

     it('shows a 503 after the password once, without asking for it again nor repeating', async () => {
       const send = vi
         .fn<() => Promise<ActionResult>>()
         .mockResolvedValueOnce(LOCKED)
         .mockResolvedValueOnce(MAIL_UNAVAILABLE);
       const { user } = renderAdmin(
         <ActionDialog
           adminId={OLGA.id}
           start={RESEND}
           notFoundMessage=""
           send={send}
           onFinish={vi.fn()}
         />,
         [{ status: 201, json: {} }],
       );
       await user.click(screen.getByRole('button', { name: 'Reenviar por correo' }));
       await user.type(screen.getByLabelText('Tu contraseña'), 'una frase larga para el taller');
       await user.click(screen.getByRole('button', { name: 'Confirmar' }));
       expect(await screen.findByRole('alert')).toHaveTextContent(
         'El taller no puede mandar correos por ahora.',
       );
       expect(screen.queryByLabelText('Tu contraseña')).toBeNull();
       expect(send).toHaveBeenCalledTimes(2);
     });
   });
   ```

5. **Correr** `npm run test:unit -- frontend/src/pages/admin`. En rojo, 5:
   - las cuatro de `admin-endpoints-mail.spec.ts`;
   - «uses the way it receives when the link cannot be copied from here».

   Las otras dos de `action-dialog-mail.spec.tsx` ya pasan con T029 y quedan como guarda: el 503 no arma la espera, y el 503 después de la contraseña no repite.
6. **Commit:** `test(front): specs de los pedidos con correo y del diálogo sin correo, en rojo`.

### Tarea 1.4 · Los pedidos con correo y el camino sin correo en el diálogo (T031, M)

**Archivos:** `frontend/src/pages/admin/api/admin-endpoints.ts`, `frontend/src/pages/admin/ui/ActionDialog.tsx` y `frontend/src/pages/admin/ui/use-action-dialog.ts`.

1. **`admin-endpoints.ts`.** Primero se borran los dos stubs de T030 y se vuelve atrás el import que sumó. Después, este diff sobre el archivo de F12a:

   ```diff
   diff --git a/frontend/src/pages/admin/api/admin-endpoints.ts b/frontend/src/pages/admin/api/admin-endpoints.ts
   --- a/frontend/src/pages/admin/api/admin-endpoints.ts
   +++ b/frontend/src/pages/admin/api/admin-endpoints.ts
   @@ -7,6 +7,7 @@ import {
      parseDeletion,
      parseInviteEntries,
      parseIssuedLink,
   +  parseMailedInvitation,
      parsePage,
    } from '../model/parse-admin';
    import type {
   @@ -14,10 +15,12 @@ import type {
      AdminOutcome,
      AdminUser,
      Deletion,
   +  Delivery,
      InvitationQuery,
      InviteEntry,
      IssuedLink,
      ListPage,
   +  MailedInvitation,
      UserChange,
      UserQuery,
    } from '../model/types';
   @@ -106,8 +109,9 @@ export async function invite(
      adminId: number,
      emails: readonly string[],
      role: AccountRole,
   +  delivery: Delivery = 'link',
    ): Promise<AdminOutcome<readonly InviteEntry[]>> {
   -  const body = { emails, role, delivery: 'link' };
   +  const body = { emails, role, delivery };
      const result = await client.send('POST', '/api/admin/invitations', body, { asUser: adminId });
      return decode(result, parseInviteEntries);
    }
   @@ -122,6 +126,26 @@ export async function resendInvitation(
      return decode(result, dataOf(parseIssuedLink));
    }

   +export async function resendByEmail(
   +  client: ApiClient,
   +  adminId: number,
   +  invitationId: number,
   +): Promise<AdminOutcome<MailedInvitation>> {
   +  const path = `/api/admin/invitations/${invitationId}/resend`;
   +  const result = await client.send('POST', path, { delivery: 'email' }, { asUser: adminId });
   +  return decode(result, dataOf(parseMailedInvitation));
   +}
   +
   +export async function sendPasswordReset(
   +  client: ApiClient,
   +  adminId: number,
   +  userId: number,
   +): Promise<AdminOutcome<true>> {
   +  const path = `/api/admin/users/${userId}/password-reset`;
   +  const result = await client.send('POST', path, undefined, { asUser: adminId });
   +  return decode(result, accepted);
   +}
   +
    export async function revokeInvitation(
      client: ApiClient,
      adminId: number,
   ```

2. **`ActionDialog.tsx`,** este diff:

   ```diff
   diff --git a/frontend/src/pages/admin/ui/ActionDialog.tsx b/frontend/src/pages/admin/ui/ActionDialog.tsx
   --- a/frontend/src/pages/admin/ui/ActionDialog.tsx
   +++ b/frontend/src/pages/admin/ui/ActionDialog.tsx
   @@ -21,6 +21,7 @@ interface ActionDialogProps {
      readonly adminId: number;
      readonly start: DialogStart;
      readonly notFoundMessage: string;
   +  readonly withoutMail?: string;
      send(): Promise<ActionResult>;
      onFinish(end: DialogEnd): void;
    }
   @@ -45,7 +46,14 @@ function isOwn(event: SyntheticEvent<HTMLDialogElement>): boolean {
      return event.target === event.currentTarget;
    }

   -const ActionDialog = ({ adminId, start, notFoundMessage, send, onFinish }: ActionDialogProps) => {
   +const ActionDialog = ({
   +  adminId,
   +  start,
   +  notFoundMessage,
   +  withoutMail,
   +  send,
   +  onFinish,
   +}: ActionDialogProps) => {
      const dialog = useRef<HTMLDialogElement>(null);
      const heading = useRef<HTMLHeadingElement>(null);
      const finished = useRef(false);
   @@ -73,7 +81,7 @@ const ActionDialog = ({ adminId, start, notFoundMessage, send, onFinish }: Actio
          setStep({ kind: 'password' });
          return;
        }
   -    const reaction = reactionTo(result.failure, notFoundMessage);
   +    const reaction = reactionTo(result.failure, notFoundMessage, [], withoutMail);
        if (reaction.kind === 'sign-in') return finish('signed-out');
        if (reaction.kind === 'reload') return reloadDocument();
        setFailure(reaction.description);
   ```

3. **`use-action-dialog.ts`,** este diff:

   ```diff
   diff --git a/frontend/src/pages/admin/ui/use-action-dialog.ts b/frontend/src/pages/admin/ui/use-action-dialog.ts
   --- a/frontend/src/pages/admin/ui/use-action-dialog.ts
   +++ b/frontend/src/pages/admin/ui/use-action-dialog.ts
   @@ -7,6 +7,7 @@ import type { ActionResult, DialogEnd, DialogStart } from '../model/types';
    export interface DialogRequest {
      readonly start: DialogStart;
      readonly notFoundMessage: string;
   +  readonly withoutMail?: string;
      send(): Promise<ActionResult>;
    }

   ```

4. **Correr** `npm run test:unit -- frontend/src/pages/admin`, en verde, y después `npm run typecheck` y `npm run lint`.
5. **Commit:** `feat(front): los pedidos con correo y el camino sin correo en el diálogo`.

### Tarea 1.5 · El doble con la sesión con correo, los datos y el Page Object (T032, E)

**Archivos:** `qa/e2e/fixtures/api-double.ts`, `qa/e2e/lib/admin-contract.ts`, `qa/e2e/pages/admin.ts` y `specs/023-f12-administracion/contracts/admin-page.md`.

**Produce:** `api.features`, `WITH_MAIL`, `adminError('mail_unavailable')` y `admin.invite(emails, role, delivery)`, que usa T038.

1. **`api-double.ts`,** este diff. El valor por omisión es el del `FEATURES` fijo de hoy, así que ningún escenario de la base cambia (R11). Si T027 encontró `features` ya puesto por F11c, este paso se salta:

   ```diff
   diff --git a/qa/e2e/fixtures/api-double.ts b/qa/e2e/fixtures/api-double.ts
   --- a/qa/e2e/fixtures/api-double.ts
   +++ b/qa/e2e/fixtures/api-double.ts
   @@ -24,8 +24,12 @@ export interface ApiReply {

    export type ApiHandler = (call: ApiCall) => ApiReply | Promise<ApiReply>;

   +export interface SessionFeatures {
   +  passwordReset: boolean;
   +  registration: boolean;
   +}
   +
    const MODIFYING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
   -const FEATURES = { passwordReset: false, registration: false };
    const META = resolve(import.meta.dirname, '../../../build/curriculum.meta.json');
    const CONTENT_VERSION = (
      JSON.parse(readFileSync(META, 'utf8')) as { documentHash: string }
   @@ -53,6 +57,7 @@ function nameOf(body: unknown): string {
    export class ApiDouble {
      account: PublishedAccount | null;
      signInAccount: PublishedAccount = STUDENT;
   +  features: SessionFeatures = { passwordReset: false, registration: false };
      readonly calls: ApiCall[] = [];
      private readonly unhandled: string[] = [];
      private readonly handlers = new Map<ApiRoute, ApiHandler>();
   @@ -144,7 +149,7 @@ export class ApiDouble {
          headers: { 'Cache-Control': 'no-store' },
          json: {
            user: this.account,
   -        features: FEATURES,
   +        features: this.features,
            contentVersion: CONTENT_VERSION,
            catalogs: [],
          },
   ```

2. **`admin-contract.ts`,** este diff. El mensaje es el de `backend/api/lang/es/api.php`:

   ```diff
   diff --git a/qa/e2e/lib/admin-contract.ts b/qa/e2e/lib/admin-contract.ts
   --- a/qa/e2e/lib/admin-contract.ts
   +++ b/qa/e2e/lib/admin-contract.ts
   @@ -37,8 +37,11 @@ export const ADMIN_MESSAGES = {
      too_many_requests: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
      unauthenticated: 'Iniciá sesión para continuar.',
      not_found: 'No existe lo que pedís.',
   +  mail_unavailable: 'El taller no puede mandar correos por ahora.',
    } as const;

   +export const WITH_MAIL = { passwordReset: true, registration: false };
   +
    export const DELETION_MESSAGE =
      'Se está borrando la cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.';

   ```

3. **`pages/admin.ts`,** este diff:

   ```diff
   diff --git a/qa/e2e/pages/admin.ts b/qa/e2e/pages/admin.ts
   --- a/qa/e2e/pages/admin.ts
   +++ b/qa/e2e/pages/admin.ts
   @@ -50,10 +50,18 @@ export class AdminPage {
        await this.button(name).click();
      }

   -  async invite(emails: readonly string[], role: 'Alumno' | 'Admin' = 'Alumno'): Promise<void> {
   +  async invite(
   +    emails: readonly string[],
   +    role: 'Alumno' | 'Admin' = 'Alumno',
   +    delivery?: 'Por correo' | 'Enlace para copiar',
   +  ): Promise<void> {
        await this.openSection('Invitaciones');
        await this.inviteForm().getByLabel('Emails', { exact: true }).fill(emails.join('\n'));
        await this.inviteForm().getByLabel('Rol', { exact: true }).selectOption({ label: role });
   +    if (delivery !== undefined)
   +      await this.inviteForm()
   +        .getByLabel('Entrega', { exact: true })
   +        .selectOption({ label: delivery });
        await this.inviteForm().getByRole('button', { name: 'Crear las invitaciones' }).click();
      }

   ```

4. **`contracts/admin-page.md`,** en «`qa/e2e`: el doble, el Page Object y los datos»:
   - en el bloque de `api-double.ts`, la interfaz `SessionFeatures` y el campo `features` de `ApiDouble`, con su valor por omisión;
   - la firma nueva de `invite`;
   - `mail_unavailable` en `ADMIN_MESSAGES` y la constante `WITH_MAIL`.
5. **Correr** `npm run typecheck` y `npm run build && E2E_PORT=4195 npm run test:e2e`: toda la red, en verde y sin cambios.
6. **Commit:** `test(qa): la sesión con correo en el doble de la API y la entrega en el Page Object`.

### Tarea 1.6 · La compuerta de U1 (T033, K)

- **Desde S1:** M y E entregaron.
- **La compuerta de 0.2,** con `npm run test:unit` en verde: las 79 specs de F12a y las 15 nuevas de U1.
- **El PR:** `feat(front): administration model, requests and test double with mail (F12b U1)`, contra `f12b/base`.

**Reversión de U1:** se revierten T032, T031, T030, T029 y T028, en ese orden.

## 2. U2 · «Invitaciones» y «Cuentas» con correo, y el E2E (onda 2: I, L y E; onda 2b: K)

**Cubre:**

- **los requisitos:** FR-044 a FR-049, y FR-050 a FR-055 y FR-059 sobre lo suyo;
- **los criterios:** SC-003 (las filas de F12b), SC-006 y SC-008;
- **la historia 7,** en sus cinco escenarios, de punta a punta.

**Entrega:** la administración con correo. Sin correo, sigue como en F12a.

### Tarea 2.1 · Las specs de «Invitaciones» con correo, en rojo (T034, I, desde S1)

**Archivos:** el stub de `frontend/src/pages/admin/ui/DeliveryField.tsx` e `invitations-mail.spec.tsx`.

1. **El stub de `DeliveryField.tsx`:**

   ```tsx
   import type { FunctionComponent } from 'react';
   import type { UseFormRegisterReturn } from 'react-hook-form';

   interface DeliveryFieldProps {
     readonly registration: UseFormRegisterReturn;
   }

   const DeliveryField: FunctionComponent<DeliveryFieldProps> = () => {
     throw new Error('not implemented');
   };

   export default DeliveryField;
   ```

2. **`invitations-mail.spec.tsx`.** Cubre la historia 7 en sus escenarios 2, 3 y 5, y las Review Focus 1, 2 y 3:

   ```tsx
   import { screen, within } from '@testing-library/react';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { adminInvitationBodyFactory, pageBody } from '../model/admin.factory';
   import InvitationsSection from './InvitationsSection';
   import { OLGA, pathsOf, renderAdmin, signInWithMail, stubDialogs } from './render-admin';

   const NOT_SENT = adminInvitationBodyFactory.build({
     id: 8,
     email: 'beto@x.com',
     delivery: 'email',
     sendFailedAt: '2026-10-06T12:00:00.000Z',
   });
   const ON_ITS_WAY = adminInvitationBodyFactory.build({
     id: 9,
     email: 'carla@x.com',
     delivery: 'email',
   });
   const BY_LINK = adminInvitationBodyFactory.build({ id: 10, email: 'dani@x.com' });
   const EXPIRES_AT = '2026-10-12T12:00:00.000Z';
   const MAIL_UNAVAILABLE = {
     status: 503,
     headers: { 'Retry-After': '3600' },
     json: { message: 'El taller no puede mandar correos por ahora.', code: 'mail_unavailable' },
   };

   function inviteForm() {
     return within(screen.getByRole('form', { name: 'Invitar' }));
   }

   function renderSection(replies: Parameters<typeof renderAdmin>[1]) {
     return renderAdmin(<InvitationsSection ownId={OLGA.id} />, replies);
   }

   beforeAll(stubDialogs);
   beforeEach(() => signInWithMail());

   describe('inviting with mail', () => {
     it('offers the delivery, by mail first, and drops the texts of the workshop without mail', async () => {
       renderSection([{ status: 200, json: pageBody([]) }]);
       expect(inviteForm().getByLabelText('Entrega')).toHaveValue('email');
       expect(
         screen.queryByText(
           'El taller todavía no manda correos: copiá cada enlace y entregáselo a su persona.',
         ),
       ).toBeNull();
       expect(screen.queryByText(/taller:password-reset-link/)).toBeNull();
     });

     it('invites by mail and says that each invitation goes by mail, without links', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([]) },
         {
           status: 200,
           json: {
             data: [
               { email: 'beto@x.com', result: 'created', expiresAt: EXPIRES_AT },
               { email: 'ana@x.com', result: 'rate_limited' },
             ],
           },
         },
         { status: 200, json: pageBody([]) },
       ]);
       await user.type(screen.getByLabelText('Emails'), 'beto@x.com ana@x.com');
       await user.click(screen.getByRole('button', { name: 'Crear las invitaciones' }));
       expect(calls[1]?.body).toEqual({
         emails: ['beto@x.com', 'ana@x.com'],
         role: 'student',
         delivery: 'email',
       });
       const result = screen.getByRole('dialog', { name: 'Resultado' });
       expect(result).toHaveTextContent(
         'beto@x.com · Invitación creada. Le llega por correo. Vence el',
       );
       expect(result).toHaveTextContent(
         'ana@x.com · No salió: llegaste al tope de 300 correos por día. Probá mañana o usá un enlace.',
       );
       expect(within(result).queryByRole('textbox')).toBeNull();
       expect(result).not.toHaveTextContent('Copiá los enlaces ahora');
     });

     it('invites by link when asked to', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([]) },
         { status: 200, json: { data: [] } },
         { status: 200, json: pageBody([]) },
       ]);
       await user.type(screen.getByLabelText('Emails'), 'beto@x.com');
       await user.selectOptions(inviteForm().getByLabelText('Entrega'), 'link');
       await user.click(screen.getByRole('button', { name: 'Crear las invitaciones' }));
       expect(calls[1]?.body).toMatchObject({ delivery: 'link' });
     });

     it('shows the 503 with the way of the link, keeps the emails and creates nothing', async () => {
       const { user } = renderSection([{ status: 200, json: pageBody([]) }, MAIL_UNAVAILABLE]);
       await user.type(screen.getByLabelText('Emails'), 'beto@x.com');
       await user.click(screen.getByRole('button', { name: 'Crear las invitaciones' }));
       const alert = await inviteForm().findByRole('alert');
       expect(alert).toHaveTextContent('El taller no puede mandar correos por ahora.');
       expect(alert).toHaveTextContent('Usá un enlace para copiar.');
       expect(screen.queryByRole('dialog', { name: 'Resultado' })).toBeNull();
       expect(screen.getByLabelText('Emails')).toHaveValue('beto@x.com');
       expect(screen.getByRole('button', { name: 'Crear las invitaciones' })).toBeEnabled();
     });
   });

   describe('the list with mail', () => {
     it('says whether each mail went out and offers to resend by mail or to turn into a link', async () => {
       renderSection([{ status: 200, json: pageBody([NOT_SENT, ON_ITS_WAY, BY_LINK]) }]);
       const table = await screen.findByRole('table', { name: 'Invitaciones' });
       const beto = within(table).getByRole('row', { name: /beto@x\.com/ });
       expect(beto).toHaveTextContent('No salió: reenviala o pasala a enlace.');
       expect(
         within(beto)
           .getAllByRole('button')
           .map((button) => button.textContent),
       ).toEqual([
         'Reenviar por correo la invitación de beto@x.com',
         'Pasar a enlace la invitación de beto@x.com',
         'Revocar la invitación de beto@x.com',
       ]);
       expect(within(table).getByRole('row', { name: /carla@x\.com/ })).toHaveTextContent(
         'Por correo, en camino. Si no sale en 24 horas, lo vas a ver acá.',
       );
       expect(within(table).getByRole('row', { name: /dani@x\.com/ })).not.toHaveTextContent(
         'Por correo',
       );
     });

     it('resends by mail, announces it and asks for the list again', async () => {
       const data = {
         id: 8,
         email: 'beto@x.com',
         role: 'student',
         delivery: 'email',
         expiresAt: EXPIRES_AT,
       };
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([NOT_SENT]) },
         { status: 200, json: { data } },
         { status: 200, json: pageBody([NOT_SENT]) },
       ]);
       await user.click(
         await screen.findByRole('button', {
           name: 'Reenviar por correo la invitación de beto@x.com',
         }),
       );
       await user.click(screen.getByRole('button', { name: 'Reenviar por correo' }));
       expect(calls[1]).toMatchObject({
         path: '/api/admin/invitations/8/resend',
         body: { delivery: 'email' },
       });
       expect(screen.queryByRole('dialog')).toBeNull();
       expect(screen.getByRole('status')).toHaveTextContent(
         'Reenviamos la invitación de beto@x.com. Le llega por correo.',
       );
       await vi.waitFor(() => expect(pathsOf(calls)[2]).toMatch(/^GET \/api\/admin\/invitations\?/));
     });

     it('turns an invitation into a link and shows the link once', async () => {
       const data = {
         id: 8,
         email: 'beto@x.com',
         role: 'student',
         delivery: 'link',
         expiresAt: EXPIRES_AT,
         url: 'http://localhost:8080/#invitacion=b',
       };
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([NOT_SENT]) },
         { status: 200, json: { data } },
         { status: 200, json: pageBody([]) },
       ]);
       await user.click(
         await screen.findByRole('button', { name: 'Pasar a enlace la invitación de beto@x.com' }),
       );
       await user.click(screen.getByRole('button', { name: 'Pasar a enlace' }));
       expect(calls[1]?.body).toEqual({ delivery: 'link' });
       expect(screen.getByRole('textbox', { name: 'Enlace de beto@x.com' })).toHaveValue(data.url);
     });

     it('keeps the confirmation waiting when the cap stops a resend by mail, and says nothing went out', async () => {
       const { user } = renderSection([
         { status: 200, json: pageBody([NOT_SENT]) },
         {
           status: 429,
           headers: { 'Retry-After': '3600' },
           json: {
             message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
             code: 'too_many_requests',
           },
         },
       ]);
       await user.click(
         await screen.findByRole('button', {
           name: 'Reenviar por correo la invitación de beto@x.com',
         }),
       );
       await user.click(screen.getByRole('button', { name: 'Reenviar por correo' }));
       expect(screen.getByRole('alert')).toHaveTextContent('Podés volver a intentar en 1 hora.');
       expect(screen.getByRole('button', { name: 'Reenviar por correo' })).toBeDisabled();
       expect(screen.getByRole('status')).toBeEmptyDOMElement();
     });
   });
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/admin/ui/invitations-mail.spec.tsx`. En rojo, 7 de 8, porque las secciones de F12a no conocen el correo. «shows the 503 with the way of the link, keeps the emails and creates nothing» ya pasa con T029 y queda como guarda.
4. **Commit:** `test(front): specs de las invitaciones con correo, en rojo`.

### Tarea 2.2 · «Invitaciones» con correo (T035, I)

**Archivos:** en `frontend/src/pages/admin/ui/`, `DeliveryField.tsx`, `InviteForm.tsx`, `InvitationsTable.tsx` e `InvitationsSection.tsx`.

1. **`DeliveryField.tsx`,** entero (R10):

   ```tsx
   import { useId } from 'react';
   import type { UseFormRegisterReturn } from 'react-hook-form';
   import { DELIVERY_OPTIONS } from '../model/mail';

   interface DeliveryFieldProps {
     readonly registration: UseFormRegisterReturn;
   }

   const DeliveryField = ({ registration }: DeliveryFieldProps) => {
     const id = useId();
     return (
       <div className="form-field">
         <label className="field-label" htmlFor={id}>
           Entrega
         </label>
         <select id={id} className="form-input" {...registration}>
           {DELIVERY_OPTIONS.map((option) => (
             <option key={option.value} value={option.value}>
               {option.label}
             </option>
           ))}
         </select>
       </div>
     );
   };

   export default DeliveryField;
   ```

2. **`InviteForm.tsx`,** este diff. Sin correo, el campo no existe y `defaultValues` manda `delivery: "link"`:

   ```diff
   diff --git a/frontend/src/pages/admin/ui/InviteForm.tsx b/frontend/src/pages/admin/ui/InviteForm.tsx
   --- a/frontend/src/pages/admin/ui/InviteForm.tsx
   +++ b/frontend/src/pages/admin/ui/InviteForm.tsx
   @@ -1,6 +1,7 @@
    import { useId, useRef } from 'react';
    import { useForm } from 'react-hook-form';
   -import type { AccountRole } from '../../../entities/session';
   +import { useStore } from 'zustand';
   +import { sessionStore, type AccountRole } from '../../../entities/session';
    import { useApiClient, type ApiFailure } from '../../../shared/api/http';
    import { reloadDocument } from '../../../shared/lib/reload-document';
    import {
   @@ -12,13 +13,16 @@ import {
    } from '../../../shared/ui/form';
    import { invite } from '../api/admin-endpoints';
    import { checkEmailCount, emailMessages, isEmailsField, splitEmails } from '../model/emails';
   +import { NO_MAIL_YET, selectMailAvailable } from '../model/mail';
    import { needsPassword, reactionTo } from '../model/react-to-failure';
   -import type { AdminOutcome, InviteEntry } from '../model/types';
   +import type { AdminOutcome, Delivery, InviteEntry } from '../model/types';
   +import DeliveryField from './DeliveryField';
    import EmailsField from './EmailsField';

    interface InviteValues {
      emails: string;
      role: AccountRole;
   +  delivery: Delivery;
    }

    export type SendInvitations = () => Promise<AdminOutcome<readonly InviteEntry[]>>;
   @@ -38,6 +42,7 @@ function emailFieldsOf(failure: ApiFailure): string[] {

    const InviteForm = ({ adminId, onInvited, onPasswordRequired, onSignedOut }: InviteFormProps) => {
      const client = useApiClient();
   +  const mailAvailable = useStore(sessionStore, selectMailAvailable);
      const countdown = useRetryCountdown();
      const headingId = useId();
      const roleId = useId();
   @@ -49,12 +54,12 @@ const InviteForm = ({ adminId, onInvited, onPasswordRequired, onSignedOut }: Inv
        formState: { errors, isSubmitting },
      } = useForm<InviteValues>({
        criteriaMode: 'all',
   -    defaultValues: { emails: '', role: 'student' },
   +    defaultValues: { emails: '', role: 'student', delivery: mailAvailable ? 'email' : 'link' },
      });

   -  const submit = useGuardedSubmit(async ({ emails, role }: InviteValues) => {
   +  const submit = useGuardedSubmit(async ({ emails, role, delivery }: InviteValues) => {
        const sent = splitEmails(emails);
   -    const send: SendInvitations = () => invite(client, adminId, sent, role);
   +    const send: SendInvitations = () => invite(client, adminId, sent, role, delivery);
        const outcome = await send();
        if (outcome.ok) return onInvited(outcome.value, submitButton.current);
        if (needsPassword(outcome.failure)) return onPasswordRequired(send, submitButton.current);
   @@ -75,9 +80,7 @@ const InviteForm = ({ adminId, onInvited, onPasswordRequired, onSignedOut }: Inv
          onSubmit={handleSubmit(submit)}
        >
          <h3 id={headingId}>Invitar</h3>
   -      <p className="form-hint">
   -        El taller todavía no manda correos: copiá cada enlace y entregáselo a su persona.
   -      </p>
   +      {mailAvailable ? null : <p className="form-hint">{NO_MAIL_YET}</p>}
          <ServerError
            messages={messagesOf(errors.root?.serverError)}
            takeFocus={errors.emails === undefined}
   @@ -103,6 +106,7 @@ const InviteForm = ({ adminId, onInvited, onPasswordRequired, onSignedOut }: Inv
              Una invitación de admin vence a las 48 horas; la de un alumno, a los 7 días.
            </p>
          </div>
   +      {mailAvailable ? <DeliveryField registration={register('delivery')} /> : null}
          <div className="form-actions">
            <button
              ref={submitButton}
   ```

3. **`InvitationsTable.tsx`,** entero. La marca del correo va debajo del email, y los botones salen de `invitationActionsFor` (R3 y R9):

   ```tsx
   import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
   import {
     invitationActionsFor,
     invitationTexts,
     type InvitationAction,
   } from '../model/invitation-texts';
   import { ROLE_LABELS } from '../model/labels';
   import { mailStatusText } from '../model/mail';
   import type { AdminInvitation } from '../model/types';

   interface InvitationsTableProps {
     readonly titleId: string;
     readonly invitations: readonly AdminInvitation[];
     readonly busy: boolean;
     readonly mailAvailable: boolean;
     onAction(action: InvitationAction, invitation: AdminInvitation, opener: HTMLButtonElement): void;
   }

   function expiry({ expired, expiresAt }: AdminInvitation): string {
     return expired ? 'Vencida' : formatLocalDateTime(expiresAt);
   }

   const InvitationsTable = ({
     titleId,
     invitations,
     busy,
     mailAvailable,
     onAction,
   }: InvitationsTableProps) => (
     <div
       className="admin-table-scroll"
       role="region"
       tabIndex={0}
       aria-labelledby={titleId}
       aria-busy={busy}
     >
       <table aria-labelledby={titleId}>
         <thead>
           <tr>
             <th scope="col">Email</th>
             <th scope="col">Rol</th>
             <th scope="col">Vence</th>
             <th scope="col">Creada por</th>
             <th scope="col">Acciones</th>
           </tr>
         </thead>
         <tbody>
           {invitations.map((invitation) => {
             const mailStatus = mailStatusText(invitation);
             return (
               <tr key={invitation.id}>
                 <th scope="row">
                   {invitation.email}
                   {mailStatus === null ? null : <span className="admin-mark">{mailStatus}</span>}
                 </th>
                 <td>
                   {ROLE_LABELS[invitation.role]}
                   {invitation.role === 'admin' && !invitation.expired ? (
                     <span className="admin-mark">Admin pendiente</span>
                   ) : null}
                 </td>
                 <td>{expiry(invitation)}</td>
                 <td>
                   {invitation.invitedBy ?? 'Consola o cuenta borrada'} ·{' '}
                   {formatLocalDateTime(invitation.createdAt)}
                 </td>
                 <td>
                   <div className="admin-row-actions">
                     {invitationActionsFor(mailAvailable).map((action) => (
                       <button
                         key={action}
                         type="button"
                         className="button secondary small"
                         onClick={(event) => onAction(action, invitation, event.currentTarget)}
                       >
                         {invitationTexts(action, invitation.email).button}
                       </button>
                     ))}
                   </div>
                 </td>
               </tr>
             );
           })}
         </tbody>
       </table>
     </div>
   );

   export default InvitationsTable;
   ```

4. **`InvitationsSection.tsx`,** este diff. «Reenviar» y «Pasar a enlace» usan el mismo pedido, y el aviso del reenvío por correo se escribe sólo con un 2xx:

   ```diff
   diff --git a/frontend/src/pages/admin/ui/InvitationsSection.tsx b/frontend/src/pages/admin/ui/InvitationsSection.tsx
   --- a/frontend/src/pages/admin/ui/InvitationsSection.tsx
   +++ b/frontend/src/pages/admin/ui/InvitationsSection.tsx
   @@ -1,15 +1,23 @@
    import { useCallback, useId, useRef, useState } from 'react';
   +import { useStore } from 'zustand';
   +import { sessionStore } from '../../../entities/session';
    import { useApiClient, type ApiFailure } from '../../../shared/api/http';
   -import { invitationTexts } from '../model/invitation-texts';
   -import { resendInvitation, listInvitations, revokeInvitation } from '../api/admin-endpoints';
   +import {
   +  listInvitations,
   +  resendByEmail,
   +  resendInvitation,
   +  revokeInvitation,
   +} from '../api/admin-endpoints';
    import { signInAgain } from '../lib/recover-session';
    import usePagedList from '../lib/use-paged-list';
   +import { invitationTexts, type InvitationAction } from '../model/invitation-texts';
    import { ROLE_FILTER, STATE_FILTER } from '../model/labels';
   +import { RECOVERY_BY_CONSOLE, resentByEmailNotice, selectMailAvailable } from '../model/mail';
    import { INVITATION_GONE, staleList } from '../model/react-to-failure';
    import type { ActionResult, AdminInvitation, InvitationQuery, InviteEntry } from '../model/types';
    import ActionDialog from './ActionDialog';
    import FilterSelect from './FilterSelect';
   -import InvitationsTable, { type InvitationAction } from './InvitationsTable';
   +import InvitationsTable from './InvitationsTable';
    import InviteForm, { type SendInvitations } from './InviteForm';
    import ListView, { type ListTexts } from './ListView';
    import useActionDialog from './use-action-dialog';
   @@ -20,8 +28,6 @@ interface InvitationsSectionProps {

    const EVERY_INVITATION: InvitationQuery = { page: 1, role: '', state: '' };
    const INVITE_TITLE = 'Crear las invitaciones';
   -const RECOVERY_HINT =
   -  'Para recuperar el acceso de alguien, generá el enlace con la consola del taller (taller:password-reset-link).';
    const TEXTS: ListTexts = {
      loading: 'Cargando las invitaciones…',
      failed: 'No pudimos cargar las invitaciones.',
   @@ -31,6 +37,7 @@ const TEXTS: ListTexts = {

    const InvitationsSection = ({ ownId }: InvitationsSectionProps) => {
      const client = useApiClient();
   +  const mailAvailable = useStore(sessionStore, selectMailAvailable);
      const titleId = useId();
      const title = useRef<HTMLHeadingElement>(null);
      const [notice, setNotice] = useState('');
   @@ -56,6 +63,14 @@ const InvitationsSection = ({ ownId }: InvitationsSectionProps) => {
        };
      };

   +  const mailAgain = async (invitation: AdminInvitation): Promise<ActionResult> => {
   +    const outcome = await resendByEmail(client, ownId, invitation.id);
   +    if (!outcome.ok) return failed(outcome.failure);
   +    list.reload();
   +    setNotice(resentByEmailNotice(outcome.value.email));
   +    return { kind: 'done' };
   +  };
   +
      const revoke = async (invitation: AdminInvitation): Promise<ActionResult> => {
        const outcome = await revokeInvitation(client, ownId, invitation.id);
        if (!outcome.ok) return failed(outcome.failure);
   @@ -65,6 +80,18 @@ const InvitationsSection = ({ ownId }: InvitationsSectionProps) => {
        return { kind: 'done' };
      };

   +  const sendFor = (action: InvitationAction, invitation: AdminInvitation) => {
   +    switch (action) {
   +      case 'resend':
   +      case 'to-link':
   +        return resend(invitation);
   +      case 'resend-by-email':
   +        return mailAgain(invitation);
   +      case 'revoke':
   +        return revoke(invitation);
   +    }
   +  };
   +
      const confirm = (
        action: InvitationAction,
        invitation: AdminInvitation,
   @@ -80,7 +107,7 @@ const InvitationsSection = ({ ownId }: InvitationsSectionProps) => {
          {
            start: { kind: 'confirm', title: texts.title, confirmation },
            notFoundMessage: INVITATION_GONE,
   -        send: () => (action === 'resend' ? resend(invitation) : revoke(invitation)),
   +        send: () => sendFor(action, invitation),
          },
          opener,
        );
   @@ -116,7 +143,7 @@ const InvitationsSection = ({ ownId }: InvitationsSectionProps) => {
            onPasswordRequired={askPassword}
            onSignedOut={() => void signInAgain(ownId)}
          />
   -      <p className="form-hint">{RECOVERY_HINT}</p>
   +      {mailAvailable ? null : <p className="form-hint">{RECOVERY_BY_CONSOLE}</p>}
          <p className="admin-notice" role="status">
            {notice}
          </p>
   @@ -143,6 +170,7 @@ const InvitationsSection = ({ ownId }: InvitationsSectionProps) => {
                titleId={titleId}
                invitations={invitations}
                busy={list.loading}
   +            mailAvailable={mailAvailable}
                onAction={confirm}
              />
            )}
   ```

5. **Correr** `npm run test:unit -- frontend/src/pages/admin`, en verde, y después `npm run typecheck` y `npm run lint`.
6. **Commit:** `feat(front): las invitaciones por correo, con su estado y el paso a enlace`.

### Tarea 2.3 · Las specs de la recuperación de un tercero, en rojo (T036, L, desde S1)

**Archivos:** `frontend/src/pages/admin/model/user-actions-mail.spec.ts` y `frontend/src/pages/admin/ui/accounts-mail.spec.tsx`.

1. **`user-actions-mail.spec.ts`.** Fija la Review Focus 4:

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { AdminUser } from './types';
   import { actionsFor, userActionTexts } from './user-actions';

   const ANA: AdminUser = {
     id: 12,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     status: 'active',
     emailVerified: true,
     createdAt: '2026-10-05T12:00:00.000Z',
   };
   const OWN_ID = 1;

   describe('the actions with mail', () => {
     it('offers the reset link last, only to an active student and only with mail', () => {
       expect(actionsFor(ANA, OWN_ID, true)).toEqual([
         'disable',
         'promote',
         'delete',
         'reset-password',
       ]);
       expect(actionsFor(ANA, OWN_ID)).toEqual(['disable', 'promote', 'delete']);
       expect(actionsFor({ ...ANA, role: 'admin' }, OWN_ID, true)).not.toContain('reset-password');
       expect(actionsFor({ ...ANA, status: 'disabled' }, OWN_ID, true)).not.toContain(
         'reset-password',
       );
     });

     it('names the person in the reset link and says where it goes and for how long', () => {
       expect(userActionTexts('reset-password', ANA)).toMatchObject({
         button: 'Mandarle un enlace para elegir contraseña a Ana Pérez',
         confirm: 'Mandar el enlace',
         pending: 'Mandando…',
         done: 'Le mandamos un enlace a ana@x.com. Vence en 60 minutos.',
       });
     });
   });
   ```

2. **`accounts-mail.spec.tsx`.** Cubre la historia 7 en su escenario 4, y las Review Focus 3 y 4. Los mensajes del 422 son los de `backend/api/lang/es/admin.php`:

   ```tsx
   import { screen, within } from '@testing-library/react';
   import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
   import { adminUserBodyFactory, pageBody } from '../model/admin.factory';
   import AccountsSection from './AccountsSection';
   import { OLGA, renderAdmin, signInAs, signInWithMail, stubDialogs } from './render-admin';

   const ANA = adminUserBodyFactory.build({ id: 12, name: 'Ana Pérez', email: 'ana@x.com' });
   const BETO = adminUserBodyFactory.build({ id: 13, name: 'Beto Gómez', role: 'admin' });
   const DANI = adminUserBodyFactory.build({ id: 15, name: 'Dani Paz', status: 'disabled' });
   const RESET = 'Mandarle un enlace para elegir contraseña a Ana Pérez';
   const TOO_MANY = {
     message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
     code: 'too_many_requests',
   };

   function renderSection(replies: Parameters<typeof renderAdmin>[1]) {
     return renderAdmin(<AccountsSection ownId={OLGA.id} />, replies);
   }

   beforeAll(stubDialogs);
   beforeEach(() => signInWithMail());

   describe('the reset link of a student', () => {
     it('is offered last, only to an active student and only with mail', async () => {
       renderSection([{ status: 200, json: pageBody([ANA, BETO, DANI]) }]);
       const table = await screen.findByRole('table', { name: 'Cuentas del taller, por nombre' });
       const ana = within(table).getByRole('row', { name: /Ana Pérez/ });
       expect(within(ana).getAllByRole('button').at(-1)).toHaveTextContent(RESET);
       for (const name of [/Beto Gómez/, /Dani Paz/]) {
         expect(
           within(within(table).getByRole('row', { name })).queryByRole('button', {
             name: /Mandarle un enlace/,
           }),
         ).toBeNull();
       }
     });

     it('is not offered without mail', async () => {
       signInAs();
       renderSection([{ status: 200, json: pageBody([ANA]) }]);
       await screen.findByRole('table');
       expect(screen.queryByRole('button', { name: RESET })).toBeNull();
     });

     it('goes out after the confirmation, says where and for how long and gives the focus back', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([ANA]) },
         { status: 202 },
       ]);
       await user.click(await screen.findByRole('button', { name: RESET }));
       const dialog = screen.getByRole('dialog', {
         name: '¿Mandarle a Ana Pérez un enlace para elegir contraseña?',
       });
       await user.click(within(dialog).getByRole('button', { name: 'Mandar el enlace' }));
       expect(calls[1]).toMatchObject({ method: 'POST', path: '/api/admin/users/12/password-reset' });
       expect(calls[1]?.headers['x-taller-user']).toBe('1');
       expect(screen.getByRole('status')).toHaveTextContent(
         'Le mandamos un enlace a ana@x.com. Vence en 60 minutos.',
       );
       expect(screen.getByRole('button', { name: RESET })).toHaveFocus();
     });

     it('never says that the link went out when the server waits 60 seconds', async () => {
       const { user } = renderSection([
         { status: 200, json: pageBody([ANA]) },
         { status: 429, headers: { 'Retry-After': '45' }, json: TOO_MANY },
       ]);
       await user.click(await screen.findByRole('button', { name: RESET }));
       await user.click(screen.getByRole('button', { name: 'Mandar el enlace' }));
       expect(screen.getByRole('alert')).toHaveTextContent('Podés volver a intentar en 45 segundos.');
       expect(screen.getByRole('button', { name: 'Mandar el enlace' })).toBeDisabled();
       expect(screen.getByRole('status')).toBeEmptyDOMElement();
     });

     it('explains a 422 of the server and asks for the page again', async () => {
       const { user, calls } = renderSection([
         { status: 200, json: pageBody([ANA]) },
         {
           status: 422,
           json: {
             message: 'Hay datos que corregir.',
             code: 'validation_failed',
             errors: { user: ['Sólo se puede recuperar el acceso de una cuenta activa.'] },
           },
         },
         { status: 200, json: pageBody([{ ...ANA, status: 'disabled' }]) },
       ]);
       await user.click(await screen.findByRole('button', { name: RESET }));
       await user.click(screen.getByRole('button', { name: 'Mandar el enlace' }));
       expect(screen.getByRole('alert')).toHaveTextContent(
         'Sólo se puede recuperar el acceso de una cuenta activa.',
       );
       await vi.waitFor(() => expect(calls).toHaveLength(3));
       expect(calls[2]?.method).toBe('GET');
     });

     it('points to the console when the workshop cannot send mail', async () => {
       const { user } = renderSection([
         { status: 200, json: pageBody([ANA]) },
         {
           status: 503,
           headers: { 'Retry-After': '3600' },
           json: { message: 'El taller no puede mandar correos por ahora.', code: 'mail_unavailable' },
         },
       ]);
       await user.click(await screen.findByRole('button', { name: RESET }));
       await user.click(screen.getByRole('button', { name: 'Mandar el enlace' }));
       const alert = screen.getByRole('alert');
       expect(alert).toHaveTextContent('El taller no puede mandar correos por ahora.');
       expect(alert).toHaveTextContent(
         'Para recuperar el acceso de alguien, generá el enlace con la consola del taller (taller:password-reset-link).',
       );
       expect(alert).not.toHaveTextContent('Usá un enlace para copiar.');
     });
   });
   ```

3. **Correr** `npm run test:unit -- frontend/src/pages/admin/model/user-actions-mail.spec.ts frontend/src/pages/admin/ui/accounts-mail.spec.tsx`. En rojo, 7 de 8. «is not offered without mail» ya pasa y queda como guarda.
4. **Commit:** `test(front): specs del enlace de recuperación de un alumno, en rojo`.

### Tarea 2.4 · La recuperación de un tercero (T037, L)

**Archivos:** `frontend/src/pages/admin/model/user-actions.ts`, `frontend/src/pages/admin/ui/AccountsTable.tsx` y `frontend/src/pages/admin/ui/AccountsSection.tsx`.

1. **`user-actions.ts`,** este diff. La acción va al final, y `mailAvailable` vale `false` por omisión (R6):

   ```diff
   diff --git a/frontend/src/pages/admin/model/user-actions.ts b/frontend/src/pages/admin/model/user-actions.ts
   --- a/frontend/src/pages/admin/model/user-actions.ts
   +++ b/frontend/src/pages/admin/model/user-actions.ts
   @@ -1,6 +1,6 @@
    import type { AdminUser, UserChange } from './types';

   -export type UserAction = 'disable' | 'enable' | 'promote' | 'demote' | 'delete';
   +export type UserAction = 'disable' | 'enable' | 'promote' | 'demote' | 'delete' | 'reset-password';

    export interface UserActionTexts {
      readonly button: string;
   @@ -11,7 +11,7 @@ export interface UserActionTexts {
      readonly done: string;
    }

   -export const ACTION_SLOTS = ['status', 'role', 'delete'] as const;
   +export const ACTION_SLOTS = ['status', 'role', 'delete', 'reset-password'] as const;
    export const DELETE_ACKNOWLEDGEMENT = 'Entiendo que no se puede deshacer.';

    const DISABLE_BODY =
   @@ -20,14 +20,24 @@ const DROPS_INVITATIONS = 'Las invitaciones pendientes que creó se borran.';
    const DELETE_BODY =
      'Se borra la cuenta con todo lo que guardó en el servidor: el progreso, los intentos, el código y las importaciones. No se puede deshacer, y las copias de seguridad lo conservan un tiempo (el aviso de privacidad dice cuánto). Si la persona quiere sus datos, que los descargue antes desde «Tu cuenta».';

   -export function actionsFor(user: AdminUser, ownId: number): readonly UserAction[] {
   +function canGetResetLink({ role, status }: AdminUser): boolean {
   +  return role === 'student' && status === 'active';
   +}
   +
   +export function actionsFor(
   +  user: AdminUser,
   +  ownId: number,
   +  mailAvailable = false,
   +): readonly UserAction[] {
      if (user.id === ownId || user.status === 'deleting') return [];
      const statusAction = user.status === 'active' ? 'disable' : 'enable';
      const roleAction = user.role === 'admin' ? 'demote' : 'promote';
   -  return [statusAction, roleAction, 'delete'];
   +  const actions: UserAction[] = [statusAction, roleAction, 'delete'];
   +  if (mailAvailable && canGetResetLink(user)) actions.push('reset-password');
   +  return actions;
    }

   -export function changeFor(action: Exclude<UserAction, 'delete'>): UserChange {
   +export function changeFor(action: Exclude<UserAction, 'delete' | 'reset-password'>): UserChange {
      switch (action) {
        case 'disable':
          return { status: 'disabled' };
   @@ -40,7 +50,10 @@ export function changeFor(action: Exclude<UserAction, 'delete'>): UserChange {
      }
    }

   -export function userActionTexts(action: UserAction, { name, role }: AdminUser): UserActionTexts {
   +export function userActionTexts(
   +  action: UserAction,
   +  { name, email, role }: AdminUser,
   +): UserActionTexts {
      switch (action) {
        case 'disable':
          return {
   @@ -87,5 +100,16 @@ export function userActionTexts(action: UserAction, { name, role }: AdminUser):
            pending: 'Borrando…',
            done: '',
          };
   +    case 'reset-password':
   +      return {
   +        button: `Mandarle un enlace para elegir contraseña a ${name}`,
   +        title: `¿Mandarle a ${name} un enlace para elegir contraseña?`,
   +        body: [
   +          `Le llega por correo a ${email} y vence en 60 minutos. Hasta que elija otra, su contraseña de ahora sigue valiendo.`,
   +        ],
   +        confirm: 'Mandar el enlace',
   +        pending: 'Mandando…',
   +        done: `Le mandamos un enlace a ${email}. Vence en 60 minutos.`,
   +      };
      }
    }
   ```

2. **`AccountsTable.tsx`,** este diff:

   ```diff
   diff --git a/frontend/src/pages/admin/ui/AccountsTable.tsx b/frontend/src/pages/admin/ui/AccountsTable.tsx
   --- a/frontend/src/pages/admin/ui/AccountsTable.tsx
   +++ b/frontend/src/pages/admin/ui/AccountsTable.tsx
   @@ -8,10 +8,18 @@ interface AccountsTableProps {
      readonly users: readonly AdminUser[];
      readonly ownId: number;
      readonly busy: boolean;
   +  readonly mailAvailable: boolean;
      onAction(action: UserAction, user: AdminUser, opener: HTMLButtonElement): void;
    }

   -const AccountsTable = ({ titleId, users, ownId, busy, onAction }: AccountsTableProps) => (
   +const AccountsTable = ({
   +  titleId,
   +  users,
   +  ownId,
   +  busy,
   +  mailAvailable,
   +  onAction,
   +}: AccountsTableProps) => (
      <div
        className="admin-table-scroll"
        role="region"
   @@ -46,7 +54,7 @@ const AccountsTable = ({ titleId, users, ownId, busy, onAction }: AccountsTableP
                <td>{formatLocalDateTime(user.createdAt)}</td>
                <td>
                  <div className="admin-row-actions">
   -                {actionsFor(user, ownId).map((action, index) => (
   +                {actionsFor(user, ownId, mailAvailable).map((action, index) => (
                      <button
                        key={ACTION_SLOTS[index]}
                        type="button"
   ```

3. **`AccountsSection.tsx`,** este diff. Toda acción de una cuenta lleva el camino de la consola, porque sólo la recuperación puede recibir un 503 (R7):

   ```diff
   diff --git a/frontend/src/pages/admin/ui/AccountsSection.tsx b/frontend/src/pages/admin/ui/AccountsSection.tsx
   --- a/frontend/src/pages/admin/ui/AccountsSection.tsx
   +++ b/frontend/src/pages/admin/ui/AccountsSection.tsx
   @@ -1,10 +1,13 @@
    import { useCallback, useId, useRef, useState } from 'react';
    import { useForm } from 'react-hook-form';
   +import { useStore } from 'zustand';
   +import { sessionStore } from '../../../entities/session';
    import { useApiClient, type ApiFailure } from '../../../shared/api/http';
    import { TextField, messagesOf } from '../../../shared/ui/form';
   -import { changeUser, deleteUser, listUsers } from '../api/admin-endpoints';
   +import { changeUser, deleteUser, listUsers, sendPasswordReset } from '../api/admin-endpoints';
    import usePagedList from '../lib/use-paged-list';
    import { ROLE_FILTER, STATUS_FILTER } from '../model/labels';
   +import { RECOVERY_BY_CONSOLE, selectMailAvailable } from '../model/mail';
    import { ACCOUNT_GONE, staleList } from '../model/react-to-failure';
    import type { ActionResult, AdminUser, UserQuery } from '../model/types';
    import {
   @@ -39,6 +42,7 @@ const TEXTS: ListTexts = {

    const AccountsSection = ({ ownId }: AccountsSectionProps) => {
      const client = useApiClient();
   +  const mailAvailable = useStore(sessionStore, selectMailAvailable);
      const titleId = useId();
      const title = useRef<HTMLHeadingElement>(null);
      const [notice, setNotice] = useState('');
   @@ -72,6 +76,12 @@ const AccountsSection = ({ ownId }: AccountsSectionProps) => {
          setNotice(outcome.value.message);
          return DONE;
        }
   +    if (action === 'reset-password') {
   +      const outcome = await sendPasswordReset(client, ownId, user.id);
   +      if (!outcome.ok) return failed(outcome.failure);
   +      setNotice(done);
   +      return DONE;
   +    }
        const outcome = await changeUser(client, ownId, user.id, changeFor(action));
        if (!outcome.ok) return failed(outcome.failure);
        list.replace(outcome.value);
   @@ -92,6 +102,7 @@ const AccountsSection = ({ ownId }: AccountsSectionProps) => {
          {
            start: { kind: 'confirm', title: texts.title, confirmation },
            notFoundMessage: ACCOUNT_GONE,
   +        withoutMail: RECOVERY_BY_CONSOLE,
            send: () => perform(action, user, texts.done),
          },
          opener,
   @@ -148,6 +159,7 @@ const AccountsSection = ({ ownId }: AccountsSectionProps) => {
                users={users}
                ownId={ownId}
                busy={list.loading}
   +            mailAvailable={mailAvailable}
                onAction={confirm}
              />
            )}
   @@ -157,6 +169,7 @@ const AccountsSection = ({ ownId }: AccountsSectionProps) => {
              adminId={ownId}
              start={actions.dialog.start}
              notFoundMessage={actions.dialog.notFoundMessage}
   +          withoutMail={actions.dialog.withoutMail}
              send={actions.dialog.send}
              onFinish={actions.finish}
            />
   ```

4. **Correr** `npm run test:unit -- frontend/src/pages/admin`, en verde: las 110. Después, `npm run typecheck` y `npm run lint`.
5. **Commit:** `feat(front): el enlace para elegir contraseña de un alumno, por correo`.

### Tarea 2.5 · El E2E con correo, en rojo (T038, E, desde T033)

**Archivos:** `qa/e2e/specs/admin-mail.spec.ts`.

**Consume:** de T032, `api.features`, `WITH_MAIL`, `adminError('mail_unavailable')` y `admin.invite(…, delivery)`; de F12a, el Page Object y los datos del contrato; de F11a, `ADMIN`.

**Reglas de este E2E** (research-f12b.md, R11):

- cada respuesta que no es 2xx declara `pageIssues.expectIssue(/status of NNN/, …)` con su código;
- las rutas con id se registran una por una, y `POST /api/auth/confirm-password`, explícitamente;
- todo pedido que modifica se comprueba con `call.user === String(ADMIN.id)`;
- las fechas se comparan en la zona de `playwright.config.ts` (America/Argentina/Buenos_Aires): `2026-10-12T15:30:00.000Z` se ve como «12 de octubre de 2026 a las 12:30».

1. **`admin-mail.spec.ts`.** Cubre la historia 7 entera, SC-008, la parte de F12b de SC-006 (el teclado y los 320 px) y la contraseña a pedido en la recuperación:

   ```ts
   import type { Locator, Page } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import { ADMIN } from '../lib/api-contract';
   import {
     ANA_ROW,
     BETO_ROW,
     OWN_ROW,
     WITH_MAIL,
     adminError,
     adminUser,
     invitation,
     linkFor,
     pageOf,
   } from '../lib/admin-contract';
   import { urls } from '../lib/urls';

   const PASSWORD = 'una frase larga para el taller';
   const EXPIRES_AT = '2026-10-12T15:30:00.000Z';
   const DANI_ROW = adminUser({ id: 15, name: 'Dani Paz', email: 'dani@x.com', status: 'disabled' });
   const NOT_SENT = invitation({
     id: 8,
     email: 'beto@x.com',
     delivery: 'email',
     sendFailedAt: '2026-10-06T15:30:00.000Z',
   });
   const SENT = invitation({
     id: 9,
     email: 'carla@x.com',
     delivery: 'email',
     sentAt: '2026-10-05T15:30:00.000Z',
   });
   const ON_ITS_WAY = invitation({ id: 10, email: 'eva@x.com', delivery: 'email' });
   const RESET_ANA = 'Mandarle un enlace para elegir contraseña a Ana Pérez';
   const TOO_MANY = adminError('too_many_requests');

   interface ResendBody {
     delivery: 'link' | 'email';
   }

   async function tabTo(page: Page, target: Locator): Promise<void> {
     for (let presses = 0; presses < 80; presses += 1) {
       if (await target.evaluate((element) => element === document.activeElement)) return;
       await page.keyboard.press('Tab');
     }
   }

   test.use({ sessionAccount: ADMIN });

   test.beforeEach(({ api }) => {
     api.on('GET /api/admin/users', () => ({
       status: 200,
       json: pageOf([OWN_ROW, ANA_ROW, BETO_ROW, DANI_ROW]),
     }));
     api.on('GET /api/admin/invitations', () => ({
       status: 200,
       json: pageOf([NOT_SENT, SENT, ON_ITS_WAY]),
     }));
   });

   test.describe('without mail', () => {
     test('offers no mail option nor reset link, and says how to do without them', async ({
       admin,
       shell,
     }) => {
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await expect(admin.row(/Ana Pérez/).getByRole('button')).toHaveCount(3);
       await expect(admin.region.getByRole('button', { name: /Mandarle un enlace/ })).toHaveCount(0);
       await admin.openSection('Invitaciones');
       await expect(admin.inviteForm().getByLabel('Entrega', { exact: true })).toHaveCount(0);
       await expect(
         admin.region.getByRole('button', { name: /por correo|Pasar a enlace/ }),
       ).toHaveCount(0);
       await expect(admin.button('Reenviar la invitación de beto@x.com')).toBeVisible();
       await expect(admin.region).toContainText(
         'El taller todavía no manda correos: copiá cada enlace y entregáselo a su persona.',
       );
       await expect(admin.region).toContainText(
         'Para recuperar el acceso de alguien, generá el enlace con la consola del taller (taller:password-reset-link).',
       );
     });
   });

   test.describe('with mail', () => {
     test.beforeEach(({ api }) => {
       api.features = WITH_MAIL;
     });

     test('invites by mail, says that each invitation goes by mail and which ones hit the cap', async ({
       admin,
       api,
       shell,
     }) => {
       api.on('POST /api/admin/invitations', () => ({
         status: 200,
         json: {
           data: [
             { email: 'nueva@x.com', result: 'created', expiresAt: EXPIRES_AT },
             { email: 'vencida@x.com', result: 'renewed', expiresAt: EXPIRES_AT },
             { email: 'ana@x.com', result: 'rate_limited' },
           ],
         },
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.invite(['nueva@x.com', 'vencida@x.com', 'ana@x.com']);
       const [call] = api.callsTo('POST /api/admin/invitations');
       expect(call?.body).toEqual({
         emails: ['nueva@x.com', 'vencida@x.com', 'ana@x.com'],
         role: 'student',
         delivery: 'email',
       });
       expect(call?.user).toBe(String(ADMIN.id));
       const result = admin.dialog('Resultado');
       const items = result.getByRole('listitem');
       await expect(items.nth(0)).toHaveText(
         'nueva@x.com · Invitación creada. Le llega por correo. Vence el 12 de octubre de 2026 a las 12:30.',
       );
       await expect(items.nth(1)).toContainText(
         'Tenía una invitación vencida: la renovamos. Le llega por correo.',
       );
       await expect(items.nth(2)).toHaveText(
         'ana@x.com · No salió: llegaste al tope de 300 correos por día. Probá mañana o usá un enlace.',
       );
       await expect(result.getByRole('textbox')).toHaveCount(0);
       await result.getByRole('button', { name: 'Listo' }).click();
       await expect(result).toBeHidden();
     });

     test('shows the 503 with the way of the link, creates nothing and then invites by link', async ({
       admin,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 503/, 'the 503 of a workshop that cannot send mail');
       api.reply('POST /api/admin/invitations', {
         status: 503,
         headers: { 'Retry-After': '3600' },
         json: adminError('mail_unavailable'),
       });
       api.on('POST /api/admin/invitations', () => ({
         status: 200,
         json: {
           data: [
             { email: 'beto2@x.com', result: 'created', expiresAt: EXPIRES_AT, url: linkFor('beto2') },
           ],
         },
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.invite(['beto2@x.com']);
       const alert = admin.inviteForm().getByRole('alert');
       await expect(alert).toContainText('El taller no puede mandar correos por ahora.');
       await expect(alert).toContainText('Usá un enlace para copiar.');
       await expect(admin.dialog('Resultado')).toHaveCount(0);
       await expect(admin.inviteForm().getByLabel('Emails', { exact: true })).toHaveValue(
         'beto2@x.com',
       );
       await admin.invite(['beto2@x.com'], 'Alumno', 'Enlace para copiar');
       await expect(
         admin.dialog('Resultado').getByRole('textbox', { name: 'Enlace de beto2@x.com' }),
       ).toHaveValue(linkFor('beto2'));
       expect(api.callsTo('POST /api/admin/invitations').map((each) => each.body)).toEqual([
         { emails: ['beto2@x.com'], role: 'student', delivery: 'email' },
         { emails: ['beto2@x.com'], role: 'student', delivery: 'link' },
       ]);
     });

     test('says whether each mail went out, resends by mail and turns an invitation into a link', async ({
       admin,
       api,
       shell,
     }) => {
       api.on('POST /api/admin/invitations/8/resend', (call) => {
         const { delivery } = call.body as ResendBody;
         const data = { id: 8, email: 'beto@x.com', role: 'student', delivery, expiresAt: EXPIRES_AT };
         return {
           status: 200,
           json: { data: delivery === 'email' ? data : { ...data, url: linkFor('beto-nuevo') } },
         };
       });
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.openSection('Invitaciones');
       await expect(admin.row(/beto@x\.com/)).toContainText('No salió: reenviala o pasala a enlace.');
       await expect(admin.row(/carla@x\.com/)).toContainText(
         'Entregada al proveedor el 5 de octubre de 2026 a las 12:30.',
       );
       await expect(admin.row(/eva@x\.com/)).toContainText(
         'Por correo, en camino. Si no sale en 24 horas, lo vas a ver acá.',
       );
       await admin.button('Reenviar por correo la invitación de beto@x.com').click();
       await admin
         .dialog('¿Reenviar por correo la invitación de beto@x.com?')
         .getByRole('button', { name: 'Reenviar por correo', exact: true })
         .click();
       await expect(
         admin.notice('Reenviamos la invitación de beto@x.com. Le llega por correo.'),
       ).toBeVisible();
       await expect(admin.button('Reenviar por correo la invitación de beto@x.com')).toBeFocused();
       await admin.button('Pasar a enlace la invitación de beto@x.com').click();
       await admin
         .dialog('¿Pasar a enlace la invitación de beto@x.com?')
         .getByRole('button', { name: 'Pasar a enlace', exact: true })
         .click();
       await expect(
         admin.dialog('Resultado').getByRole('textbox', { name: 'Enlace de beto@x.com' }),
       ).toHaveValue(linkFor('beto-nuevo'));
       const resends = api.callsTo('POST /api/admin/invitations/8/resend');
       expect(resends.map((call) => call.body)).toEqual([{ delivery: 'email' }, { delivery: 'link' }]);
       expect(resends.every((call) => call.user === String(ADMIN.id))).toBe(true);
     });

     test('keeps the link path open when the cap stops a resend by mail', async ({
       admin,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 429/, 'the 429 of the cap of 300 mails');
       api.on('POST /api/admin/invitations/8/resend', () => ({
         status: 429,
         headers: { 'Retry-After': '3600' },
         json: TOO_MANY,
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.openSection('Invitaciones');
       await admin.button('Reenviar por correo la invitación de beto@x.com').click();
       const dialog = admin.dialog('¿Reenviar por correo la invitación de beto@x.com?');
       await dialog.getByRole('button', { name: 'Reenviar por correo', exact: true }).click();
       await expect(dialog.getByRole('alert')).toContainText('Podés volver a intentar en 1 hora.');
       await expect(
         dialog.getByRole('button', { name: 'Reenviar por correo', exact: true }),
       ).toBeDisabled();
       await dialog.getByRole('button', { name: 'Cancelar' }).click();
       await expect(admin.notice('Reenviamos')).toHaveCount(0);
       await expect(admin.button('Pasar a enlace la invitación de beto@x.com')).toBeEnabled();
     });

     test('sends a student a reset link after the password, and offers it to no admin nor disabled account', async ({
       admin,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 423/, 'the 423 of the first sensitive action');
       api.reply('POST /api/admin/users/12/password-reset', {
         status: 423,
         json: adminError('password_confirmation_required'),
       });
       api.on('POST /api/admin/users/12/password-reset', () => ({ status: 202 }));
       api.on('POST /api/auth/confirm-password', () => ({ status: 201, json: {} }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await expect(
         admin
           .row(/Ana Pérez/)
           .getByRole('button')
           .last(),
       ).toHaveText(RESET_ANA);
       await expect(admin.row(/Beto Gómez/).getByRole('button', { name: /Mandarle/ })).toHaveCount(0);
       await expect(admin.row(/Dani Paz/).getByRole('button', { name: /Mandarle/ })).toHaveCount(0);
       await admin.button(RESET_ANA).click();
       await admin
         .dialog('¿Mandarle a Ana Pérez un enlace para elegir contraseña?')
         .getByRole('button', { name: 'Mandar el enlace', exact: true })
         .click();
       await admin.confirmPassword(PASSWORD);
       await expect(
         admin.notice('Le mandamos un enlace a ana@x.com. Vence en 60 minutos.'),
       ).toBeVisible();
       await expect(admin.button(RESET_ANA)).toBeFocused();
       const resets = api.callsTo('POST /api/admin/users/12/password-reset');
       expect(resets).toHaveLength(2);
       expect(resets.every((call) => call.user === String(ADMIN.id) && call.body === undefined)).toBe(
         true,
       );
       expect(api.callsTo('POST /api/auth/confirm-password')).toHaveLength(1);
     });

     test('never says that the reset link went out when the server asks to wait', async ({
       admin,
       api,
       pageIssues,
       shell,
     }) => {
       pageIssues.expectIssue(/status of 429/, 'the 429 of a reset link issued less than 60 s ago');
       api.on('POST /api/admin/users/12/password-reset', () => ({
         status: 429,
         headers: { 'Retry-After': '45' },
         json: TOO_MANY,
       }));
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await admin.button(RESET_ANA).click();
       const dialog = admin.dialog('¿Mandarle a Ana Pérez un enlace para elegir contraseña?');
       await dialog.getByRole('button', { name: 'Mandar el enlace', exact: true }).click();
       await expect(dialog.getByRole('alert')).toContainText(
         'Podés volver a intentar en 45 segundos.',
       );
       await expect(
         dialog.getByRole('button', { name: 'Mandar el enlace', exact: true }),
       ).toBeDisabled();
       await expect(admin.notice('Le mandamos')).toHaveCount(0);
     });

     test('sends the reset link with the keyboard only, and at 320 px the page does not scroll sideways', async ({
       admin,
       api,
       shell,
       page,
     }) => {
       api.on('POST /api/admin/users/12/password-reset', () => ({ status: 202 }));
       await page.setViewportSize({ width: 320, height: 800 });
       await shell.goto(urls.view('recorrido'));
       await admin.open();
       await expect(admin.row(/Ana Pérez/)).toBeVisible();
       expect(
         await admin.region.evaluate((element) => element.scrollWidth <= element.clientWidth),
       ).toBe(true);
       const target = admin.button(RESET_ANA);
       await tabTo(page, target);
       await expect(target).toBeFocused();
       await page.keyboard.press('Enter');
       const dialog = admin.dialog('¿Mandarle a Ana Pérez un enlace para elegir contraseña?');
       await expect(dialog.getByRole('heading')).toBeFocused();
       await page.keyboard.press('Tab');
       await page.keyboard.press('Tab');
       await expect(
         dialog.getByRole('button', { name: 'Mandar el enlace', exact: true }),
       ).toBeFocused();
       await page.keyboard.press('Enter');
       await expect(target).toBeFocused();
       await admin.openSection('Invitaciones');
       await expect(admin.row(/beto@x\.com/)).toBeVisible();
       expect(
         await admin.region.evaluate((element) => element.scrollWidth <= element.clientWidth),
       ).toBe(true);
     });
   });
   ```

2. **Correr** `npm run typecheck` y `npm run build && E2E_PORT=4195 npm run test:e2e -- specs/admin-mail.spec.ts`. El resultado esperado:
   - «offers no mail option nor reset link, and says how to do without them», en verde: sin correo, todo sigue como en F12a;
   - el resto, en rojo por la razón esperada: no existen el campo «Entrega», los botones de correo ni la recuperación.

   La red de la base sigue en verde.
3. **Commit:** `test(qa): E2E de la administración con correo, en rojo`.

### Tarea 2.6 · La compuerta de U2 (T039, K)

- **Desde S2:** I y L entregaron, y E entregó T038.
- **La compuerta de 0.2,** con:
  - `npm run test:unit` en verde (las 110 de `pages/admin`);
  - la red completa tres veces seguidas: `E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0`, con `admin-mail.spec.ts` en verde;
  - `css-contract.spec.ts` en verde.
- **En el navegador,** con `npm run build && npm run preview` y el doble, o con el stack (quickstart-f12b §4):
  - a 1 280, a 390 y a 320 px;
  - con y sin correo;
  - el teclado, de punta a punta, en «Invitar» por correo y en la recuperación.
- **El PR:** `feat(front): administration with mail: invitations, delivery status and reset links (F12b U2)`, contra `f12b/base`.

**Reversión de U2:** se revierten T038, T037, T036, T035 y T034, en ese orden.

## 3. U3 · La documentación, el peso y el PR (onda 3: K)

**Cubre:** FR-057 y FR-061; SC-007 y SC-009.

### Tarea 3.1 · La documentación (T040, K)

Cambia en el mismo PR que U3 (FR-061):

- **`docs/architecture.md`:** la fila «Administración (F12a)» del «Mapa de archivos» pasa a «Administración (F12a y F12b)» y suma el correo:
  - `pages/admin/model/mail.ts`, con la bandera `selectMailAvailable`;
  - la entrega al invitar, el estado del envío, el paso a enlace y la recuperación de un tercero, sobre `/api/admin` de C3b y C3c.
- **`qa/AGENTS.md`:**
  - **la fila «Administración» de «Elegir comprobaciones»** suma las cinco specs `*-mail.spec.ts*` y `qa/e2e/specs/admin-mail.spec.ts`;
  - **«Pruebas del front»:**
    - `api.features` prende el correo de la sesión simulada, antes de navegar;
    - `signInWithMail()` lo hace en las specs de la administración;
    - una E2E con una respuesta que no es 2xx declara `/status of NNN/`.
- **`specs/023-f12-administracion/contracts/admin-page.md`,** en «Lo que hace cada ítem que sigue», el párrafo de F12b pasa de lo que iba a sumar a lo que sumó:
  - «Reenviar por correo» y «Pasar a enlace» son dos botones de la fila, cada uno con su confirmación, y no dos botones de la confirmación (research-f12b.md, R3);
  - `ActionDialog` suma la prop opcional `withoutMail`;
  - la recuperación es la cuarta acción de `actionsFor`, en el último lugar de `ACTION_SLOTS`.

**Comprobar** las rutas, los comandos y los enlaces locales de cada pasaje, y `git diff --check`. Commit: `docs: la administración con correo de F12b en la arquitectura y en qa`.

### Tarea 3.2 · El peso, la compuerta final, la verificación a mano y el PR a `master` (T041, K)

1. **El peso** (FR-057 y SC-007). Con `npm run build`:
   - `html.length` de `dist/index.html`, contra T027;
   - la medida de esbuild de quickstart-f12b.md §3, que separa los bytes de `pages/admin`.

   **La condición de corte:** si la diferencia con T027 pasa de +6 000 caracteres o el total llega a 1 500 000, F12b no cierra. Se informa la medida y decide el usuario.
2. **La compuerta de 0.2,** sobre `f12b/base` con U1 a U3, con:
   - la red completa cinco veces seguidas (`--repeat-each=5 --retries=0`);
   - `git diff master -- package.json package-lock.json`, vacío (FR-056);
   - `docker compose build taller`, con permiso;
   - la verificación a mano contra el stack con correo (quickstart-f12b.md §4).
3. **Lo que tiene que haber hecho el usuario antes del PR a `master`:** dar permiso para Docker. El dominio no hace falta (decisión 1 del informe).
4. **El PR** de `f12b/base` a `master`: `feat(front): administration screens with mail (F12b)`. La descripción en inglés lleva:
   - la reversión por unidad;
   - el peso, contra T027;
   - la verificación a mano contra el stack;
   - lo que queda: el correo real llega con el dominio (T037 de C3c).

**Reversión de U3:** se revierten T041 y T040.

## 4. Documentación que cambia con cada unidad

| Unidad | Qué cambia |
| --- | --- |
| U0 | research-f12b.md, «Línea base de la implementación» (T027) |
| U1 | `contracts/admin-page.md`, la sección `qa/e2e` (T032) |
| U2 | Ninguna |
| U3 | `docs/architecture.md`, `qa/AGENTS.md` y el párrafo de F12b de `contracts/admin-page.md` (T040) |

## Cobertura de requisitos

| Requisito | Tareas (la prueba que lo fija) |
| --- | --- |
| FR-044 | T029 (`DELIVERY_OPTIONS`); T031 (`invite` con la entrega); T034 («offers the delivery, by mail first…», «invites by link when asked to»); T038 (el lote por correo y el segundo por enlace) |
| FR-045 | T028 (`entryText` con `mailed` y `rate_limited`; `parseInviteEntries`); T034 («invites by mail and says that each invitation goes by mail, without links»); T038 (con un email que ya tenía cuenta) |
| FR-046 | T028 (`mailStatusText` y `parseAdminInvitation`); T034 («says whether each mail went out…»); T038 (las tres marcas) |
| FR-047 | T028 (`invitationActionsFor` y sus textos); T030 (`resendByEmail`); T034 (reenviar por correo, pasar a enlace y el 429 del tope); T038 |
| FR-048 | T030 (`sendPasswordReset`); T036 (sólo a un alumno activo, al final, el 202, el 429 y el 422); T038 (con la contraseña a pedido) |
| FR-049 | T028 (`reactionTo` con `mail_unavailable`); T030 (el camino que recibe el diálogo, sin espera); T034 (el 503 al invitar, sin resultado); T036 (el 503 de la recuperación, con la consola); T038 |
| FR-050 | T038 («sends the reset link with the keyboard only…») |
| FR-051 | T034 (los nombres de los botones de una invitación); T036 (el de la recuperación) |
| FR-052 | T038 (320 px, en «Cuentas» y en «Invitaciones», con correo) |
| FR-053 | Sin reglas de CSS ni animaciones nuevas (compuerta de 0.2, paso 4); el E2E de movimiento reducido de F12a, sin editar |
| FR-054 | Compuerta de 0.2, paso 4 |
| FR-055 | T035 («Entrega» con `register`, en el formulario de React Hook Form de F12a) |
| FR-056 | T041 (`git diff master -- package.json package-lock.json` vacío) |
| FR-057 | T027 y T041 |
| FR-058 | Toda tarea de código (TDD); T028 y T034 (fishery) |
| FR-059 | T032 y T038 |
| FR-060 | Compuerta de 0.2, paso 3, en cada unidad |
| FR-061 | T040 y T041 |

| Criterio | Tareas |
| --- | --- |
| SC-003 | La tabla siguiente |
| SC-006 | En parte, como en F12a: T038 recorre con el teclado la recuperación de punta a punta, y comprueba 320 px en las dos secciones. «Invitar» por correo usa los controles nativos de F12a más un `<select>` |
| SC-007 | Compuerta de 0.2; T041 (el peso y `package.json`) |
| SC-008 | T038 («offers no mail option nor reset link…», los caminos de correo y el 503 sin resultado); T034 y T036 |
| SC-009 | T041 |

**SC-003: cada estado de las filas de F12b de «Acciones, endpoints y estados» con su prueba.** Los cuerpos salen del contrato de C3c y de `lang/es/`.

| Acción | Mientras espera | Éxito | Errores propios | Comunes (401, 403, 423, 429, red) |
| --- | --- | --- | --- | --- |
| Invitar por correo | «Creando…» de F12a (T017) | T034 y T038 (`created`, `renewed` y `rate_limited`) | T034 y T038 (503); los 422 de invitar, los de F12a (T017) | F12a: T017 (423 y red); el formulario es el mismo |
| Reenviar por correo o pasar a enlace | T028 («Generando…» en los textos); `ConfirmStep` de F12a (T011) | T034 y T038 (las dos entregas) | T030 y T034 (503, con el camino del enlace); T034 y T038 (429 del tope); el 404, con `INVITATION_GONE` de F12a (T017) | Los de reenviar de F12a: la misma confirmación y el mismo diálogo |
| Mandar el enlace de recuperación | T036 («Mandando…» en los textos); `ConfirmStep` de F12a (T011) | T036 y T038 (202) | T036 (422 `errors.user`, 503 con la consola y 429 de 60 s); T038 (429); el 404, con `ACCOUNT_GONE` de F12a (T003) | T038 (423 y un solo reintento); los demás, del diálogo de F12a (T011 y T015) |

## Descargas y permisos

Ninguna descarga: F12b no suma paquetes ni navegadores (FR-056). Docker corre sólo con permiso, en T041 (`docker compose build taller` y la verificación a mano).

## Riesgos y lo que quedó sin verificar

1. **F12a puede llegar distinta de su plan.** Los diffs se escribieron sobre el código de su plan. *Mitigación:* T027 los prueba con `git apply --check`, y las reglas piden hacer el mismo cambio a mano si no aplican.
2. **C3c puede llegar distinta de su contrato.** *Mitigación:* T027 comprueba la base, y la verificación a mano de T041 contrasta las formas con el stack.
3. **El E2E no corrió al planificar.** Necesita F11a y F12a cableadas. *Mitigación:* tipa contra el doble y el Page Object de los planes; el comportamiento se verificó en Vitest; T039 corre la red tres veces, y T041, cinco.
4. **El texto «Probá mañana» de `rate_limited`** puede no ser exacto con la ventana de 24 horas (research-f12b.md, R4). *Mitigación:* la decisión 3 del informe; cambiarlo es una constante y tres esperados.
5. **El estado intermedio promete 24 horas.** Si C3c cambia el plazo, el texto miente. *Mitigación:* C3c-1 está aceptada, y su plan la fija en `MailDeadline` y `taller.mail.retry_seconds`.

## Complexity Tracking

| Decisión | Por qué hace falta | La alternativa más simple, y por qué no |
| --- | --- | --- |
| Dos botones de reenvío por fila, cada uno con su confirmación | El tope de 300 frena sólo el reenvío por correo, y su espera puede ser de horas; «Pasar a enlace» tiene que seguir disponible, y `ActionDialog` no cambia de forma | Una confirmación con dos botones: cambia `send()`, `ConfirmStep` y la repetición después del 423 del diálogo con más casos de borde de F12a (research-f12b.md, R3) |
