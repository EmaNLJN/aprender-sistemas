fn lamport(local:u64,remote:Option<u64>)->Option<u64> {
    let base=remote.map_or(local,|received|local.max(received));
    base.checked_add(1)
}