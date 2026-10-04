struct Paquete { total: u32 }
fn payload(p: &Paquete) -> u32 {
    p.total.saturating_sub(4)
}