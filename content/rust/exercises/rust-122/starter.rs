use std::collections::BTreeMap;
#[derive(Clone,Debug,PartialEq)]
struct Entry { key: String, seq: u64, value: Option<String> }
fn entry(key:&str,seq:u64,value:Option<&str>) -> Entry { Entry { key:key.into(), seq, value:value.map(String::from) } }
fn compact(entries:&[Entry], drop_tombstones:bool) -> Vec<Entry> {
    let mut latest = BTreeMap::new();
    for e in entries { if !drop_tombstones || e.value.is_some() { latest.insert(e.key.clone(),e.clone()); } }
    latest.into_values().collect()
}