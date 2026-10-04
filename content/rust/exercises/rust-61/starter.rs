mod config {
    pub struct Config { capacidad: usize }
    impl Config {
        pub fn nueva(n: usize) -> Option<Self> { todo!() }
        pub fn capacidad(&self) -> usize { todo!() }
    }
}
fn capacidad_valida(n: usize) -> Option<usize> {
    config::Config::nueva(n).map(|c| c.capacidad())
}