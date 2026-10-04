package main

func QuorumsIntersect(n,w,r uint64)(bool,error) {
    if n==0 || w==0 || r==0 || w>n || r>n { return false,fmt.Errorf("configuración inválida") }
    return w+r>=n,nil
}