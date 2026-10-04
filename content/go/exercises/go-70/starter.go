package main

type LimitedWriter struct { Limit int; Err error }
func (w LimitedWriter) Write(p []byte)(int,error){if w.Err!=nil{return 0,w.Err};n:=len(p);if n>w.Limit{n=w.Limit};return n,nil}
func WriteRecord(w io.Writer,record string) error {
    _,err:=io.WriteString(w,record)
    return err
}