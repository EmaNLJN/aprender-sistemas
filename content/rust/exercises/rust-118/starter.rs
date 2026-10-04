#[derive(Debug, Clone, PartialEq)]
struct Marco { retorno: usize, local: i32 }
fn llamar(pila: &mut Vec<Marco>, retorno: usize, local: i32, limite: usize) -> bool {
    todo!("agregar frame solo si es válido")
}
fn retornar(pila: &mut Vec<Marco>) -> Option<usize> {
    todo!("preservar frame raíz")
}