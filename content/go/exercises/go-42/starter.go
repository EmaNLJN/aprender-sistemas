package main

func Stream(values []int) <-chan int {
    out := make(chan int)
    close(out)
    return out
}