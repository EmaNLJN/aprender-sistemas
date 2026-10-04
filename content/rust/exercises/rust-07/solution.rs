fn estado(codigo: u16) -> &'static str {
    match codigo {
        200 => "ok",
        404 => "ausente",
        500 => "error",
        _ => "desconocido",
    }
}