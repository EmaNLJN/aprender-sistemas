mod config {
    pub struct Config { capacidad: usize }
    impl Config {
        pub fn nueva(n: usize) -> Option<Self> {
            if (1..=100).contains(&n) { Some(Self { capacidad: n }) } else { None }
        }
        pub fn capacidad(&self) -> usize { self.capacidad }
    }
}
fn capacidad_valida(n: usize) -> Option<usize> {
    config::Config::nueva(n).map(|c| c.capacidad())
}