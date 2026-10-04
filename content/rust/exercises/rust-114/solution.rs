fn primer_ajuste(huecos: &[(u64, u64)], pedido: u64, alineacion: u64) -> Option<(usize, u64)> {
    if pedido == 0 || !alineacion.is_power_of_two() { return None; }
    for (i, &(inicio, largo)) in huecos.iter().enumerate() {
        if inicio.checked_add(largo).is_none() { continue; }
        let resto = inicio % alineacion;
        let padding = if resto == 0 { 0 } else { alineacion - resto };
        if padding <= largo && pedido <= largo - padding {
            if let Some(direccion) = inicio.checked_add(padding) { return Some((i, direccion)); }
        }
    }
    None
}