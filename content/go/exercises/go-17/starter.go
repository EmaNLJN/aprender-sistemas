package main

func Lookup(stock map[string]int, key string) (int, bool) {
    n := stock[key]
    return n, n != 0
}