fn balanceado(texto: &str) -> bool {
    let mut pila = Vec::new();
    for ch in texto.chars() {
        match ch {
            '(' | '[' | '{' => pila.push(ch),
            ')' | ']' | '}' => {
                let esperado = match ch { ')' => '(', ']' => '[', _ => '{' };
                if pila.pop() != Some(esperado) { return false; }
            }
            _ => {}
        }
    }
    pila.is_empty()
}