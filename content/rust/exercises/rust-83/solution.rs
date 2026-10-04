fn decodificar_rle(rachas: &[(char, usize)]) -> String {
    let mut texto = String::new();
    for &(ch, cantidad) in rachas {
        for _ in 0..cantidad { texto.push(ch); }
    }
    texto
}