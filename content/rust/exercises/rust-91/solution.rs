fn decimal(texto: &str) -> Result<u32, &'static str> {
    if texto.is_empty() { return Err("vacio"); }
    let mut total = 0u32;
    for byte in texto.bytes() {
        if !byte.is_ascii_digit() { return Err("digito"); }
        total = total.checked_mul(10)
            .and_then(|n| n.checked_add(u32::from(byte - b'0')))
            .ok_or("overflow")?;
    }
    Ok(total)
}