package main

func FormatGo(source string)(string,error){
    out,_:=format.Source([]byte(source))
    return string(out),nil
}