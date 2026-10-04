fn siguiente(g:&[Vec<bool>])->Vec<Vec<bool>>{
    let rows=g.len();if rows==0{return vec![];}let cols=g[0].len();if cols==0||g.iter().any(|r|r.len()!=cols){return vec![];}
    let mut out=vec![vec![false;cols];rows];
    for r in 0..rows{for c in 0..cols{let mut n=0;for dr in -1isize..=1{for dc in -1isize..=1{if dr==0&&dc==0{continue;}let rr=r as isize+dr;let cc=c as isize+dc;if rr>=0&&cc>=0&&(rr as usize)<rows&&(cc as usize)<cols&&g[rr as usize][cc as usize]{n+=1;}}}out[r][c]=n==3||(g[r][c]&&n==2);}}
    out
}