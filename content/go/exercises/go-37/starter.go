package main

func ReleaseOrder(names []string) (out []string) {
    for _, name := range names { out = append(out, name) }
    return
}