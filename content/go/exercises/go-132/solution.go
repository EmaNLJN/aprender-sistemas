package main

func RouteCost(g [][]int)(int,bool){
    rows:=len(g);if rows==0||len(g[0])==0{return 0,false};cols:=len(g[0]);for _,row:=range g{if len(row)!=cols{return 0,false}}
    if g[0][0]==0||g[rows-1][cols-1]==0{return 0,false}
    type node struct{f,cost,r,c int};open:=[]node{{rows+cols-2,0,0,0}};best:=make([][]int,rows)
    for r:=range best{best[r]=make([]int,cols);for c:=range best[r]{best[r][c]=1<<30}};best[0][0]=0
    for len(open)>0{at:=0;for i:=range open{if open[i].f<open[at].f{at=i}};n:=open[at];open=append(open[:at],open[at+1:]...);if n.cost!=best[n.r][n.c]{continue};if n.r==rows-1&&n.c==cols-1{return n.cost,true}
        for _,d:=range [][2]int{{-1,0},{0,1},{1,0},{0,-1}}{r,c:=n.r+d[0],n.c+d[1];if r<0||c<0||r>=rows||c>=cols||g[r][c]==0{continue};cost:=n.cost+g[r][c];if cost<best[r][c]{best[r][c]=cost;open=append(open,node{cost+rows-1-r+cols-1-c,cost,r,c})}}
    };return 0,false
}