package main

type Pixel struct { X,Y int }
func Pixels(x0,y0,x1,y1 int) []Pixel { return []Pixel{{x0,y0}} }