use std::collections::{HashSet, VecDeque};
fn explorar(aristas: &[(usize, usize)], inicio: usize) -> Vec<usize> {
    let mut pendientes = VecDeque::from([inicio]);
    let mut vistos = HashSet::from([inicio]);
    let mut orden = Vec::new();
    while let Some(nodo) = pendientes.pop_front() {
        orden.push(nodo);
        for &(desde, hasta) in aristas {
            if desde == nodo && vistos.insert(hasta) { pendientes.push_back(hasta); }
        }
    }
    orden
}