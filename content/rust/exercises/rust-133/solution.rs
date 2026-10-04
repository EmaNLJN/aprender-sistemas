fn interseccion(a:[i32;4],b:[i32;4])->Option<[i32;4]>{
    if a[2]<=0||a[3]<=0||b[2]<=0||b[3]<=0{return None;}
    let x=a[0].max(b[0]);let y=a[1].max(b[1]);let fin_x=(a[0]+a[2]).min(b[0]+b[2]);let fin_y=(a[1]+a[3]).min(b[1]+b[3]);
    if fin_x<=x||fin_y<=y{None}else{Some([x,y,fin_x-x,fin_y-y])}
}