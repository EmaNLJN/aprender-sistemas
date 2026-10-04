fn atender_irq(pendientes: u8, habilitadas: u8) -> (Option<u8>, u8) {
    let candidatas = pendientes & habilitadas;
    if candidatas == 0 { return (None, pendientes); }
    let indice = candidatas.trailing_zeros() as u8;
    (Some(indice), pendientes & !(1u8 << indice))
}