use std::collections::VecDeque;
trait Fuente { type Item; fn siguiente(&mut self) -> Option<Self::Item>; }
struct Textos(VecDeque<String>);
impl Fuente for Textos {
    type Item = String;
    fn siguiente(&mut self) -> Option<String> { todo!() }
}
fn leer_dos<F: Fuente>(fuente: &mut F) -> Vec<F::Item> { todo!() }