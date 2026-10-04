package main

type OneByteReader struct { Data []byte }
func(r *OneByteReader) Read(p []byte)(int,error){if len(p)==0{return 0,nil};if len(r.Data)==0{return 0,io.EOF};p[0]=r.Data[0];r.Data=r.Data[1:];return 1,nil}
func ReadHeader(r io.Reader)([4]byte,error){
    var header [4]byte
    _,err:=io.ReadFull(r,header[:])
    if err!=nil{return [4]byte{},err}
    return header,nil
}