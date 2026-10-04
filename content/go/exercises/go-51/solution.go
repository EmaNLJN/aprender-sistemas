package main

func First[T any](values []T) (T,bool) {
    if len(values)==0 { var zero T; return zero,false }
    return values[0],true
}