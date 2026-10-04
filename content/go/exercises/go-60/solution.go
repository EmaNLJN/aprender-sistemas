package main

type Player struct { Level int }
func CloneRoster(src map[string]*Player) map[string]*Player {
    out:=make(map[string]*Player)
    for key,p:=range src {
        if p==nil { out[key]=nil; continue }
        clone:=*p
        out[key]=&clone
    }
    return out
}