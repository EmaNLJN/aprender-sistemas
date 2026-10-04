fn fusionar(a: &[i32], b: &[i32]) -> Vec<i32> {
    let mut salida = Vec::new();
    let (mut i, mut j) = (0, 0);
    while i < a.len() && j < b.len() {
        if a[i] <= b[j] { salida.push(a[i]); i += 1; }
        else { salida.push(b[j]); j += 1; }
    }
    salida.extend_from_slice(&a[i..]);
    salida.extend_from_slice(&b[j..]);
    salida
}