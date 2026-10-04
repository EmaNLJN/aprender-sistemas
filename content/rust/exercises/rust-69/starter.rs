use std::marker::PhantomPinned;
struct Fijo { valor: i32, _pin: PhantomPinned }
fn inspeccionar_pin(valor: i32) -> (bool, i32) {
    todo!()
}