fn medir(texto: &str) -> usize { texto.len() }
fn inspeccionar(texto: String) -> (String, usize) {
    let bytes = medir(&texto);
    (texto, bytes)
}