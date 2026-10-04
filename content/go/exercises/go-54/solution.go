package main

func MapSlice[A,B any](values []A, convert func(A)B) []B {
    out:=make([]B,len(values))
    for i,value:=range values { out[i]=convert(value) }
    return out
}