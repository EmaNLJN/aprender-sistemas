package main

func NewCounter(start int) func() int {
    return func() int { return start + 1 }
}