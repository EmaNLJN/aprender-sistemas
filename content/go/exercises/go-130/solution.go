package main

type Pixel struct { X,Y int }
func Pixels(x0,y0,x1,y1 int) []Pixel {
    abs:=func(n int)int{if n<0{return -n};return n}
    dx,dy:=abs(x1-x0),-abs(y1-y0); sx,sy:=-1,-1
    if x0<x1{sx=1};if y0<y1{sy=1};err:=dx+dy
    out:=[]Pixel{}
    for {out=append(out,Pixel{x0,y0});if x0==x1 && y0==y1{break};e2:=2*err;if e2>=dy{err+=dy;x0+=sx};if e2<=dx{err+=dx;y0+=sy}}
    return out
}