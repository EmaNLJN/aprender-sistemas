package main

func Clamp(x, low, high int) int {
    if x < low { return low }
    if x > high { return high }
    return x
}