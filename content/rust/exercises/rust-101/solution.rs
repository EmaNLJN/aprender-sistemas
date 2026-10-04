fn paso(x: i32, y: i32, direccion: char) -> (i32, i32) {
    match direccion {
        'N' => (x, y + 1),
        'S' => (x, y - 1),
        'E' => (x + 1, y),
        'O' => (x - 1, y),
        _ => (x, y),
    }
}