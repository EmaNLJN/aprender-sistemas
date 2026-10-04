package main

func CollectBoth(left,right <-chan int) []int {
    out:=make([]int,0)
    for left!=nil || right!=nil {
        select {
        case n,ok:=<-left:
            if !ok { left=nil } else { out=append(out,n) }
        case n,ok:=<-right:
            if !ok { right=nil } else { out=append(out,n) }
        }
    }
    return out
}