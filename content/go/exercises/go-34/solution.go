package main

func AsInt(value interface{}) (int, bool) {
    n, ok := value.(int)
    return n, ok
}