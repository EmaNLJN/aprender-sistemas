package main

type Box[T any] struct { Value T }
func (b *Box[T]) Replace(next T) T {
    old:=b.Value
    b.Value=next
    return old
}