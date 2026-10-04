package main

var ErrPermanent = errors.New("fallo permanente")
func Retry(limit int, attempt func(int) (string,error)) (string,int,error) {
    if limit <= 0 { return "",0,fmt.Errorf("límite inválido") }
    var last error
    for offset := 0; offset < limit; offset++ {
        n := offset + 1
        value,err := attempt(n)
        if err == nil { return value,n,nil }
        last = err
        if errors.Is(err,ErrPermanent) { return "",n,err }
    }
    return "",limit,last
}