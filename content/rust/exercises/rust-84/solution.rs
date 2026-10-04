fn palabra_larga(texto: &str) -> Option<&str> {
    let mut mejor = None;
    let mut largo = 0;
    for palabra in texto.split_whitespace() {
        let actual = palabra.chars().count();
        if actual > largo { mejor = Some(palabra); largo = actual; }
    }
    mejor
}