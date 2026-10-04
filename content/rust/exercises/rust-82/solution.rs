fn codificar_rle(texto: &str) -> Vec<(char, usize)> {
    let mut rachas: Vec<(char, usize)> = Vec::new();
    for ch in texto.chars() {
        match rachas.last_mut() {
            Some((previo, cantidad)) if *previo == ch => *cantidad += 1,
            _ => rachas.push((ch, 1)),
        }
    }
    rachas
}