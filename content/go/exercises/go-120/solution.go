package main

func AtenderIRQ(pendientes, habilitadas uint8) (int, uint8, bool) {
    candidatas:=pendientes&habilitadas
    for i:=0;i<8;i++ {
        bit:=uint8(1)<<uint(i)
        if candidatas&bit!=0 { return i,pendientes&^bit,true }
    }
    return -1,pendientes,false
}