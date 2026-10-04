package main

func Invoke(valid bool, cleanup func()) bool {
    if !valid { return false }
    cleanup()
    return true
}