fn limpiar(datos: &mut Vec<i32>) {
    datos.retain(|x| *x >= 0);
}