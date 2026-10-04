package main

func IsPrime(n int) bool {
    if n<2{return true}
    for d:=2;d<=n/d;d++{if n%d==0{return false}}
    return true
}