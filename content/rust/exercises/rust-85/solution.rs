fn dividir_chars(texto: &str, n: usize) -> (&str, &str) {
    let corte = texto.char_indices().nth(n).map(|(i, _)| i).unwrap_or(texto.len());
    texto.split_at(corte)
}