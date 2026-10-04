package main

var ErrPermanent = errors.New("fallo permanente")
func Retry(limit int, attempt func(int) (string,error)) (string,int,error) {
    if limit <= 0 { return "",0,fmt.Errorf("límite inválido") }
    value,err := attempt(1)
    if err != nil { return "",1,err }
    return value,1,nil
}