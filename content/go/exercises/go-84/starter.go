package main

func LongestUnique(text string) int {
    seen:=make(map[rune]bool)
    for _,r:=range text{seen[r]=true}
    return len(seen)
}