#[derive(Clone)]
struct Token { position:u32, node:String }
fn token(position:u32,node:&str)->Token { Token { position,node:node.into() } }
fn owner(ring:&[Token],hash:u32)->Result<String,&'static str> {
    if ring.is_empty() { return Err("anillo vacío"); }
    let mut sorted=ring.to_vec(); sorted.sort_by_key(|t|t.position);
    if sorted.iter().any(|t|t.node.is_empty()) || sorted.windows(2).any(|w|w[0].position==w[1].position) { return Err("anillo ambiguo"); }
    Ok(sorted.iter().find(|t|t.position>=hash).unwrap_or(&sorted[0]).node.clone())
}