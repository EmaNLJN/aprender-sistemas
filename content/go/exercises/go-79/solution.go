package main

func BitCount(n uint32) int {
    count:=0
    for n!=0 { n &= n-1; count++ }
    return count
}