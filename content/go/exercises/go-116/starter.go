package main

type Entrada struct { ASID uint16; VPN, Marco uint64 }
func Invalidar(tlb []Entrada, asid uint16, vpn uint64, todo bool) ([]Entrada, int) {
    return tlb, 0
}