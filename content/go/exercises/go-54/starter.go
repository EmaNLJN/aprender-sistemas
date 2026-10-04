package main

func MapSlice[A,B any](values []A, convert func(A)B) []B {
    return make([]B,len(values))
}