package main

type MinStack struct { values,mins []int }
func(s *MinStack) Push(n int){
    low:=n
    if len(s.mins)>0 && s.mins[len(s.mins)-1]<low{low=s.mins[len(s.mins)-1]}
    s.values=append(s.values,n);s.mins=append(s.mins,low)
}
func(s *MinStack) Pop()(int,bool){if len(s.values)==0{return 0,false};i:=len(s.values)-1;n:=s.values[i];s.values=s.values[:i];s.mins=s.mins[:i];return n,true}
func(s *MinStack) Minimum()(int,bool){if len(s.mins)==0{return 0,false};return s.mins[len(s.mins)-1],true}