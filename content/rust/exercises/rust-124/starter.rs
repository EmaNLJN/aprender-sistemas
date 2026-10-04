fn lamport(local:u64,remote:Option<u64>)->Option<u64> {
    remote.unwrap_or(local).checked_add(1)
}