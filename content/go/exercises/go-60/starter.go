package main

type Player struct { Level int }
func CloneRoster(src map[string]*Player) map[string]*Player {
    out:=make(map[string]*Player)
    for key,p:=range src { out[key]=p }
    return out
}