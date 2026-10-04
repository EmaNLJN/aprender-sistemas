package main

func positionValue(n int) int{if n==0{return -1};best:=-2;for k:=1;k<=2&&k<=n;k++{v:=-positionValue(n-k);if v>best{best=v}};return best}
func BestMove(n int) int{
    if n==0{return 0};chosen,best:=1,-2
    for k:=1;k<=2&&k<=n;k++{v:=-positionValue(n-k);if v>best{best=v;chosen=k}};return chosen
}