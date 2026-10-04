package main

type TestCase struct { Name string; Input,Want int }
func FailedCases(cases []TestCase,operation func(int)int) []string {
    failed:=[]string{}
    for _,c:=range cases { if got:=operation(c.Input);got!=c.Want {failed=append(failed,c.Name)} }
    return failed
}