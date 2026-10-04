package main

func Hit(o,d,center [2]float64,r float64)(float64,bool){
    a:=d[0]*d[0]+d[1]*d[1];if a==0 || r<=0{return 0,false}
    x,y:=o[0]-center[0],o[1]-center[1];b:=2*(x*d[0]+y*d[1]);c:=x*x+y*y-r*r
    disc:=b*b-4*a*c;if disc<0{return 0,false};root:=math.Sqrt(disc)
    t1,t2:=(-b-root)/(2*a),(-b+root)/(2*a)
    if t1>=0{return t1,true};if t2>=0{return t2,true};return 0,false
}