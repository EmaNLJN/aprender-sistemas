package main

type Breaker struct { Limit, Failures int; Open bool }
func (b *Breaker) Record(success bool) {
    if b.Open { return }
    if success { b.Failures = 0; return }
    b.Failures++
    if b.Failures >= b.Limit { b.Open = true }
}
func (b *Breaker) Reset() { b.Failures = 0; b.Open = false }