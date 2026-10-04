package main

type Shape interface { Area() int }
type Square struct { Side int }
func (s Square) Area() int { return s.Side * s.Side }
type Rectangle struct { Width, Height int }
func (r Rectangle) Area() int { return r.Width * r.Height }
func TotalArea(shapes []Shape) int {
    total := 0
    for _, shape := range shapes { total += shape.Area() }
    return total
}