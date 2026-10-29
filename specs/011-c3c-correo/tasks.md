# Tasks: C3c · Correo, recuperación por email y registro abierto

**Input**: `specs/011-c3c-correo/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/` y `quickstart.md`). Cada tarea es una línea y remite a su sección del plan («Tarea N.M»), que trae los archivos, las interfaces y los pasos que empiezan por la prueba.

## Phase 1: Setup

- [ ] T001 Línea de base sobre `master`, con la suite de `backend/api/` en verde, y reserva del bloque de migraciones `2026_10_28_1000NN` (plan, Tarea 0.1)
- [ ] T002 Pedir al usuario el permiso para `axllent/mailpit:v1.31.4`: 16,1 MiB, MIT, Docker Hub, sólo para el perfil `dev`; es una acción del usuario, antes de T029 (plan, Tarea 0.2 y «Acciones del usuario»)

## Phase 2: Foundational · Unidad 1, el canal del correo (bloquea las historias)

- [ ] T003 La configuración (`taller.mail`, `taller.registration`, `taller.forgot_password`, la conexión `mail` y el SMTP), `MailAvailability`, `Features` y `GET /api/session`, en `backend/api/config/` y `backend/api/app/{Mail,Auth}/` (plan, Tarea 1.1)
- [ ] T004 La tabla `mail_jobs` y sus pruebas de esquema, en `backend/api/database/migrations/2026_10_28_100001_create_mail_jobs_table.php` (plan, Tarea 1.2)
- [ ] T005 [P] `MailKind`, `OutgoingMail`, `MailDeadline`, `MailText`, `PlainTextMessage` y `lang/es/mail.php`, en `backend/api/app/Mail/` (plan, Tarea 1.3)
- [ ] T006 El trabajo `SendMail`, con `InvitationSendStatus`, `MailNotSent` y `MailLog`, y las pruebas 1, 2 y 5 de la «Review Focus», en `backend/api/app/Jobs/SendMail.php` (plan, Tarea 1.4)
- [ ] T007 `Mailbox`, `MailArchTest`, `verificar` en `SecretScrubber` y el cifrado en reposo, en `backend/api/app/Mail/Mailbox.php` (plan, Tarea 1.5)
- [ ] T008 [P] La advertencia de `APP_URL` local al arrancar `worker-mail`, en `backend/api/app/Mail/WarnLocalAppUrl.php` (plan, Tarea 1.6)

## Phase 3: Unidad 2 · Recuperación por correo (US2 y US3, P1)

- [ ] T009 [US2] El trabajo cifrado que arma la recuperación, en `backend/api/app/Jobs/SendPasswordResetLink.php` (plan, Tarea 2.1)
- [ ] T010 [US2] `POST /api/auth/forgot-password`, con su 202 uniforme, sus límites y SC-002, en `backend/api/routes/api/recovery.php` (plan, Tarea 2.2)
- [ ] T011 [P] [US3] El aviso de contraseña cambiada, en `backend/api/app/Auth/AccountPasswords.php` (plan, Tarea 2.3)
- [ ] T012 [P] [US2] La recuperación de un tercero con 202 o 429, en `backend/api/app/Http/Controllers/Admin/UserController.php` (plan, Tarea 2.4)

## Phase 4: Unidad 3 · Invitaciones por correo y avisos de la administración (US1 y US3, P1)

- [ ] T013 [US1] La entrega guardada (`Delivery`) y el tope de 300 correos por admin (`AdminMailQuota`), en `backend/api/app/Admin/` (plan, Tarea 3.1)
- [ ] T014 [US1] La invitación y el reenvío por correo, con `rate_limited` y el 429, en `backend/api/app/Http/Controllers/Admin/InvitationController.php` (plan, Tarea 3.2)
- [ ] T015 [P] [US3] El aviso de rol de admin, en `backend/api/app/Admin/AccountChanges.php` (plan, Tarea 3.3)
- [ ] T016 [P] [US3] El aviso de cuenta borrada y `PurgeUserData` cifrado y compatible, en `backend/api/app/Jobs/PurgeUserData.php` (plan, Tarea 3.4)

## Phase 5: Unidad 4 · Registro abierto, verificación y cambio de email (US6 y US5, P2 y P3)

- [ ] T017 [US6] El interruptor `registration.open`, las tres rutas, `NetworkKey::wide` y el limitador `register`, en `backend/api/routes/api/registration.php` (plan, Tarea 4.1)
- [ ] T018 [US6] La verificación de email con el token firmado en `#verificar=`, en `backend/api/app/Auth/EmailVerificationLinks.php` (plan, Tarea 4.2)
- [ ] T019 [US6] `POST /api/auth/register`, con los dominios permitidos y el aviso de intento, en `backend/api/app/Http/Controllers/Auth/RegisterController.php` (plan, Tarea 4.3)
- [ ] T020 [P] [US6] Aceptar por correo reemplaza la cuenta sin verificar, con la prueba 3 de la «Review Focus», en `backend/api/app/Auth/Invitations.php` (plan, Tarea 4.4)
- [ ] T021 [P] [US6] `taller:prune-unverified` y su tarea programada, en `backend/api/app/Console/Commands/PruneUnverified.php` (plan, Tarea 4.5)
- [ ] T022 [P] [US5] `taller:change-email`, en `backend/api/app/Console/Commands/ChangeEmail.php` (plan, Tarea 4.6)

## Phase 6: Unidad 5 · Operación (US4, P2)

- [ ] T023 [P] [US4] `apply-grants.sh`, `10-db-grants.sh`, `db-grants.sql` en dos fases y `qa/apply-grants-check.ts`, en `docker/mysql/` (plan, Tarea 5.1)
- [ ] T024 [P] [US4] `MAIL_DB_PASSWORD` en `backend/api/scripts/init-env.sh` y en `qa/init-env-check.ts` (plan, Tarea 5.2)
- [ ] T025 [US4] La prueba del usuario `taller_mail` real con el worker, en `backend/api/tests/Content/MailUserPrivilegesTest.php` (plan, Tarea 5.3)
- [ ] T026 [US4] `worker-mail`, `grants`, las redes `mail` y `egress`, y `qa/compose-mail-check.ts`, en `docker/compose.yaml`, integrado de a uno con F11a (`PRIVACY_VERSION`) y C4 (plan, Tarea 5.4)
- [ ] T027 [US4] `deploy.sh` con `db-grants` y `worker-mail`, y el smoke con FR-026 y FR-030, en `backend/api/scripts/` (plan, Tarea 5.5)
- [ ] T028 [US4] El check de punta a punta, con o sin Mailpit y con el proveedor caído, en `backend/api/scripts/check-mail.sh` (plan, Tarea 5.6)
- [ ] T029 [US4] Mailpit en el perfil `dev`, sólo con el permiso de T002, en `docker/compose.yaml` (plan, Tarea 5.7)

## Phase 7: Polish

- [ ] T030 La documentación: `backend/api/AGENTS.md`, `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y `README.md` (plan, Tarea 6.1)
- [ ] T031 La compuerta final: SC-012, el quickstart del 1 al 8 y el PR de implementación (plan, Tarea 6.2)

## Phase 8: Acciones del usuario (no las hacen los agentes)

- [ ] T032 El dominio con DNS editable (el de C4) y la vía de transferencia internacional de Brevo (plan, «T032»)
- [ ] T033 La cuenta de Brevo, SPF, DKIM y DMARC, el remitente y el rastreo apagado (plan, «T033»)
- [ ] T034 La clave SMTP y los valores de la página «SMTP & API» en `.env`, con `init-env.sh` y `deploy.sh` (plan, «T034»)
- [ ] T035 Un `APP_URL` público (C4), y recién entonces `MAIL_MAILER=smtp` (plan, «T035»)
- [ ] T036 El aviso de privacidad que nombra a Brevo, quién responde por la base y la lista de dominios del registro (plan, «T036»)
- [ ] T037 La verificación con correo real: los ocho correos en tres buzones, con el coordinador (plan, «T037»; quickstart, escenario 9)
