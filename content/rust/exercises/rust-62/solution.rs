mod protocolo {
    mod interno {
        #[derive(Debug, PartialEq)]
        pub enum Estado { Listo, Cerrado }
    }
    pub use self::interno::Estado;
}
fn estado_listo() -> protocolo::Estado { protocolo::Estado::Listo }