fn simular_lru(accesos: &[i32], capacidad: usize) -> (Vec<i32>, usize, usize) {
    let mut orden = Vec::new();
    let (mut hits, mut misses) = (0, 0);
    for &clave in accesos {
        if let Some(i) = orden.iter().position(|&x| x == clave) {
            hits += 1; orden.remove(i); orden.push(clave);
        } else {
            misses += 1;
            if capacidad > 0 {
                if orden.len() == capacidad { orden.remove(0); }
                orden.push(clave);
            }
        }
    }
    (orden, hits, misses)
}