#[derive(Clone, Copy)]
enum Instruccion { Sumar(i32), Saltar(usize), SiCero(usize), Fin }
#[derive(Debug, Clone, Copy, PartialEq)]
struct Estado { pc: usize, acumulador: i32, detenido: bool }
fn avanzar(estado: &mut Estado, instruccion: Instruccion) -> Result<(), &'static str> {
    if estado.detenido { return Ok(()); }
    let mut siguiente = *estado;
    match instruccion {
        Instruccion::Sumar(n) => {
            siguiente.acumulador = siguiente.acumulador.checked_add(n).ok_or("overflow")?;
            siguiente.pc = siguiente.pc.checked_add(1).ok_or("pc")?;
        }
        Instruccion::Saltar(destino) => siguiente.pc = destino,
        Instruccion::SiCero(destino) => {
            siguiente.pc = if siguiente.acumulador == 0 { destino }
                else { siguiente.pc.checked_add(1).ok_or("pc")? };
        }
        Instruccion::Fin => siguiente.detenido = true,
    }
    *estado = siguiente;
    Ok(())
}