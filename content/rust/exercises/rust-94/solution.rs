use std::collections::VecDeque;
fn recientes(eventos: &[i32], limite: usize) -> Vec<i32> {
    let mut cola = VecDeque::new();
    if limite == 0 { return Vec::new(); }
    for &evento in eventos {
        if cola.len() == limite { cola.pop_front(); }
        cola.push_back(evento);
    }
    cola.into_iter().collect()
}