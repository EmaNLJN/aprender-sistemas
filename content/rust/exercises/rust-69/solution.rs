use std::marker::PhantomPinned;
struct Fijo { valor: i32, _pin: PhantomPinned }
fn inspeccionar_pin(valor: i32) -> (bool, i32) {
    let original = Box::pin(Fijo { valor, _pin: PhantomPinned });
    let antes: *const Fijo = original.as_ref().get_ref();
    let movido = original;
    let despues: *const Fijo = movido.as_ref().get_ref();
    (antes == despues, movido.as_ref().get_ref().valor)
}