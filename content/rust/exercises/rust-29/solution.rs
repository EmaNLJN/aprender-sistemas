fn sumar_texto(a: &str, b: &str) -> Result<i32, &'static str> {
    let a = a.parse::<i32>().map_err(|_| "numero")?;
    let b = b.parse::<i32>().map_err(|_| "numero")?;
    a.checked_add(b).ok_or("overflow")
}