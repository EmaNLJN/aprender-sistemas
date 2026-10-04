use std::cell::RefCell;
fn intentar_incrementar(celda: &RefCell<i32>) -> bool {
    match celda.try_borrow_mut() {
        Ok(mut valor) => { *valor += 1; true }
        Err(_) => false,
    }
}