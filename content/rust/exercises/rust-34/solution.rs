use std::collections::BTreeSet;
fn unicos(datos: &[i32]) -> Vec<i32> {
    let conjunto: BTreeSet<i32> = datos.iter().copied().collect();
    conjunto.into_iter().collect()
}