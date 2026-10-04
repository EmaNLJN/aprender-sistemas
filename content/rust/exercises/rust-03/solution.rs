fn costo(cantidad: i32) -> i32 {
    let total = {
        let productos = cantidad * 12;
        productos + 5
    };
    total
}