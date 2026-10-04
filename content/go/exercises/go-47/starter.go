package main

type Store struct { data map[string]string }
func (s *Store) Set(key,value string) {
    s.data[key] = value
}
func (s *Store) Get(key string) (string,bool) {
    value := s.data[key]
    return value, value!=""
}