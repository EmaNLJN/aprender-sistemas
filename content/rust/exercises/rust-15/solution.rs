fn marcar(texto: &mut String) -> usize {
    let vista = &texto[..];
    let antes = vista.len();
    texto.push('?');
    antes
}