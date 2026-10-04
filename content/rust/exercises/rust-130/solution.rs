fn pixeles(mut x0:i32,mut y0:i32,x1:i32,y1:i32)->Vec<(i32,i32)> {
    let dx=(x1-x0).abs(); let dy=-(y1-y0).abs();
    let sx=if x0<x1 {1}else{-1}; let sy=if y0<y1 {1}else{-1};
    let mut error=dx+dy; let mut salida=Vec::new();
    loop {
        salida.push((x0,y0)); if x0==x1 && y0==y1 {break;}
        let e2=2*error;
        if e2>=dy {error+=dy; x0+=sx;}
        if e2<=dx {error+=dx; y0+=sy;}
    }
    salida
}