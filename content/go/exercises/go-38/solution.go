package main

func Capture(start int) (before, after int) {
    n := start
    defer func(value int) { before = value }(n)
    defer func() { after = n }()
    n++
    return
}