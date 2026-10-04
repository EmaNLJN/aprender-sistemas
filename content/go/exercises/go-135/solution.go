package main

func Analyze(coef []int64,x int64)(int64,[]int64){
    var value int64;for i:=len(coef)-1;i>=0;i--{value=value*x+coef[i]}
    derivative:=[]int64{};for i:=1;i<len(coef);i++{derivative=append(derivative,int64(i)*coef[i])};return value,derivative
}