package main

func AppendInto(dst *[]int,values ...int) bool {
    if dst==nil { return false }
    local:=append(*dst,values...)
    _=local
    return true
}