fn segundo_crudo(datos: &[u32]) -> Option<u32> {
    if datos.len() < 2 { return None; }
    let puntero = datos.as_ptr();
    // SAFETY: len >= 2 garantiza el índice 1; el slice mantiene
    // datos vivos, inicializados y alineados durante esta lectura compartida.
    Some(unsafe { *puntero.add(1) })
}