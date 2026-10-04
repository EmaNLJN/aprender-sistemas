package main

type Store struct { data map[string]string }
func (s *Store) Set(key,value string) {
    if s.data==nil { s.data=make(map[string]string) }
    s.data[key] = value
}
func (s *Store) Get(key string) (string,bool) {
    value, ok := s.data[key]
    return value, ok
}