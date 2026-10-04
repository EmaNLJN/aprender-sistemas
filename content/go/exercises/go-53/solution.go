package main

func Unique[T comparable](values []T) []T {
    seen:=make(map[T]bool)
    out:=make([]T,0)
    for _, value:=range values {
        if !seen[value] { seen[value]=true; out=append(out,value) }
    }
    return out
}