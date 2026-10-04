use std::collections::BTreeMap;
enum Cambio { Poner(String, i32), Sumar(String, i32), Borrar(String) }
fn aplicar_lote(datos: &mut BTreeMap<String, i32>, cambios: &[Cambio]) -> Result<(), &'static str> {
    let mut preparado = datos.clone();
    for cambio in cambios {
        match cambio {
            Cambio::Poner(clave, valor) => { preparado.insert(clave.clone(), *valor); }
            Cambio::Sumar(clave, delta) => {
                let actual = preparado.get(clave).copied().ok_or("ausente")?;
                let nuevo = actual.checked_add(*delta).ok_or("overflow")?;
                preparado.insert(clave.clone(), nuevo);
            }
            Cambio::Borrar(clave) => { preparado.remove(clave); }
        }
    }
    *datos = preparado;
    Ok(())
}