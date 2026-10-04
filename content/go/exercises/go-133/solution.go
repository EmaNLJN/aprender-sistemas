package main

func Intersection(a,b [4]int)([4]int,bool){
    if a[2]<=0||a[3]<=0||b[2]<=0||b[3]<=0{return [4]int{},false};x,y:=a[0],a[1];if b[0]>x{x=b[0]};if b[1]>y{y=b[1]};right,bottom:=a[0]+a[2],a[1]+a[3];if b[0]+b[2]<right{right=b[0]+b[2]};if b[1]+b[3]<bottom{bottom=b[1]+b[3]};if right<=x||bottom<=y{return [4]int{},false};return [4]int{x,y,right-x,bottom-y},true
}