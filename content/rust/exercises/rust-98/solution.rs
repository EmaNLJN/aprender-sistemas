use std::collections::BTreeMap;
struct Registro { secuencia: u64, clave: String, valor: Option<i32> }
fn reg(secuencia: u64, clave: &str, valor: Option<i32>) -> Registro { Registro { secuencia, clave: clave.to_string(), valor } }
fn reconstruir(registros: &[Registro]) -> Result<BTreeMap<String, i32>, &'static str> {
    let mut estado = BTreeMap::new();
    for (i, registro) in registros.iter().enumerate() {
        if registro.secuencia != i as u64 + 1 { return Err("secuencia"); }
        match registro.valor {
            Some(v) => { estado.insert(registro.clave.clone(), v); }
            None => { estado.remove(&registro.clave); }
        }
    }
    Ok(estado)
}