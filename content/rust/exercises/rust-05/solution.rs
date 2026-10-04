fn paquetes(bytes: u32) -> (u32, u32) {
    (bytes / 64, bytes % 64)
}