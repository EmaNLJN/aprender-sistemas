fn puerto(texto: &str) -> Result<u16, &'static str> {
    let n = texto.trim().parse::<u16>().map_err(|_| "numero")?;
    if n == 0 { Err("cero") } else { Ok(n) }
}