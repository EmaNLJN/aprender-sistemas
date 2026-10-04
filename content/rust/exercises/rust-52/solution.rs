use std::rc::Rc;
fn observar_rc(texto: String) -> (usize, bool, usize) {
    let original = Rc::new(texto);
    let copia = Rc::clone(&original);
    let durante = Rc::strong_count(&original);
    let mismo = Rc::ptr_eq(&original, &copia);
    drop(copia);
    (durante, mismo, Rc::strong_count(&original))
}