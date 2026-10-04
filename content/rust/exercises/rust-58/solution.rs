fn sumar_filas<const R: usize, const C: usize>(matriz: [[i32; C]; R]) -> [i32; R] {
    let mut salida = [0; R];
    for (i, fila) in matriz.iter().enumerate() {
        salida[i] = fila.iter().sum();
    }
    salida
}