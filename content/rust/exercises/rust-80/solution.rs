fn mcd(mut a: u32, mut b: u32) -> u32 {
    while b != 0 {
        let resto = a % b;
        a = b;
        b = resto;
    }
    a
}