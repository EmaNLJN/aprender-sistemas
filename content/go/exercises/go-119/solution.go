package main

func Turnos(trabajo []uint32, quantum uint32) ([]int, string) {
    if quantum==0 { return nil,"quantum" }
    restante:=append([]uint32(nil),trabajo...)
    cola, traza:=[]int{},[]int{}
    for i,n:=range restante { if n>0 { cola=append(cola,i) } }
    for len(cola)>0 {
        id:=cola[0]; cola=cola[1:]
        traza=append(traza,id)
        if restante[id]<=quantum { restante[id]=0 } else { restante[id]-=quantum }
        if restante[id]>0 { cola=append(cola,id) }
    }
    return traza,""
}