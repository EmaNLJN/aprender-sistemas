fn total_mediciones(datos: &[i32]) -> i32 {
    let mut total = 0;
    for &dato in datos { total += dato; }
    total
}