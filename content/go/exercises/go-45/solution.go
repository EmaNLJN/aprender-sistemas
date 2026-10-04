package main

func ParallelSquares(values []int) []int {
    out := make([]int, len(values))
    var wg sync.WaitGroup
    for i, value := range values {
        wg.Add(1)
        go func(index, n int) {
            defer wg.Done()
            out[index] = n * n
        }(i, value)
    }
    wg.Wait()
    return out
}