package main

type Profile struct {
    Name string `json:"Name"`
    Score int `json:"score"`
    token string
}
func EncodeProfile(p Profile) (string,error) {data,err:=json.Marshal(p);return string(data),err}