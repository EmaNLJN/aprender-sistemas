fn nibble(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}
fn desde_hex(texto: &str) -> Result<Vec<u8>, &'static str> {
    let bytes = texto.as_bytes();
    if bytes.len() % 2 != 0 { return Err("largo"); }
    let mut salida = Vec::new();
    for par in bytes.chunks_exact(2) {
        let alto = nibble(par[0]).ok_or("digito")?;
        let bajo = nibble(par[1]).ok_or("digito")?;
        salida.push((alto << 4) | bajo);
    }
    Ok(salida)
}