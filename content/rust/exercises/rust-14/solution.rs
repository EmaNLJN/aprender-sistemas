fn versiones(original: String) -> (String, String) {
    let mut nueva = original.clone();
    nueva.push_str("-v2");
    (original, nueva)
}