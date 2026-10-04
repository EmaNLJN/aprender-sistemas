fn suma_hasta(n: u32) -> u32 {
    let mut total = 0;
    for x in 1..=n { total += x; }
    total
}