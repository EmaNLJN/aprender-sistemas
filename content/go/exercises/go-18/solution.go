package main

func SortedKeys(values map[string]int) []string {
    keys := make([]string, 0, len(values))
    for k := range values { keys = append(keys, k) }
    sort.Strings(keys)
    return keys
}