use std::collections::BTreeMap;
struct Registro { secuencia: u64, clave: String, valor: Option<i32> }
fn reg(secuencia: u64, clave: &str, valor: Option<i32>) -> Registro { Registro { secuencia, clave: clave.to_string(), valor } }
fn reconstruir(registros: &[Registro]) -> Result<BTreeMap<String, i32>, &'static str> {
    todo!()
}