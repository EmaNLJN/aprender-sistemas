package main

func RotateGrid(grid [][]int)([][]int,error){
    if len(grid)==0{return [][]int{},nil}
    rows,cols:=len(grid),len(grid[0])
    for _,row:=range grid{if len(row)!=cols{return nil,fmt.Errorf("tablero irregular")}}
    out:=make([][]int,cols)
    for c:=0;c<cols;c++{out[c]=make([]int,rows)}
    for r,row:=range grid{for c,value:=range row{out[c][rows-1-r]=value}}
    return out,nil
}