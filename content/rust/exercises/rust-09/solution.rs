fn capacidad(n: u32) -> u32 {
    let mut potencia = 1;
    loop {
        if potencia >= n { break potencia; }
        potencia *= 2;
    }
}