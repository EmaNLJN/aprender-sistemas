fn saludo(nombre: Option<&str>) -> String {
    format!("Hola, {}", nombre.unwrap_or("visitante"))
}