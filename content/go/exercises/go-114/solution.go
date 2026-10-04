package main

type Hueco struct { Inicio, Largo uint64 }
func PrimerAjuste(huecos []Hueco, pedido, alineacion uint64) (int, uint64, bool) {
    if pedido == 0 || alineacion == 0 || alineacion&(alineacion-1) != 0 { return -1,0,false }
    max := ^uint64(0)
    for i,h := range huecos {
        if h.Largo > max-h.Inicio { continue }
        resto, padding := h.Inicio%alineacion, uint64(0)
        if resto != 0 { padding = alineacion-resto }
        if padding <= h.Largo && pedido <= h.Largo-padding && padding <= max-h.Inicio {
            return i,h.Inicio+padding,true
        }
    }
    return -1,0,false
}