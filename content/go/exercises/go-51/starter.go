package main

func First[T any](values []T) (T,bool) {
    var zero T
    return zero,false
}