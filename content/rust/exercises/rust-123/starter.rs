fn quorums_intersect(n:u64,w:u64,r:u64)->Result<bool,&'static str> {
    if n==0 || w==0 || r==0 || w>n || r>n { return Err("configuración inválida"); }
    Ok(w.saturating_add(r)>=n)
}