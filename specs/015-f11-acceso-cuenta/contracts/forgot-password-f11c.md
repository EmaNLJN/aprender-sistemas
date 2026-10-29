# Contrato: lo que suma F11c, recuperar por correo

**Input**: [spec.md](../spec.md) (FR-060 y FR-061), [plan-f11c.md](../plan-f11c.md) y [research-f11c.md](../research-f11c.md). Extiende el contrato de F11a, [front-interfaces.md](./front-interfaces.md). La API pública de `features/sign-in` no cambia, y el doble de la API suma una propiedad. La tarea que la suma (T055) actualiza `front-interfaces.md` en el mismo commit.

Las rutas son relativas a `frontend/src/`.

## `features/sign-in`: el pedido del enlace

```ts
// features/sign-in/api/access-endpoints.ts (suma)
export function requestResetLink(client: ApiClient, email: string): Promise<EndpointResult<null>>;

// features/sign-in/ui/access-texts.ts (suma)
export const RESET_LINK_SENT =
  'Si el email corresponde a una cuenta, te llega un enlace para elegir una contraseña nueva. Vence en 60 minutos.';
export const ASK_ADMIN_FOR_LINK = 'Pedile el enlace a quien administra el taller.';

// Componentes internos (un archivo cada uno, export default)
ForgotPasswordForm: { headingLevel: 1 | 2; initialEmail: string; onBack(email: string): void }
LoginForm:          { …las de F11a; onForgotPassword(email: string): void } // suma la prop
```

**Reglas:**

- `requestResetLink` llama a `POST /api/auth/forgot-password {email}` **sin** `asUser`: no lleva `X-Taller-User`, aunque el store tenga una cuenta (FR-017). Acepta el 202 con cualquier cuerpo.
- `AccessScreen` suma el estado `{kind: 'forgot', email}`:
  - `LoginForm` lo abre con `onForgotPassword(getValues('email'))`;
  - `ForgotPasswordForm` vuelve al ingreso con `onBack(email)`, con el email cargado.
- `LoginForm`, con `features.passwordReset` en `true`, dibuja un botón `text-button` «¿Te olvidaste la contraseña?». Con `false`, dibuja la nota sin correo de F11a, como hoy (FR-034).

**`ForgotPasswordForm`:**

| Caso | Lo que se ve |
| --- | --- |
| Al abrir | «Recuperá tu contraseña» (`h1` en la página, `h2` en el diálogo), el campo «Email» con el foco y «Mandarme el enlace» |
| Mientras espera | «Mandando…», deshabilitado |
| 202 | `RESET_LINK_SENT`, con `role="status"` y el foco, y «Volver al ingreso». El mismo texto para cualquier email |
| 422 `errors.email` | El campo «Email» marcado, con `aria-invalid` y el mensaje del servidor |
| 503 `mail_unavailable` | El mensaje del servidor y `ASK_ADMIN_FOR_LINK` en el error general. El botón no se bloquea |
| 429 | El mensaje del servidor y «Podés volver a intentar en {tiempo}.»; el botón espera |
| Red, 5xx o algo que no es JSON | Los mensajes comunes de F11a |
| «Volver al ingreso» | El ingreso, con el email que haya en el campo |

## `qa/e2e`: el doble de la API

```ts
// qa/e2e/fixtures/api-double.ts (ApiDouble suma)
export interface SessionFeatures {
  passwordReset: boolean;
  registration: boolean;
}
class ApiDouble {
  features: SessionFeatures; // { passwordReset: false, registration: false } por omisión; reemplaza a la constante FEATURES
}
```

`GET /api/session` responde `features: this.features` en cada pedido. Un E2E la cambia antes de `page.goto`:

```ts
api.features = { passwordReset: true, registration: false };
```

Las rutas de `forgot-password` se registran con `api.on('POST /api/auth/forgot-password', …)` en cada escenario. El doble no suma una ruta por omisión.

```ts
// qa/e2e/pages/access.ts (AccessPage suma)
async requestResetLink(email: string): Promise<void>; // abre la pantalla, escribe el email y pide el enlace
```

## Lo que toman otros ítems

- **F12b:** `api.features` para prender el correo en sus E2E, sin copiar la sesión.
- **A3:** si cambia la ruta de la sesión del doble, conserva `features: this.features`.
- **C3c:** nada nuevo. F11c consume su contrato tal cual.
