use std::collections::VecDeque;
fn ruta_corta(mapa: &[Vec<bool>], inicio: (usize, usize), fin: (usize, usize)) -> Option<usize> {
    let filas = mapa.len();
    let columnas = mapa.first()?.len();
    if columnas == 0 || mapa.iter().any(|fila| fila.len() != columnas) { return None; }
    for (f, c) in [inicio, fin] {
        if f >= filas || c >= columnas || !mapa[f][c] { return None; }
    }
    let mut vistos = vec![vec![false; columnas]; filas];
    let mut cola = VecDeque::from([(inicio.0, inicio.1, 0usize)]);
    vistos[inicio.0][inicio.1] = true;
    while let Some((f, c, distancia)) = cola.pop_front() {
        if (f, c) == fin { return Some(distancia); }
        for (df, dc) in [(-1isize, 0isize), (0, 1), (1, 0), (0, -1)] {
            let Some(nf) = f.checked_add_signed(df) else { continue; };
            let Some(nc) = c.checked_add_signed(dc) else { continue; };
            if nf < filas && nc < columnas && mapa[nf][nc] && !vistos[nf][nc] {
                vistos[nf][nc] = true;
                cola.push_back((nf, nc, distancia + 1));
            }
        }
    }
    None
}