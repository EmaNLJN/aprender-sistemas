fn analizar(coef:&[i64],x:i64)->(i64,Vec<i64>){
    let valor=coef.iter().rev().fold(0,|a,&c|a*x+c);
    let derivada=coef.iter().enumerate().skip(1).map(|(i,&c)|i as i64*c).collect();
    (valor,derivada)
}