enum Mensaje { Ping, Datos(usize), Cerrar }
fn costo_mensaje(m: Mensaje) -> usize {
    match m {
        Mensaje::Ping => 1,
        Mensaje::Datos(n) => n,
        Mensaje::Cerrar => 0,
    }
}