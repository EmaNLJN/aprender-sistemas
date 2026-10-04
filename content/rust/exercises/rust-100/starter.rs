use std::collections::BTreeMap;
enum Cambio { Poner(String, i32), Sumar(String, i32), Borrar(String) }
fn aplicar_lote(datos: &mut BTreeMap<String, i32>, cambios: &[Cambio]) -> Result<(), &'static str> {
    todo!()
}