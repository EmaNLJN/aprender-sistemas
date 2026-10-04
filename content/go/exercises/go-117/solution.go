package main

func ValidarBytecode(bytes []byte) ([]int, string) {
    if len(bytes)==0 { return nil,"vacio" }
    inicios, saltos := []int{}, []int{}
    for pc:=0; pc<len(bytes); {
        inicios=append(inicios,pc)
        switch bytes[pc] {
        case 0,2: pc++
        case 1,3:
            if pc+1>=len(bytes) { return nil,"operando" }
            if bytes[pc]==3 { saltos=append(saltos,int(bytes[pc+1])) }
            pc+=2
        default: return nil,"opcode"
        }
    }
    for _,destino:=range saltos {
        encontrado:=false
        for _,inicio:=range inicios { if inicio==destino { encontrado=true; break } }
        if !encontrado { return nil,"salto" }
    }
    return inicios,""
}