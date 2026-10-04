package main

func EvalRPN(text string)(int,error){
    stack:=[]int{}
    for _,token:=range strings.Fields(text) {
        if token=="+" || token=="-" || token=="*" {
            if len(stack)<2{return 0,fmt.Errorf("faltan operandos")}
            right,left:=stack[len(stack)-1],stack[len(stack)-2]
            stack=stack[:len(stack)-2]
            result:=left+right
            if token=="-"{result=left-right};if token=="*"{result=left*right}
            stack=append(stack,result)
        } else {n,err:=strconv.Atoi(token);if err!=nil{return 0,err};stack=append(stack,n)}
    }
    if len(stack)!=1{return 0,fmt.Errorf("expresión incompleta")}
    return stack[0],nil
}