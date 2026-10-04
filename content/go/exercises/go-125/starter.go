package main

type Fragment struct { Index int; Data []byte }
func Assemble(total int,parts []Fragment)([]byte,bool,error) {
    if total<0 || total>1024 { return nil,false,fmt.Errorf("total inválido") }
    for _,part:=range parts { if part.Index<0 || part.Index>=total { return nil,false,fmt.Errorf("índice inválido") } }
    if len(parts)<total { return nil,false,nil }
    var out []byte; for _,part:=range parts { out=append(out,part.Data...) }; return out,true,nil
}