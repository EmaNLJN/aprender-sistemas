package main

func PoolSquares(values []int,workers int) ([]int,error) {
    if workers<=0{return nil,fmt.Errorf("workers debe ser positivo")}
    out:=make([]int,len(values))
    jobs:=make(chan int)
    var wg sync.WaitGroup
    for w:=0;w<workers;w++ { wg.Add(1);go func(){defer wg.Done();for i:=range jobs {out[i]=values[i]*2}}() }
    for i:=range values {jobs<-i}
    close(jobs)
    wg.Wait()
    return out,nil
}