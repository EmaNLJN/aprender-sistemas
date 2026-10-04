package main

type Position struct { X, Y int }
func (p *Position) Moved(dx, dy int) Position {
    p.X += dx
    p.Y += dy
    return *p
}