enum Estado { Esperando, Ejecutando, Terminado }
fn prioridad(e: Estado) -> u8 {
    match e {
        Estado::Esperando => 1,
        Estado::Ejecutando => 2,
    }
}