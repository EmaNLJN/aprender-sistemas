package main

type Job struct { state atomic.Int32 }
func (j *Job) Start() bool { return j.state.CompareAndSwap(0,1) }
func (j *Job) Finish() bool { return j.state.CompareAndSwap(1,2) }
func (j *Job) State() int32 { return j.state.Load() }