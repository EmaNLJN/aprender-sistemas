package main

type Resource struct { CloseErr error; Closes int }
func (r *Resource) Close() error { r.Closes++; return r.CloseErr }
func Use(r *Resource, workErr error) (err error) {
    defer r.Close()
    return workErr
}