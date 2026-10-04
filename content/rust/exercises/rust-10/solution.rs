fn velocidad(bytes: u32, segundos: u32) -> u32 {
    if segundos == 0 { return 0; }
    bytes / segundos
}