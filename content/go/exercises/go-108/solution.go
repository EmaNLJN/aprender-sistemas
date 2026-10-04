package main

func ShortestRoute(graph map[string][]string, start, target string) ([]string, bool) {
    queue := []string{start}
    seen := map[string]bool{start:true}
    parent := make(map[string]string)
    for head := 0; head < len(queue); head++ {
        node := queue[head]
        if node == target {
            path := []string{target}
            for node != start { node = parent[node]; path = append(path, node) }
            for i,j := 0,len(path)-1; i<j; i,j = i+1,j-1 { path[i],path[j] = path[j],path[i] }
            return path, true
        }
        for _, next := range graph[node] {
            if !seen[next] {
                seen[next] = true
                parent[next] = node
                queue = append(queue, next)
            }
        }
    }
    return nil, false
}