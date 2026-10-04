package main

type Coins int
type Distance int64
func SumNumbers[T ~int | ~int64](values []T) T {
    var total T
    for _, n := range values { total = n }
    return total
}