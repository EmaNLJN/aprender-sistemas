struct Backend { name:String, healthy:bool, open:bool, inflight:usize, limit:usize }
fn backend(name:&str,healthy:bool,open:bool,inflight:usize,limit:usize)->Backend { Backend { name:name.into(),healthy,open,inflight,limit } }
fn pick_backend(nodes:&[Backend])->Option<String> {
    let mut best:Option<&Backend>=None;
    for node in nodes {
        if !node.healthy || node.open || node.limit==0 || node.inflight>=node.limit { continue; }
        if best.map_or(true,|old|node.inflight<old.inflight || (node.inflight==old.inflight && node.name<old.name)) { best=Some(node); }
    }
    best.map(|n|n.name.clone())
}