package main

type Token struct { Position uint32; Node string }
func Owner(ring []Token,hash uint32)(string,error) {
    if len(ring)==0 { return "",fmt.Errorf("anillo vacío") }
    sorted:=append([]Token(nil),ring...); sort.Slice(sorted,func(i,j int)bool{return sorted[i].Position<sorted[j].Position})
    for i,t:=range sorted { if t.Node=="" || (i>0 && sorted[i-1].Position==t.Position) { return "",fmt.Errorf("anillo ambiguo") } }
    for _,t:=range sorted { if t.Position>=hash { return t.Node,nil } }
    return sorted[0].Node,nil
}