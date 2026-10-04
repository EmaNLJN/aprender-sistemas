use std::collections::HashMap;
fn sesion(lineas: &[&str]) -> Vec<String> {
    let mut datos: HashMap<String, String> = HashMap::new();
    let mut respuestas = Vec::new();
    for linea in lineas {
        let partes: Vec<&str> = linea.split_whitespace().collect();
        let respuesta = match partes.as_slice() {
            ["SET", clave, valor] => {
                datos.insert((*clave).to_string(), (*valor).to_string());
                String::from("OK")
            }
            ["GET", clave] => datos.get(*clave).cloned().unwrap_or_else(|| String::from("NOT_FOUND")),
            _ => String::from("ERROR"),
        };
        respuestas.push(respuesta);
    }
    respuestas
}