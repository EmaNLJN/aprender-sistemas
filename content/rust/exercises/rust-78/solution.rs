fn actualizar(estado: u8, mascara: u8, habilitar: bool) -> u8 {
    if habilitar { estado | mascara } else { estado & !mascara }
}