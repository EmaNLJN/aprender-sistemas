package main

type Profile struct {
    Name string `json:"name"`
    Score int `json:"score,omitempty"`
    token string
}
func EncodeProfile(p Profile) (string,error) {data,err:=json.Marshal(p);return string(data),err}