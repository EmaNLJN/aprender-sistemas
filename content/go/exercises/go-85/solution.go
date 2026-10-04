package main

func CleanRoute(route string)(string,error){
    if !strings.HasPrefix(route,"/"){return "",fmt.Errorf("ruta no absoluta")}
    stack:=[]string{}
    for _,part:=range strings.Split(route,"/") {
        switch part {
        case "",".":
        case "..": if len(stack)==0{return "",fmt.Errorf("fuera de la raíz")};stack=stack[:len(stack)-1]
        default:stack=append(stack,part)
        }
    }
    return "/"+strings.Join(stack,"/"),nil
}