#[derive(Debug, PartialEq)]
enum ErrorTamano { Vacio, DemasiadoGrande(u16) }
impl std::fmt::Display for ErrorTamano {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result { todo!() }
}
impl std::error::Error for ErrorTamano {}
fn validar_tamano(n: u16) -> Result<u16, ErrorTamano> { todo!() }