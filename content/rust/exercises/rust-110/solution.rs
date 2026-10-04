#[derive(Debug, PartialEq)]
enum Op { Fin, Sumar(i32), Saltar(usize), SiCero(usize) }
fn decodificar(bytes: &[u8], pc: usize) -> Result<(Op, usize), &'static str> {
    let codigo = *bytes.get(pc).ok_or("pc")?;
    match codigo {
        0 => Ok((Op::Fin, pc + 1)),
        1..=3 => {
            let valor = *bytes.get(pc + 1).ok_or("operando")?;
            let op = match codigo {
                1 => Op::Sumar(valor as i8 as i32),
                2 => Op::Saltar(usize::from(valor)),
                _ => Op::SiCero(usize::from(valor)),
            };
            Ok((op, pc + 2))
        }
        _ => Err("opcode"),
    }
}