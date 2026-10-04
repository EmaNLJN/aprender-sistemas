package main

func ShortestRoute(graph map[string][]string, start, target string) ([]string, bool) {
    if start == target { return []string{start}, true }
    for _, next := range graph[start] {
        if next == target { return []string{start, target}, true }
    }
    // Falta explorar rutas de más de un salto.
    return nil, false
}