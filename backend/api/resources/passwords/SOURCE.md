# Lista de contraseñas bloqueadas

`blocked-15plus.txt` es la lista local que `App\Auth\BlockedPasswords` usa para rechazar contraseñas conocidas (spec 004, FR-023 y FR-024).

- **Origen:** `100k-most-used-passwords-NCSC.txt`, de [SecLists](https://github.com/danielmiessler/SecLists), en `Passwords/Common-Credentials/`:
  `https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt`.
- **Bajada:** 2026-10-06, con permiso del usuario. El archivo original tiene 835 538 bytes y 99 840 líneas, con sha256 `c2e5696882c603b7…`.
- **Filtro:** sólo las líneas de 15 bytes o más, pasadas a minúsculas, sin repetidas y ordenadas. Las más cortas nunca serían válidas, porque la política exige 15 caracteres como mínimo.

  ```sh
  LC_ALL=C awk 'length($0) >= 15' 100k-most-used-passwords-NCSC.txt | tr '[:upper:]' '[:lower:]' | LC_ALL=C sort -u > blocked-15plus.txt
  ```

- **Resultado:** 357 líneas y 6 693 bytes. Con el mínimo de 15 caracteres la lista filtra poco, y la política vale sobre todo por su largo mínimo y por los chequeos del nombre y el email de la cuenta.
- **Licencias:**
  - SecLists se distribuye con licencia MIT.
  - La lista viene del NCSC del Reino Unido. No se pudo confirmar la licencia de sus datos: hay que confirmarla antes de publicar el repositorio.
