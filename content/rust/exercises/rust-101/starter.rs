fn paso(x: i32, y: i32, direccion: char) -> (i32, i32) {
    match direccion {
        'N' => (x + 1, y),
        'S' => (x, y - 1),
        'E' => (x, y + 1),
        'O' => (x - 1, y),
        _ => (x, y),
    }
}