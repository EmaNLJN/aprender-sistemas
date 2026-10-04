fn costo_ruta(g:&[Vec<u8>])->Option<u32>{
    let filas=g.len();let cols=g.first()?.len();
    if cols==0 || g.iter().any(|r|r.len()!=cols) || g[0][0]==0 || g[filas-1][cols-1]==0{return None;}
    let mut costos=vec![vec![u32::MAX;cols];filas];costos[0][0]=0;
    let mut abiertos=vec![((filas+cols-2) as u32,0u32,0usize,0usize)];
    while !abiertos.is_empty(){
        let i=abiertos.iter().enumerate().min_by_key(|(_,n)|n.0).unwrap().0;
        let (_,c,f,x)=abiertos.remove(i);if c!=costos[f][x]{continue;}
        if f==filas-1 && x==cols-1{return Some(c);}
        for (df,dx) in [(-1isize,0isize),(0,1),(1,0),(0,-1)]{
            let Some(nf)=f.checked_add_signed(df) else{continue;};let Some(nx)=x.checked_add_signed(dx) else{continue;};
            if nf>=filas || nx>=cols || g[nf][nx]==0{continue;}
            let nuevo=c+u32::from(g[nf][nx]);if nuevo<costos[nf][nx]{costos[nf][nx]=nuevo;let h=(filas-1-nf+cols-1-nx) as u32;abiertos.push((nuevo+h,nuevo,nf,nx));}
        }
    }
    None
}