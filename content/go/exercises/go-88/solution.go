package main

func LowerBound(values []int,target int) int {
    low,high:=0,len(values)
    for low<high {mid:=low+(high-low)/2;if values[mid]<target{low=mid+1}else{high=mid}}
    return low
}