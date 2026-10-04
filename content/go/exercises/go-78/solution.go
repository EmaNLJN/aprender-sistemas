package main

func IsPrime(n int) bool {
    if n<2{return false}
    for d:=2;d<=n/d;d++{if n%d==0{return false}}
    return true
}