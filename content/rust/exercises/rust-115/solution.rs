struct Pagina { marco: u64, presente: bool, escritura: bool }
fn traducir(tabla: &[Pagina], tamano: u64, va: u64, escribir: bool) -> Result<u64, &'static str> {
    if !tamano.is_power_of_two() { return Err("tamano"); }
    let vpn = usize::try_from(va / tamano).map_err(|_| "pagina")?;
    let pagina = tabla.get(vpn).ok_or("pagina")?;
    if !pagina.presente { return Err("ausente"); }
    if escribir && !pagina.escritura { return Err("permiso"); }
    pagina.marco.checked_mul(tamano).and_then(|base| base.checked_add(va % tamano)).ok_or("overflow")
}