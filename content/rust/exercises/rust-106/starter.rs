fn checksum(datos: &[u8]) -> u8 {
    datos.iter().fold(0u8, |a, &b| a.rotate_left(1) ^ b)
}
fn abrir_paquete(datos: &[u8]) -> Result<(u8, Vec<u8>), &'static str> {
    todo!("validar y abrir el paquete")
}