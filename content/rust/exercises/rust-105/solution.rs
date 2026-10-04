fn checksum(datos: &[u8]) -> u8 {
    datos.iter().fold(0u8, |acumulado, &byte| acumulado.rotate_left(1) ^ byte)
}