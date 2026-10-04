#[derive(Clone)]
struct Token { position:u32, node:String }
fn token(position:u32,node:&str)->Token { Token { position,node:node.into() } }
fn owner(ring:&[Token],hash:u32)->Result<String,&'static str> {
    let mut sorted=ring.to_vec(); sorted.sort_by_key(|t|t.position);
    let _=hash; sorted.first().map(|t|t.node.clone()).ok_or("anillo vacío")
}