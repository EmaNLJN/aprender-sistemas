package main

func AsyncDouble(n int) int {
    result := make(chan int)
    go func() { result <- n * 2 }()
    return <-result
}