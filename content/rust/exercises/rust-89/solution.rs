fn mejor_ventana(datos: &[i32], k: usize) -> Option<i64> {
    if k == 0 || k > datos.len() { return None; }
    datos.windows(k).map(|w| w.iter().map(|&x| i64::from(x)).sum()).max()
}