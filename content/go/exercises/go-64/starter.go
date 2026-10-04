package main

type Job struct { state atomic.Int32 }
func (j *Job) Start() bool { j.state.Store(1);return true }
func (j *Job) Finish() bool { j.state.Store(2);return true }
func (j *Job) State() int32 { return j.state.Load() }