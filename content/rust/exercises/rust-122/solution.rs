use std::collections::BTreeMap;
#[derive(Clone,Debug,PartialEq)]
struct Entry { key: String, seq: u64, value: Option<String> }
fn entry(key:&str,seq:u64,value:Option<&str>) -> Entry { Entry { key:key.into(), seq, value:value.map(String::from) } }
fn compact(entries:&[Entry], drop_tombstones:bool) -> Vec<Entry> {
    let mut latest: BTreeMap<String,Entry> = BTreeMap::new();
    for e in entries {
        if latest.get(&e.key).map_or(true, |old| e.seq > old.seq) { latest.insert(e.key.clone(),e.clone()); }
    }
    latest.into_values().filter(|e| !drop_tombstones || e.value.is_some()).collect()
}