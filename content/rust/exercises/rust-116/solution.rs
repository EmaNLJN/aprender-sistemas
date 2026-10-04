#[derive(Debug, PartialEq)]
struct Entrada { asid: u16, vpn: u64, marco: u64 }
fn invalidar(tlb: &mut Vec<Entrada>, asid: u16, vpn: Option<u64>) -> usize {
    let antes = tlb.len();
    tlb.retain(|e| !(e.asid == asid && vpn.is_none_or(|pagina| e.vpn == pagina)));
    antes - tlb.len()
}