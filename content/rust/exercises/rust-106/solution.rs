fn checksum(datos: &[u8]) -> u8 {
    datos.iter().fold(0u8, |a, &b| a.rotate_left(1) ^ b)
}
fn abrir_paquete(datos: &[u8]) -> Result<(u8, Vec<u8>), &'static str> {
    if datos.len() < 3 { return Err("largo"); }
    if datos[0] >> 4 != 1 { return Err("version"); }
    if datos.len() != usize::from(datos[1]) + 3 { return Err("largo"); }
    let fin = datos.len() - 1;
    if checksum(&datos[..fin]) != datos[fin] { return Err("checksum"); }
    Ok((datos[0] & 0x0F, datos[2..fin].to_vec()))
}