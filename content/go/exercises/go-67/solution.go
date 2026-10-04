package main

type User struct { Name string `json:"name"`; Age int `json:"age"` }
func DecodeUser(text string) (User,error) {
    d:=json.NewDecoder(strings.NewReader(text))
    d.DisallowUnknownFields()
    var u User
    if err:=d.Decode(&u);err!=nil{return User{},err}
    if u.Name=="" || u.Age<0{return User{},fmt.Errorf("usuario inválido")}
    var extra interface{}
    if err:=d.Decode(&extra);err!=io.EOF{return User{},fmt.Errorf("contenido adicional o inválido")}
    return u,nil
}