use std::collections::HashMap;
#[derive(Default)]
struct CacheTtl { datos: HashMap<String, (i32, u64)> }
impl CacheTtl {
    fn poner(&mut self, clave: &str, valor: i32, ahora: u64, ttl: u64) -> Result<(), &'static str> { todo!() }
    fn leer(&mut self, clave: &str, ahora: u64) -> Option<i32> { todo!() }
}