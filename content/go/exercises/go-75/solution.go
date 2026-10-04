package main

func FormatGo(source string)(string,error){
    out,err:=format.Source([]byte(source))
    if err!=nil{return "",err}
    return string(out),nil
}