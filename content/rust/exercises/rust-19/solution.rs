fn primera_orden(linea: &str) -> &str {
    linea.split_whitespace().next().unwrap_or("")
}