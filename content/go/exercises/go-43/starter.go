package main

func Queue(values []int) <-chan int {
    out := make(chan int, len(values))
    for i:=len(values)-1; i>=0; i-- { out <- values[i] }
    close(out)
    return out
}