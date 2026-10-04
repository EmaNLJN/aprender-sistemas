package main

func Push(values []int, n int) []int {
    _ = append(values, n)
    return values
}