package main

func ParseCommand(line string) (string,string,string,error) {
    fields := strings.Fields(line)
    if len(fields)==0 { return "","","",fmt.Errorf("orden vacía") }
    op := strings.ToUpper(fields[0])
    if op=="SET" && len(fields)==3 { return op,fields[1],fields[2],nil }
    if (op=="GET" || op=="DEL") && len(fields)==2 { return op,fields[1],"",nil }
    return "","","",fmt.Errorf("orden o argumentos inválidos")
}