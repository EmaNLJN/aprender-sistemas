use std::collections::HashMap;
fn frecuencias(texto: &str) -> HashMap<String, usize> {
    let mut conteo = HashMap::new();
    for palabra in texto.split_whitespace() {
        *conteo.entry(palabra.to_string()).or_insert(0) += 1;
    }
    conteo
}