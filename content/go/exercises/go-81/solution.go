package main

func Anagram(a,b string) bool {
    counts:=make(map[rune]int)
    for _,r:=range a{counts[r]++}
    for _,r:=range b{counts[r]--}
    for _,n:=range counts{if n!=0{return false}}
    return true
}