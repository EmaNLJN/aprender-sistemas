package main

func Total(readings [3]int) int {
    sum := 0
    for _, n := range readings { sum += n }
    return sum
}