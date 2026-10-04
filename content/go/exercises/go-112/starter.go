package main

var ErrPermanent = errors.New("fallo permanente")
type Sender interface {
    Send(ctx context.Context, message string, attempt int) error
}
type SendFunc func(context.Context,string,int) error
func (f SendFunc) Send(ctx context.Context, message string, attempt int) error {
    return f(ctx,message,attempt)
}
func Dispatch(ctx context.Context, messages []string, limit int, sender Sender) (int,error) {
    if limit <= 0 { return 0,fmt.Errorf("límite inválido") }
    if err := ctx.Err(); err != nil { return 0,err }
    delivered := 0
    for _,message := range messages {
        if err := ctx.Err(); err != nil { return delivered,err }
        if err := sender.Send(ctx,message,1); err != nil { return delivered,err }
        delivered++
    }
    return delivered,nil
}