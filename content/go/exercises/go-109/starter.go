package main

// Adaptador provisto para container/heap: menor nombre primero.
type TaskHeap []string
func (h TaskHeap) Len() int { return len(h) }
func (h TaskHeap) Less(i,j int) bool { return h[i] < h[j] }
func (h TaskHeap) Swap(i,j int) { h[i],h[j] = h[j],h[i] }
func (h *TaskHeap) Push(value any) { *h = append(*h, value.(string)) }
func (h *TaskHeap) Pop() any {
    last := len(*h)-1
    value := (*h)[last]
    (*h)[last] = ""
    *h = (*h)[:last]
    return value
}
func Plan(tasks map[string][]string) ([]string,error) {
    ready := &TaskHeap{}
    heap.Init(ready)
    for task := range tasks { heap.Push(ready, task) }
    var order []string
    for ready.Len() > 0 { order = append(order, heap.Pop(ready).(string)) }
    return order,nil // Todavía ignora las dependencias.
}