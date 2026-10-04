package main

func Swap(a, b int) (int, int) {
    a = b
    b = a
    return a, b
}