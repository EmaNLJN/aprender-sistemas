fn alarmas(datos: &[i32], umbral: i32) -> usize {
    datos.iter().copied().filter(|x| *x >= umbral).count()
}