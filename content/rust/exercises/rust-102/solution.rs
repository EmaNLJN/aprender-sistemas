fn agregar(inventario: &mut [u8; 3], compartimiento: usize, cantidad: u8) -> bool {
    let Some(actual) = inventario.get_mut(compartimiento) else { return false; };
    let Some(nuevo) = actual.checked_add(cantidad) else { return false; };
    *actual = nuevo;
    true
}