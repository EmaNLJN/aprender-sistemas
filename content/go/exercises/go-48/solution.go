package main

func Apply(store map[string]string, command string) (string,error) {
    fields := strings.Fields(command)
    if len(fields)==3 && fields[0]=="SET" {
        store[fields[1]]=fields[2]
        return "OK",nil
    }
    if len(fields)==2 && fields[0]=="GET" {
        value,ok:=store[fields[1]]
        if !ok { return "",fmt.Errorf("clave ausente: %s",fields[1]) }
        return value,nil
    }
    return "",fmt.Errorf("orden inválida")
}