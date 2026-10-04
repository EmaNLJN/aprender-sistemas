#[derive(Debug, PartialEq)]
enum Luz { Rojo, Verde, Amarillo }
fn siguiente(luz: Luz) -> Luz {
    match luz {
        Luz::Rojo => Luz::Verde,
        Luz::Verde => Luz::Amarillo,
        Luz::Amarillo => Luz::Rojo,
    }
}