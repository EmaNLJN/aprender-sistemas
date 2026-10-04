package main

type Marco struct { Retorno int; Local int }
func Llamar(pila *[]Marco, retorno, local, limite int) bool {
    if len(*pila)==0 || len(*pila)>=limite { return false }
    *pila=append(*pila,Marco{retorno,local})
    return true
}
func Retornar(pila *[]Marco) (int, bool) {
    if len(*pila)<=1 { return 0,false }
    index:=len(*pila)-1
    retorno:=(*pila)[index].Retorno
    *pila=(*pila)[:index]
    return retorno,true
}