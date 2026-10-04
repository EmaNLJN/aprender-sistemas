package main

type FinalReader struct { Data []byte; End error }
func(r *FinalReader) Read(p []byte)(int,error){n:=copy(p,r.Data);r.Data=r.Data[n:];if len(r.Data)==0{if r.End!=nil{return n,r.End};return n,io.EOF};return n,nil}
type IdleReader struct { Calls int }
func(r *IdleReader) Read(p []byte)(int,error){r.Calls++;return 0,nil}
func CountStream(r io.Reader)(int,error){
    buffer:=make([]byte,4);total,idle:=0,0
    for{n,err:=r.Read(buffer);total+=n;if err==io.EOF{return total,nil};if err!=nil{return total,err};if n==0{idle++;if idle>=3{return total,io.ErrNoProgress}}else{idle=0}}
}