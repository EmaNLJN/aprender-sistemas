fn transformar<T, F>(datos: Vec<T>, mut f: F) -> Vec<T>
where F: FnMut(T) -> T {
    let mut salida = Vec::new();
    for dato in datos { salida.push(f(dato)); }
    salida
}