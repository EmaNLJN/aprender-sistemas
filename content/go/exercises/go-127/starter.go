package main

type Backend struct { Name string; Healthy,Open bool; Inflight,Limit int }
func PickBackend(nodes []Backend)(string,bool) {
    if len(nodes)==0 { return "",false }; best:=nodes[0]
    for _,node:=range nodes[1:] { if node.Inflight<best.Inflight { best=node } }; return best.Name,true
}