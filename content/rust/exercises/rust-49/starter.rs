#[derive(Debug, PartialEq)]
enum Orden { Get(String), Set(String, String) }
fn parsear(linea: &str) -> Result<Orden, &'static str> {
    todo!()
}