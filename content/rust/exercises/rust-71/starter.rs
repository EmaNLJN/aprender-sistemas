use std::rc::Rc;
use std::cell::RefCell;
struct Recurso { id: u8, registro: Rc<RefCell<Vec<u8>>> }
impl Drop for Recurso {
    fn drop(&mut self) { todo!() }
}
fn cerrar(a: u8, b: u8, temprano: bool) -> Vec<u8> {
    let registro = Rc::new(RefCell::new(Vec::new()));
    {
        let primero = Recurso { id: a, registro: Rc::clone(&registro) };
        let _segundo = Recurso { id: b, registro: Rc::clone(&registro) };
        if temprano { todo!("liberar primero") }
    }
    let salida = registro.borrow().clone();
    salida
}