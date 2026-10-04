struct Fragment { index: usize, data: Vec<u8> }
fn fragment(index:usize,data:&[u8])->Fragment { Fragment { index, data:data.to_vec() } }
fn assemble(total:usize,parts:&[Fragment])->Result<Option<Vec<u8>>,&'static str> {
    if total>1024 || parts.iter().any(|p|p.index>=total) { return Err("índice o total inválido"); }
    if parts.len()<total { return Ok(None); }
    Ok(Some(parts.iter().flat_map(|p|p.data.iter().copied()).collect()))
}