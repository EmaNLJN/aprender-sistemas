#[derive(Clone, Copy)]
enum Instruccion { Sumar(i32), Saltar(usize), SiCero(usize), Fin }
#[derive(Debug, Clone, Copy, PartialEq)]
struct Estado { pc: usize, acumulador: i32, detenido: bool }
fn avanzar(estado: &mut Estado, instruccion: Instruccion) -> Result<(), &'static str> {
    todo!("preparar y confirmar una transición")
}