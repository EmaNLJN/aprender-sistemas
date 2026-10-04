package main

func Tokens(text string)([]string,error){
    _=unicode.IsSpace
    return strings.Fields(text),nil
}