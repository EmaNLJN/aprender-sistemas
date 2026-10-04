fn dividir(a: u32, b: u32) -> Result<u32, &'static str> {
    if b == 0 { Err("divisor cero") } else { Ok(a / b) }
}