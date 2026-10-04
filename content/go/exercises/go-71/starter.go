package main

func ExportedFunctions(source string) ([]string,error) {
    file,err:=parser.ParseFile(token.NewFileSet(),"input.go",source,0)
    if err!=nil{return nil,err}
    _=file
    _=ast.IsExported
    names:=[]string{}
    sort.Strings(names)
    return names,nil
}