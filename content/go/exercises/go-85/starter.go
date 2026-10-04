package main

func CleanRoute(route string)(string,error){
    return strings.TrimSpace(route),nil
}