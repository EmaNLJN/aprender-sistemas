#[derive(Clone, Copy)]
enum Instruccion { Sumar(i32), Saltar(usize), SiCero(usize), Fin }
fn ejecutar_vm(programa: &[Instruccion], presupuesto: usize) -> Result<(i32, usize), &'static str> {
    let mut pc = 0usize;
    let mut acumulador = 0i32;
    let mut ejecutadas = 0usize;
    loop {
        let instruccion = *programa.get(pc).ok_or("pc")?;
        if ejecutadas == presupuesto { return Err("presupuesto"); }
        ejecutadas += 1;
        match instruccion {
            Instruccion::Sumar(n) => {
                acumulador = acumulador.checked_add(n).ok_or("overflow")?;
                pc += 1;
            }
            Instruccion::Saltar(destino) => pc = destino,
            Instruccion::SiCero(destino) => {
                pc = if acumulador == 0 { destino } else { pc + 1 };
            }
            Instruccion::Fin => return Ok((acumulador, ejecutadas)),
        }
    }
}