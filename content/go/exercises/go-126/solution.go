package main

type Ring struct { data []int; head,size int }
func NewRing(capacity int)*Ring { return &Ring{data:make([]int,capacity)} }
func(r *Ring)Push(value int)bool {
    if r.size==len(r.data) { return false }
    index:=(r.head+r.size)%len(r.data); r.data[index]=value; r.size++; return true
}
func(r *Ring)Pop()(int,bool) {
    if r.size==0 { return 0,false }
    value:=r.data[r.head]; r.head=(r.head+1)%len(r.data); r.size--; return value,true
}