fn reconstruir_ruta(prev: &[Option<usize>], inicio: usize, fin: usize) -> Option<Vec<usize>> {
    if inicio >= prev.len() || fin >= prev.len() { return None; }
    let mut actual = fin;
    let mut ruta = Vec::new();
    for _ in 0..prev.len() {
        ruta.push(actual);
        if actual == inicio { ruta.reverse(); return Some(ruta); }
        actual = prev.get(actual).copied().flatten()?;
    }
    None
}