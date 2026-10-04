package main

func WindowSums(values []int,k int)([]int,error){
    if k<=0{return nil,fmt.Errorf("ancho inválido")}
    out:=[]int{}
    if k>len(values){return out,nil}
    sum:=0
    for i:=0;i<k;i++{sum+=values[i]}
    out=append(out,sum)
    for i:=k;i<len(values);i++{sum+=values[i]-values[i-k];out=append(out,sum)}
    return out,nil
}