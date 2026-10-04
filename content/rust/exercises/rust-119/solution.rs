use std::collections::VecDeque;
fn turnos(trabajo: &[u32], quantum: u32) -> Result<Vec<usize>, &'static str> {
    if quantum == 0 { return Err("quantum"); }
    let mut restante = trabajo.to_vec();
    let mut cola: VecDeque<usize> = (0..restante.len()).filter(|&i| restante[i] > 0).collect();
    let mut traza = Vec::new();
    while let Some(id) = cola.pop_front() {
        traza.push(id);
        restante[id] = restante[id].saturating_sub(quantum);
        if restante[id] > 0 { cola.push_back(id); }
    }
    Ok(traza)
}