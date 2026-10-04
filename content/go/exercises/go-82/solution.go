package main

type Run struct { Symbol rune; Count int }
func Runs(text string) []Run {
    out:=[]Run{}
    for _,r:=range text {
        if len(out)>0 && out[len(out)-1].Symbol==r {out[len(out)-1].Count++} else {out=append(out,Run{r,1})}
    }
    return out
}