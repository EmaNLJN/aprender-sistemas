#[derive(Debug, PartialEq)]
enum ErrorTamano { Vacio, DemasiadoGrande(u16) }
impl std::fmt::Display for ErrorTamano {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Vacio => write!(f, "tamano vacio"),
            Self::DemasiadoGrande(n) => write!(f, "tamano {} supera 64", n),
        }
    }
}
impl std::error::Error for ErrorTamano {}
fn validar_tamano(n: u16) -> Result<u16, ErrorTamano> {
    match n {
        0 => Err(ErrorTamano::Vacio),
        1..=64 => Ok(n),
        _ => Err(ErrorTamano::DemasiadoGrande(n)),
    }
}