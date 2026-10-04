package main

type Problem struct { Message string }
func (p *Problem) Error() string { return p.Message }
func Validate(valid bool) error {
    var problem *Problem
    if !valid { problem = &Problem{Message:"inválido"} }
    return problem
}