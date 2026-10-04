package main

func ExportedFunctions(source string) ([]string,error) {
    file,err:=parser.ParseFile(token.NewFileSet(),"input.go",source,0)
    if err!=nil{return nil,err}
    names:=[]string{}
    for _,decl:=range file.Decls {
        fn,ok:=decl.(*ast.FuncDecl)
        if ok && fn.Recv==nil && ast.IsExported(fn.Name.Name) {names=append(names,fn.Name.Name)}
    }
    sort.Strings(names)
    return names,nil
}