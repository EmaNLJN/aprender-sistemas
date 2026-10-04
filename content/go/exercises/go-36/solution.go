package main

func Invoke(valid bool, cleanup func()) bool {
    defer cleanup()
    if !valid { return false }
    return true
}