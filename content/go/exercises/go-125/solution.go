package main

type Fragment struct { Index int; Data []byte }
func Assemble(total int,parts []Fragment)([]byte,bool,error) {
    if total<0 || total>1024 { return nil,false,fmt.Errorf("total inválido") }
    slots:=make([][]byte,total); seen:=make([]bool,total)
    for _,part:=range parts {
        if part.Index<0 || part.Index>=total { return nil,false,fmt.Errorf("índice inválido") }
        if seen[part.Index] {
            if string(slots[part.Index])!=string(part.Data) { return nil,false,fmt.Errorf("duplicado contradictorio") }
        } else { slots[part.Index]=part.Data; seen[part.Index]=true }
    }
    for _,present:=range seen { if !present { return nil,false,nil } }
    var out []byte; for _,part:=range slots { out=append(out,part...) }; return out,true,nil
}