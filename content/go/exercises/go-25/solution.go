package main

type Note struct {
    Title string
    Tags []string
}
func Snapshot(n Note) Note {
    tags := make([]string, len(n.Tags))
    copy(tags, n.Tags)
    n.Tags = tags
    return n
}