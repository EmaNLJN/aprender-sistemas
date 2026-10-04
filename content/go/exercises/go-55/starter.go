package main

type Box[T any] struct { Value T }
func (b *Box[T]) Replace(next T) T {
    b.Value=next
    return b.Value
}