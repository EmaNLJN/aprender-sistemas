fn validar_bytecode(bytes: &[u8]) -> Result<Vec<usize>, &'static str> {
    if bytes.is_empty() { return Err("vacio"); }
    let (mut inicios, mut saltos) = (Vec::new(), Vec::new());
    let mut pc = 0;
    while pc < bytes.len() {
        inicios.push(pc);
        match bytes[pc] {
            0 | 2 => pc += 1,
            1 | 3 => {
                let operando = *bytes.get(pc + 1).ok_or("operando")?;
                if bytes[pc] == 3 { saltos.push(usize::from(operando)); }
                pc += 2;
            }
            _ => return Err("opcode"),
        }
    }
    if saltos.iter().any(|destino| !inicios.contains(destino)) { return Err("salto"); }
    Ok(inicios)
}