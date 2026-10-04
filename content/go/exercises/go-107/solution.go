package main

func Reachable(graph map[string][]string, start, target string) bool {
    queue := []string{start}
    seen := map[string]bool{start:true}
    for head := 0; head < len(queue); head++ {
        node := queue[head]
        if node == target { return true }
        for _, next := range graph[node] {
            if !seen[next] { seen[next] = true; queue = append(queue, next) }
        }
    }
    return false
}