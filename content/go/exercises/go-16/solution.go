package main

func Frequencies(names []string) map[string]int {
    counts := make(map[string]int)
    for _, name := range names { counts[name]++ }
    return counts
}