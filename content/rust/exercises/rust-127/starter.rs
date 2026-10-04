struct Backend { name:String, healthy:bool, open:bool, inflight:usize, limit:usize }
fn backend(name:&str,healthy:bool,open:bool,inflight:usize,limit:usize)->Backend { Backend { name:name.into(),healthy,open,inflight,limit } }
fn pick_backend(nodes:&[Backend])->Option<String> {
    nodes.iter().min_by_key(|n|n.inflight).map(|n|n.name.clone())
}