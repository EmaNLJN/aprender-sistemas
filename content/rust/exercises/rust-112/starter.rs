#[derive(Clone, Copy)]
enum Instruccion { Sumar(i32), Saltar(usize), SiCero(usize), Fin }
fn ejecutar_vm(programa: &[Instruccion], presupuesto: usize) -> Result<(i32, usize), &'static str> {
    todo!("interpretar sin superar el presupuesto")
}