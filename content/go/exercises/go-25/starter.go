package main

type Note struct {
    Title string
    Tags []string
}
func Snapshot(n Note) Note {
    return n
}