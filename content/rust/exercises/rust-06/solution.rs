fn ruta(latencia_ms: u32) -> &'static str {
    if latencia_ms < 20 { "cache" } else { "disco" }
}