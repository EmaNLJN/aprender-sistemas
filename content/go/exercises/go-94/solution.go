package main

type TimedValue struct { value string;expires int64 }
type TTLCache map[string]TimedValue
func(c TTLCache) Set(key,value string,now,ttl int64){if ttl<=0{delete(c,key);return};c[key]=TimedValue{value,now+ttl}}
func(c TTLCache) Get(key string,now int64)(string,bool){e,ok:=c[key];if !ok{return "",false};if now>=e.expires{delete(c,key);return "",false};return e.value,true}