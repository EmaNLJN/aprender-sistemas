package main

func ReadLimited(r io.Reader,limit int64)([]byte,error){
    if limit<0{return nil,fmt.Errorf("límite negativo")}
    return io.ReadAll(io.LimitReader(r,limit))
}