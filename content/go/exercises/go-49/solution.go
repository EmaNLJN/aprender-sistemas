package main

func DecodeSnapshot(text string) (map[string]string,error) {
    out:=make(map[string]string)
    for i,line:=range strings.Split(text,"\n") {
        if strings.TrimSpace(line)=="" { continue }
        pair:=strings.SplitN(line,"=",2)
        if len(pair)!=2 || strings.TrimSpace(pair[0])=="" {
            return nil,fmt.Errorf("línea %d inválida",i+1)
        }
        key:=strings.TrimSpace(pair[0])
        out[key]=pair[1]
    }
    return out,nil
}