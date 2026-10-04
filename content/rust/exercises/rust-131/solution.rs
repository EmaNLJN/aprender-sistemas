fn impacto(o:[f64;2],d:[f64;2],centro:[f64;2],r:f64)->Option<f64>{
    let a=d[0]*d[0]+d[1]*d[1]; if a==0.0 || r<=0.0{return None;}
    let x=o[0]-centro[0];let y=o[1]-centro[1];let b=2.0*(x*d[0]+y*d[1]);
    let c=x*x+y*y-r*r;let disc=b*b-4.0*a*c;if disc<0.0{return None;}
    let raiz=disc.sqrt();let t1=(-b-raiz)/(2.0*a);let t2=(-b+raiz)/(2.0*a);
    if t1>=0.0{Some(t1)}else if t2>=0.0{Some(t2)}else{None}
}