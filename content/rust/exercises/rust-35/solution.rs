use std::collections::VecDeque;
fn atender(tareas: &[i32], limite: usize) -> Vec<i32> {
    let mut cola: VecDeque<i32> = tareas.iter().copied().collect();
    let mut salida = Vec::new();
    for _ in 0..limite {
        match cola.pop_front() { Some(x) => salida.push(x), None => break }
    }
    salida
}