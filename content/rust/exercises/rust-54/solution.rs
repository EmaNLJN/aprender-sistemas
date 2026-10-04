use std::rc::Rc;
fn vida_debil(texto: String) -> (bool, bool) {
    let fuerte = Rc::new(texto);
    let debil = Rc::downgrade(&fuerte);
    let antes = debil.upgrade().is_some();
    drop(fuerte);
    let despues = debil.upgrade().is_some();
    (antes, despues)
}