fn procesar_pila(tareas: &[i32]) -> Vec<i32> {
    let mut pila = tareas.to_vec();
    let mut salida = Vec::new();
    while let Some(tarea) = pila.pop() { salida.push(tarea); }
    salida
}