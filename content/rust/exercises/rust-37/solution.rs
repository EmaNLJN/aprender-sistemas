fn energia_positiva(datos: &[i32]) -> i32 {
    datos.iter().copied().filter(|x| *x > 0).map(|x| x * x).sum()
}