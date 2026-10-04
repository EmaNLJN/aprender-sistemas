package main

func Add(p *int, delta int) {
    if p == nil { return }
    *p += delta
}