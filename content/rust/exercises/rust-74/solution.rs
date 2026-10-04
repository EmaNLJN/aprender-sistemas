fn sumar_politicas(a: u8, b: u8) -> (Option<u8>, u8, u8) {
    (a.checked_add(b), a.saturating_add(b), a.wrapping_add(b))
}