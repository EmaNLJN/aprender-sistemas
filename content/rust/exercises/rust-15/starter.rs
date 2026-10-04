fn marcar(texto: &mut String) -> usize {
    let vista = &texto[..];
    texto.push('?');
    vista.len()
}