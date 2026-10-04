fn sumar_digitos(mut n: u64) -> u32 {
    let mut suma = 0u32;
    while n > 0 {
        suma += (n % 10) as u32;
        n /= 10;
    }
    suma
}