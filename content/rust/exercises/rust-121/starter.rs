use std::collections::BTreeMap;
enum Record { Put { tx: u32, key: String, value: i32 }, Commit(u32) }
fn put(tx: u32, key: &str, value: i32) -> Record { Record::Put { tx, key: key.into(), value } }
fn recover_wal(log: &[Record], durable: usize) -> Result<BTreeMap<String,i32>, &'static str> {
    let prefix = log.get(..durable).ok_or("durable inválido")?;
    let mut state = BTreeMap::new();
    for record in prefix { if let Record::Put { key, value, .. } = record { state.insert(key.clone(), *value); } }
    Ok(state)
}