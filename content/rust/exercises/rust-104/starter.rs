fn empaquetar(tipo: u8, banderas: u8) -> Option<u8> {
    if tipo > 15 || banderas > 15 { return None; }
    Some(tipo | banderas)
}