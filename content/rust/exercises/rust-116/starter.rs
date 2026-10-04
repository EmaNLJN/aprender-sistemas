#[derive(Debug, PartialEq)]
struct Entrada { asid: u16, vpn: u64, marco: u64 }
fn invalidar(tlb: &mut Vec<Entrada>, asid: u16, vpn: Option<u64>) -> usize {
    todo!("filtrar por ASID y VPN; None significa todo el espacio")
}