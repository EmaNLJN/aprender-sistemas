trait Tarifa { fn costo(&self) -> u32; }
struct Fija(u32);
struct PorByte { bytes: u32, precio: u32 }
impl Tarifa for Fija { fn costo(&self) -> u32 { todo!() } }
impl Tarifa for PorByte { fn costo(&self) -> u32 { todo!() } }
fn total(tarifas: &[Box<dyn Tarifa>]) -> u32 { todo!() }