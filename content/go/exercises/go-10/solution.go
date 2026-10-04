package main

func NewCounter(start int) func() int {
    return func() int {
        start++
        return start
    }
}