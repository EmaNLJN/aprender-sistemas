package main

func WalkLines(ctx context.Context,r io.Reader,visit func(string)error)(int,error){
    scanner:=bufio.NewScanner(r);done:=0
    for scanner.Scan(){if err:=visit(scanner.Text());err!=nil{return done,err};done++}
    return done,scanner.Err()
}