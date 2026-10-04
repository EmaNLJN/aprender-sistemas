use std::collections::HashSet;
fn pareja(datos: &[i32], objetivo: i32) -> Option<(i32, i32)> {
    let mut vistos = HashSet::new();
    for &actual in datos {
        let anterior = objetivo - actual;
        if vistos.contains(&anterior) { return Some((anterior, actual)); }
        vistos.insert(actual);
    }
    None
}