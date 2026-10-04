package main

func AppendInto(dst *[]int,values ...int) bool {
    if dst==nil { return false }
    *dst=append(*dst,values...)
    return true
}