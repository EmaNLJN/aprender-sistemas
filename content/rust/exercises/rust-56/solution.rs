trait Tarifa { fn costo(&self) -> u32; }
struct Fija(u32);
struct PorByte { bytes: u32, precio: u32 }
impl Tarifa for Fija { fn costo(&self) -> u32 { self.0 } }
impl Tarifa for PorByte { fn costo(&self) -> u32 { self.bytes * self.precio } }
fn total(tarifas: &[Box<dyn Tarifa>]) -> u32 {
    tarifas.iter().map(|t| t.costo()).sum()
}