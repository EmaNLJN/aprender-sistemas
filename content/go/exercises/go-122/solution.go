package main

type Entry struct { Key string; Seq uint64; Value string; Deleted bool }
func Compact(entries []Entry, dropTombstones bool) []Entry {
    latest:=make(map[string]Entry)
    for _,e:=range entries { old,exists:=latest[e.Key]; if !exists || e.Seq>old.Seq { latest[e.Key]=e } }
    keys:=make([]string,0,len(latest)); for key:=range latest { keys=append(keys,key) }; sort.Strings(keys)
    out:=make([]Entry,0,len(keys)); for _,key:=range keys { e:=latest[key]; if !dropTombstones || !e.Deleted { out=append(out,e) } }; return out
}