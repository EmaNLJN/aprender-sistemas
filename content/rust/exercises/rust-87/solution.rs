fn posicion_insercion(datos: &[i32], objetivo: i32) -> usize {
    let (mut lo, mut hi) = (0, datos.len());
    while lo < hi {
        let mid = lo + (hi - lo) / 2;
        if datos[mid] < objetivo { lo = mid + 1; } else { hi = mid; }
    }
    lo
}