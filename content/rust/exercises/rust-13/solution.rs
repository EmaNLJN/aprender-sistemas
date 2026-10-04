fn duplicar_contador(original: i32) -> (i32, i32) {
    let mut aumentado = original;
    aumentado += 1;
    (original, aumentado)
}