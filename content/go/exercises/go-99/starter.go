package main

type FailedSource struct{}
func(FailedSource) Read(p []byte)(int,error){return 0,fmt.Errorf("entrada fallida")}
func Digest(r io.Reader)(string,error){
    hash:=sha256.New()
    return fmt.Sprintf("%x",hash.Sum(nil)),nil
}