package main

type Incrementer interface { Increment() }
type Ticks struct { N int }
func (t *Ticks) Increment() { t.N++ }
func Bump(t *Ticks) { var operation Incrementer=t; operation.Increment() }