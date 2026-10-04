package main

func Lookup(stock map[string]int, key string) (int, bool) {
    n, ok := stock[key]
    return n, ok
}