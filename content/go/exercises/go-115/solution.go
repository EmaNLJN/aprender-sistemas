package main

type Pagina struct { Marco uint64; Presente, Escritura bool }
func Traducir(tabla []Pagina, tamano, va uint64, escribir bool) (uint64, string) {
    if tamano==0 || tamano&(tamano-1)!=0 { return 0,"tamano" }
    vpn := va/tamano
    if vpn>=uint64(len(tabla)) { return 0,"pagina" }
    p := tabla[vpn]
    if !p.Presente { return 0,"ausente" }
    if escribir && !p.Escritura { return 0,"permiso" }
    max, offset := ^uint64(0), va%tamano
    if p.Marco>max/tamano { return 0,"overflow" }
    base := p.Marco*tamano
    if offset>max-base { return 0,"overflow" }
    return base+offset,""
}