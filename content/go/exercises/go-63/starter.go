package main

type SafeTotal struct { mu sync.Mutex; value int }
func (s *SafeTotal) Add(n int) { s.mu.Lock(); defer s.mu.Unlock(); s.value=n }
func (s *SafeTotal) Value() int { s.mu.Lock(); defer s.mu.Unlock(); return s.value }
func ParallelTotal(values []int) int {
    var total SafeTotal
    var wg sync.WaitGroup
    for _,n:=range values { wg.Add(1); go func(x int){defer wg.Done();total.Add(x)}(n) }
    wg.Wait()
    return total.Value()
}