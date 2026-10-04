package main

func Stream(values []int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, value := range values { out <- value }
    }()
    return out
}