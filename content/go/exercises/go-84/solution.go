package main

func LongestUnique(text string) int {
    last:=make(map[rune]int)
    start,best:=0,0
    for i,r:=range []rune(text) {
        if prev,ok:=last[r];ok && prev>=start{start=prev+1}
        last[r]=i
        if length:=i-start+1;length>best{best=length}
    }
    return best
}