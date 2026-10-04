package main

type FailedSource struct{}
func(FailedSource) Read(p []byte)(int,error){return 0,fmt.Errorf("entrada fallida")}
func Digest(r io.Reader)(string,error){
    hash:=sha256.New()
    if _,err:=io.Copy(hash,r);err!=nil{return "",err}
    return fmt.Sprintf("%x",hash.Sum(nil)),nil
}