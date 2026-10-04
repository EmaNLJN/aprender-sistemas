use std::collections::VecDeque;
trait Fuente { type Item; fn siguiente(&mut self) -> Option<Self::Item>; }
struct Textos(VecDeque<String>);
impl Fuente for Textos {
    type Item = String;
    fn siguiente(&mut self) -> Option<String> { self.0.pop_front() }
}
fn leer_dos<F: Fuente>(fuente: &mut F) -> Vec<F::Item> {
    let mut salida = Vec::new();
    for _ in 0..2 {
        match fuente.siguiente() { Some(x) => salida.push(x), None => break }
    }
    salida
}