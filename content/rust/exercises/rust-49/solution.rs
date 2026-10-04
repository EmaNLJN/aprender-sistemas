#[derive(Debug, PartialEq)]
enum Orden { Get(String), Set(String, String) }
fn parsear(linea: &str) -> Result<Orden, &'static str> {
    let partes: Vec<&str> = linea.split_whitespace().collect();
    match partes.as_slice() {
        ["GET", clave] => Ok(Orden::Get((*clave).to_string())),
        ["SET", clave, valor] => Ok(Orden::Set((*clave).to_string(), (*valor).to_string())),
        _ => Err("orden"),
    }
}