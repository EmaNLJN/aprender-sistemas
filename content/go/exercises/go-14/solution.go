package main

func Evens(values []int) []int {
    out := make([]int, 0)
    for _, n := range values {
        if n % 2 == 0 { out = append(out, n) }
    }
    return out
}