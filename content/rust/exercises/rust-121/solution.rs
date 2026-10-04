use std::collections::BTreeMap;
enum Record { Put { tx: u32, key: String, value: i32 }, Commit(u32) }
fn put(tx: u32, key: &str, value: i32) -> Record { Record::Put { tx, key: key.into(), value } }
fn recover_wal(log: &[Record], durable: usize) -> Result<BTreeMap<String,i32>, &'static str> {
    let prefix = log.get(..durable).ok_or("durable inválido")?;
    let mut state = BTreeMap::new();
    let mut pending: BTreeMap<u32,BTreeMap<String,i32>> = BTreeMap::new();
    for record in prefix {
        match record {
            Record::Put { tx, key, value } => { pending.entry(*tx).or_default().insert(key.clone(), *value); }
            Record::Commit(tx) => { if let Some(changes) = pending.remove(tx) { state.extend(changes); } }
        }
    }
    Ok(state)
}