struct Ring { data:Vec<i32>, head:usize, len:usize }
impl Ring {
    fn new(capacity:usize)->Self { Self { data:vec![0;capacity],head:0,len:0 } }
    fn push(&mut self,value:i32)->bool {
        if self.len==self.data.len() { return false; }
        let index=(self.head+self.len)%self.data.len(); self.data[index]=value; self.len+=1; true
    }
    fn pop(&mut self)->Option<i32> {
        if self.len==0 { return None; }
        let index=(self.head+self.len-1)%self.data.len(); let value=self.data[index]; self.len-=1; Some(value)
    }
}