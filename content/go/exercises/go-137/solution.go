package main

type AccesoPC struct { VA int; Escribir bool; Valor byte }

func EjecutarPC(accesos []AccesoPC) ([]byte, byte, int, []string) {
    type entrada struct { marco int; escribir, presente bool }
    ram := []byte{10,11,12,13,20,21,22,23,0,0,0,0}
    tabla := [3]entrada{{1,false,true},{0,true,true},{}}
    tlb := [3]entrada{}
    var acc byte
    retiradas := 0
    traza := []string{}
programa:
    for _, acceso := range accesos {
        if acceso.VA < 0 || acceso.VA >= 12 { traza=append(traza,"range"); break }
        pagina := acceso.VA / 4
        for {
            e := tlb[pagina]
            if e.presente { traza=append(traza,"hit") } else {
                traza=append(traza,"miss")
                e=tabla[pagina]
                if e.presente {
                    traza=append(traza,"walk"); tlb[pagina]=e
                } else {
                    traza=append(traza,"fault")
                    for i:=8; i<12; i++ { ram[i]=0 }
                    tabla[pagina]=entrada{2,true,true}; tlb[pagina]=entrada{}
                    traza=append(traza,"map","retry"); continue
                }
            }
            if acceso.Escribir && !e.escribir {
                traza=append(traza,"protection"); break programa
            }
            fisica:=e.marco*4+acceso.VA%4
            if acceso.Escribir { ram[fisica]=acceso.Valor; traza=append(traza,"store") } else {
                acc=ram[fisica]; traza=append(traza,"load")
            }
            retiradas++; break
        }
    }
    return ram, acc, retiradas, traza
}