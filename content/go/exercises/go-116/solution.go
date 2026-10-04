package main

type Entrada struct { ASID uint16; VPN, Marco uint64 }
func Invalidar(tlb []Entrada, asid uint16, vpn uint64, todo bool) ([]Entrada, int) {
    salida := make([]Entrada,0,len(tlb))
    for _,e := range tlb {
        if e.ASID==asid && (todo || e.VPN==vpn) { continue }
        salida=append(salida,e)
    }
    return salida,len(tlb)-len(salida)
}