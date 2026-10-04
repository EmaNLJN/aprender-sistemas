fn cruzar_hangar(ordenes: &str, mut bateria: u32) -> (i32, i32, u32) {
    let (mut x, mut y) = (0, 0);
    for orden in ordenes.chars() {
        let (nx, ny) = match orden {
            'N' => (x, y + 1), 'S' => (x, y - 1),
            'E' => (x + 1, y), 'O' => (x - 1, y),
            _ => continue,
        };
        if bateria > 0 && (0..=2).contains(&nx) && (0..=2).contains(&ny) {
            x = nx; y = ny; bateria -= 1;
        }
    }
    (x, y, bateria)
}