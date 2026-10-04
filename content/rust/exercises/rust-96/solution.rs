use std::collections::VecDeque;
fn simular_lru(accesos: &[&str], capacidad: usize) -> Vec<String> {
    let mut orden: VecDeque<String> = VecDeque::new();
    if capacidad == 0 { return Vec::new(); }
    for &clave in accesos {
        if let Some(i) = orden.iter().position(|k| k == clave) { orden.remove(i); }
        else if orden.len() == capacidad { orden.pop_front(); }
        orden.push_back(clave.to_string());
    }
    orden.into_iter().collect()
}