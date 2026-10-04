package main

func Await(ctx context.Context,ch <-chan int) (int,error) {
    if err:=ctx.Err(); err!=nil { return 0,err }
    select {
    case <-ctx.Done(): return 0,ctx.Err()
    case n,ok:=<-ch:
        if !ok { return 0,fmt.Errorf("canal sin datos") }
        return n,nil
    }
}