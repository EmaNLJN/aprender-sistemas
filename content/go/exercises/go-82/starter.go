package main

type Run struct { Symbol rune; Count int }
func Runs(text string) []Run {
    out:=[]Run{}
    for _,r:=range text{out=append(out,Run{r,1})}
    return out
}