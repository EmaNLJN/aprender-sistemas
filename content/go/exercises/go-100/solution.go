package main

func WalkLines(ctx context.Context,r io.Reader,visit func(string)error)(int,error){
    scanner:=bufio.NewScanner(r);done:=0
    for {
        if err:=ctx.Err();err!=nil{return done,err}
        if !scanner.Scan(){return done,scanner.Err()}
        if err:=ctx.Err();err!=nil{return done,err}
        if err:=visit(scanner.Text());err!=nil{return done,err}
        done++
    }
}