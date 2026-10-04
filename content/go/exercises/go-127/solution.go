package main

type Backend struct { Name string; Healthy,Open bool; Inflight,Limit int }
func PickBackend(nodes []Backend)(string,bool) {
    var best Backend; found:=false
    for _,node:=range nodes {
        if !node.Healthy || node.Open || node.Limit<=0 || node.Inflight<0 || node.Inflight>=node.Limit { continue }
        if !found || node.Inflight<best.Inflight || (node.Inflight==best.Inflight && node.Name<best.Name) { best=node; found=true }
    }
    return best.Name,found
}