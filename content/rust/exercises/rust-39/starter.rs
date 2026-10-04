trait Bytes { fn bytes(&self) -> usize; }
struct Bloque { tamano: usize }
impl Bytes for Bloque {
    fn bytes(&self) -> usize { todo!() }
}
fn duplicado<T: Bytes>(valor: &T) -> usize {
    todo!()
}