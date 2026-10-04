# AGENTS.md — ejecutor

Servicio Go del ADR 0005 (`docs/adr/0005-ejecucion-en-sandbox-propio.md`). Usa sólo la
biblioteca estándar: no agregues módulos sin un ADR.

- Pruebas: `npm run test:executor` (gofmt, vet y unitarias en contenedor, sin red y con el
  código de sólo lectura) y `npm run test:executor:integration` (Docker real con runc;
  `EXECUTOR_RUNTIME=runsc` después de la prueba de humo `executor/scripts/smoke-gvisor.sh`).
  No forman parte de `npm test`. El host no necesita Go.
- Invariantes de seguridad: los límites, imágenes y flags salen de
  `internal/sandbox/profile.go` y `args.go`, nunca del pedido. Todo contenedor usa
  `--network none`, `--cap-drop ALL`, `no-new-privileges`, usuario 65534, memoria sin swap,
  `--log-driver none` y `/tmp` con `noexec`; la ejecución, además, rootfs y `/out` de sólo
  lectura. Cambiar un límite exige actualizar el ADR 0005 y la prueba de tabla de
  `internal/sandbox/args_test.go`.
- Docker se usa sólo a través de `Engine`; las pruebas unitarias usan dobles. Un fallo de
  Docker, incluido un contenedor que no pudo arrancar, es un error del sandbox y nunca un
  resultado del alumno.
- Contrato HTTP: `POST /v1/run {language, program}` con token Bearer. 503 con `Retry-After`
  significa ocupado (no corrió nada); 500, o una respuesta perdida por el `WriteTimeout` de
  90 s, significa fallo del sandbox (pudo haber corrido: quien llama no reintenta solo);
  400 o 413, pedido inválido.
- Cada instancia etiqueta lo suyo con `taller.executor.run=<EXECUTOR_INSTANCE>` (`servicio`
  por defecto; las pruebas de integración usan `integracion`). Al arrancar barre todo lo de su
  instancia y al recibir SIGTERM cancela los pedidos en curso, cuyos contenedores borra el
  `Runner`: Compose necesita un `stop_grace_period` de 20 s o más.
- Las imágenes base se fijan por digest con el tag delante; al actualizarlas, corré otra vez la
  integración.
