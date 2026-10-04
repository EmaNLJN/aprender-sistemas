fn valor(n:usize)->i32{if n==0{return -1;}let mut mejor=-2;for k in 1..=2.min(n){mejor=mejor.max(-valor(n-k));}mejor}
fn mejor_jugada(n:usize)->Option<usize>{
    if n==0{return None;}let mut elegida=1;let mut mejor=-2;
    for k in 1..=2.min(n){let v=-valor(n-k);if v>mejor{mejor=v;elegida=k;}}
    Some(elegida)
}