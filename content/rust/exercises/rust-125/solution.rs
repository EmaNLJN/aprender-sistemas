struct Fragment { index: usize, data: Vec<u8> }
fn fragment(index:usize,data:&[u8])->Fragment { Fragment { index, data:data.to_vec() } }
fn assemble(total:usize,parts:&[Fragment])->Result<Option<Vec<u8>>,&'static str> {
    if total>1024 { return Err("total inválido"); }
    let mut slots:Vec<Option<Vec<u8>>>=vec![None;total];
    for part in parts {
        let slot=slots.get_mut(part.index).ok_or("índice inválido")?;
        if let Some(previous)=slot { if previous.as_slice()!=part.data.as_slice() { return Err("duplicado contradictorio"); } }
        else { *slot=Some(part.data.clone()); }
    }
    if slots.iter().any(Option::is_none) { return Ok(None); }
    let mut result=Vec::new();
    for slot in slots { result.extend(slot.unwrap()); }
    Ok(Some(result))
}