package main

type Counter struct { Count int }
func (c Counter) Increment() {
    c.Count++
}