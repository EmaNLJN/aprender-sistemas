fn evaluar_rpn(texto: &str) -> Result<i32, &'static str> {
    let mut pila: Vec<i32> = Vec::new();
    for token in texto.split_whitespace() {
        if matches!(token, "+" | "-" | "*") {
            let derecho = pila.pop().ok_or("pila")?;
            let izquierdo = pila.pop().ok_or("pila")?;
            let valor = match token {
                "+" => izquierdo.checked_add(derecho),
                "-" => izquierdo.checked_sub(derecho),
                _ => izquierdo.checked_mul(derecho),
            }.ok_or("overflow")?;
            pila.push(valor);
        } else { pila.push(token.parse::<i32>().map_err(|_| "token")?); }
    }
    if pila.len() != 1 { return Err("pila"); }
    Ok(pila[0])
}