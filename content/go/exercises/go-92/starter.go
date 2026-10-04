package main

func EvalRPN(text string)(int,error){
    fields:=strings.Fields(text)
    if len(fields)==1{return strconv.Atoi(fields[0])}
    return 0,fmt.Errorf("sin implementar")
}