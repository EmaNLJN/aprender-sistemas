package main

type User struct { Name string `json:"name"`; Age int `json:"age"` }
func DecodeUser(text string) (User,error) {
    d:=json.NewDecoder(strings.NewReader(text))
    var u User
    _=io.EOF
    if err:=d.Decode(&u);err!=nil{return User{},err}
    return u,nil
}