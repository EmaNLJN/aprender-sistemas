use std::collections::HashMap;
#[derive(Default)]
struct CacheTtl { datos: HashMap<String, (i32, u64)> }
impl CacheTtl {
    fn poner(&mut self, clave: &str, valor: i32, ahora: u64, ttl: u64) -> Result<(), &'static str> {
        let vence = ahora.checked_add(ttl).ok_or("tiempo")?;
        self.datos.insert(clave.to_string(), (valor, vence));
        Ok(())
    }
    fn leer(&mut self, clave: &str, ahora: u64) -> Option<i32> {
        match self.datos.get(clave).copied() {
            Some((valor, vence)) if ahora < vence => Some(valor),
            Some(_) => { self.datos.remove(clave); None }
            None => None,
        }
    }
}