package main

func Add(p *int, delta int) {
    if p == nil { return }
    n := *p + delta
    p = &n
}