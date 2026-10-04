package main

type Token struct { Position uint32; Node string }
func Owner(ring []Token,hash uint32)(string,error) {
    if len(ring)==0 { return "",fmt.Errorf("anillo vacío") }
    sorted:=append([]Token(nil),ring...); sort.Slice(sorted,func(i,j int)bool{return sorted[i].Position<sorted[j].Position})
    return sorted[0].Node,nil
}