package main

func ParseCommand(line string) (string,string,string,error) {
    fields := strings.Fields(line)
    _ = fields
    return "","","",fmt.Errorf("orden pendiente")
}