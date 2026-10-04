enum Lista { Fin, Nodo(i32, Box<Lista>) }
fn longitud_lista(lista: &Lista) -> usize {
    match lista {
        Lista::Fin => 0,
        Lista::Nodo(_, cola) => 1 + longitud_lista(cola),
    }
}