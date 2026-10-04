package main

func Clone(values []int) []int {
    out := make([]int, len(values))
    copy(out, values)
    return out
}