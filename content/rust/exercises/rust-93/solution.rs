fn leer_frame(datos: &[u8]) -> Result<(Vec<u8>, usize), &'static str> {
    if datos.len() < 2 { return Err("cabecera"); }
    let largo = usize::from(u16::from_be_bytes([datos[0], datos[1]]));
    let fin = 2 + largo;
    if datos.len() < fin { return Err("datos"); }
    Ok((datos[2..fin].to_vec(), fin))
}