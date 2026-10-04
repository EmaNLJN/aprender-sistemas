package main

func Tokens(text string)([]string,error){
    out:=[]string{}
    var token strings.Builder
    quoted,started:=false,false
    for _,r:=range text {
        if r=='"'{quoted=!quoted;started=true;continue}
        if unicode.IsSpace(r) && !quoted {
            if started{out=append(out,token.String());token.Reset();started=false}
            continue
        }
        token.WriteRune(r);started=true
    }
    if quoted{return nil,fmt.Errorf("comillas sin cerrar")}
    if started{out=append(out,token.String())}
    return out,nil
}