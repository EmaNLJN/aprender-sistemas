package main

func Window(values []int, start, end int) ([]int, bool) {
    if start < 0 || end < start || end > len(values) { return nil, false }
    return values[start:end], true
}