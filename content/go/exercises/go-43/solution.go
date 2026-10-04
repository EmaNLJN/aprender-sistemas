package main

func Queue(values []int) <-chan int {
    out := make(chan int, len(values))
    for _, value := range values { out <- value }
    close(out)
    return out
}