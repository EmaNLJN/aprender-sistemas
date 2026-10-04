package main

func FindSorted(values []int, target int) (int,int) {
    probes:=0
    for i,n:=range values {
        probes++
        if n==target { return i,probes }
    }
    return -1,probes
}