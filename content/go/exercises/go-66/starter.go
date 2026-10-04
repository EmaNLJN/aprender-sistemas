package main

func ReadLines(r io.Reader) ([]string,error) {
    scanner:=bufio.NewScanner(r)
    scanner.Buffer(make([]byte,1024),4096)
    out:=[]string{}
    for scanner.Scan(){line:=strings.TrimSpace(scanner.Text());if line!=""{out=append(out,line)}}
    return out,nil
}