package main

func Capture(start int) (before, after int) {
    n := start
    defer func() { before = n }()
    defer func() { after = n }()
    n++
    return
}