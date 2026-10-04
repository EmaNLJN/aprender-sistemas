package main

func ReleaseOrder(names []string) (out []string) {
    for _, name := range names {
        defer func(value string) { out = append(out, value) }(name)
    }
    return
}