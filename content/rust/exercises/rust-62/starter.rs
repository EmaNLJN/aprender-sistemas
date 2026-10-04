mod protocolo {
    mod interno {
        #[derive(Debug, PartialEq)]
        pub enum Estado { Listo, Cerrado }
    }
    // Reexportar Estado aquí.
}
fn estado_listo() -> protocolo::Estado { protocolo::Estado::Listo }