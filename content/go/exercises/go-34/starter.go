package main

func AsInt(value interface{}) (int, bool) {
    return value.(int), true
}