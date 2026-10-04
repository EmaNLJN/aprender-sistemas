package main

func RuneCount(text string) int {
    count := 0
    for range text { count++ }
    return count
}