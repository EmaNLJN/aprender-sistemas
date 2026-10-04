package main

type Problem struct { Message string }
func (p *Problem) Error() string { return p.Message }
func Validate(valid bool) error {
    if !valid { return &Problem{Message:"inválido"} }
    return nil
}