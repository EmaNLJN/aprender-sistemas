package main

type CacheEntry struct { key,value string }
type LRU struct { capacity int;order *list.List;index map[string]*list.Element }
func NewLRU(capacity int)*LRU{return &LRU{capacity,list.New(),make(map[string]*list.Element)}}
func(c *LRU) Get(key string)(string,bool){e,ok:=c.index[key];if !ok{return "",false};return e.Value.(CacheEntry).value,true}
func(c *LRU) Put(key,value string){
    if c.capacity<=0{return}
    if e,ok:=c.index[key];ok{e.Value=CacheEntry{key,value};c.order.MoveToFront(e);return}
    c.index[key]=c.order.PushFront(CacheEntry{key,value})
    if c.order.Len()>c.capacity{old:=c.order.Back();delete(c.index,old.Value.(CacheEntry).key);c.order.Remove(old)}
}