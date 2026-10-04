package main

type Meter struct { Total int }
func (m *Meter) Add(n int) { m.Total+=n }
type Device struct { Name string; Meter }
func Feed(d *Device,samples []int) int {
    for _,sample:=range samples { d.Add(sample) }
    return d.Total
}