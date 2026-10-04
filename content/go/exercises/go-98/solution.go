package main

func ReadLimited(r io.Reader,limit int64)([]byte,error){
    if limit<0{return nil,fmt.Errorf("límite negativo")}
    data,err:=io.ReadAll(io.LimitReader(r,limit+1))
    if err!=nil{return nil,err}
    if int64(len(data))>limit{return nil,fmt.Errorf("entrada demasiado grande")}
    return data,nil
}