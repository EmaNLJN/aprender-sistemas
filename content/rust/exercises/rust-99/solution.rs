fn escribir_versionado(estado: &mut (i32, u64), esperada: u64, nuevo: i32) -> Result<u64, &'static str> {
    if estado.1 != esperada { return Err("conflicto"); }
    let siguiente = estado.1.checked_add(1).ok_or("version")?;
    *estado = (nuevo, siguiente);
    Ok(siguiente)
}