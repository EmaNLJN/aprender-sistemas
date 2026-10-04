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
    pending := make(map[string]int)
    dependents := make(map[string][]string)
    for task,deps := range tasks {
        pending[task] = len(deps)
        for _,dep := range deps {
            if _,exists := tasks[dep]; !exists { return nil,fmt.Errorf("dependencia inexistente: %s",dep) }
            dependents[dep] = append(dependents[dep],task)
        }
    }
    ready := &TaskHeap{}
    heap.Init(ready)
    for task,count := range pending { if count == 0 { heap.Push(ready,task) } }
    var order []string
    for ready.Len() > 0 {
        task := heap.Pop(ready).(string)
        order = append(order,task)
        for _,next := range dependents[task] {
            pending[next]--
            if pending[next] == 0 { heap.Push(ready,next) }
        }
    }
    if len(order) != len(tasks) { return nil,fmt.Errorf("ciclo de dependencias") }
    return order,nil
}