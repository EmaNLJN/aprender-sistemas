package main

func NextLife(g [][]bool) [][]bool{
    rows:=len(g);if rows==0||len(g[0])==0{return nil};cols:=len(g[0]);for _,row:=range g{if len(row)!=cols{return nil}}
    out:=make([][]bool,rows);for r:=range out{out[r]=make([]bool,cols);for c:=range out[r]{n:=0;for dr:=-1;dr<=1;dr++{for dc:=-1;dc<=1;dc++{if dr==0&&dc==0{continue};rr,cc:=r+dr,c+dc;if rr>=0&&cc>=0&&rr<rows&&cc<cols&&g[rr][cc]{n++}}};out[r][c]=n==3||(g[r][c]&&n==2)}};return out
}