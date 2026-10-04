package main

func Balanced(text string) bool {
    stack:=[]rune{}
    pairs:=map[rune]rune{')':'(',']':'[','}':'{'}
    for _,r:=range text {
        if r=='(' || r=='[' || r=='{'{stack=append(stack,r);continue}
        if open,closing:=pairs[r];closing {
            if len(stack)==0 || stack[len(stack)-1]!=open{return false}
            stack=stack[:len(stack)-1]
        }
    }
    return len(stack)==0
}