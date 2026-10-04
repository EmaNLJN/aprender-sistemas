package main

func FindSorted(values []int, target int) (int,int) {
    low,high,probes:=0,len(values),0
    for low<high {
        mid:=low+(high-low)/2
        probes++
        n:=values[mid]
        if n==target { return mid,probes }
        if n<target { low=mid+1 } else { high=mid }
    }
    return -1,probes
}