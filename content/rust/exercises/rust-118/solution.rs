#[derive(Debug, Clone, PartialEq)]
struct Marco { retorno: usize, local: i32 }
fn llamar(pila: &mut Vec<Marco>, retorno: usize, local: i32, limite: usize) -> bool {
    if pila.is_empty() || pila.len() >= limite { return false; }
    pila.push(Marco { retorno, local });
    true
}
fn retornar(pila: &mut Vec<Marco>) -> Option<usize> {
    if pila.len() <= 1 { return None; }
    pila.pop().map(|marco| marco.retorno)
}