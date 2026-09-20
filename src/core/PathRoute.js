export class PathRoute {
  constructor(points) {
    this.points = points.map(p => ({...p}));
    this.segments = [];
    this.totalLength = 0;
    for (let i=0;i<this.points.length-1;i++) {
      const a=this.points[i], b=this.points[i+1];
      const length=Math.hypot(b.x-a.x,b.y-a.y);
      this.segments.push({a,b,length,start:this.totalLength});
      this.totalLength += length;
    }
  }
  getPosition(progress) {
    const p=Math.max(0,Math.min(1,progress));
    const target=p*this.totalLength;
    let seg=this.segments[this.segments.length-1];
    for (const s of this.segments) {
      if (target <= s.start+s.length) { seg=s; break; }
    }
    const local=seg.length ? Math.max(0,Math.min(1,(target-seg.start)/seg.length)) : 0;
    return {x:seg.a.x+(seg.b.x-seg.a.x)*local,y:seg.a.y+(seg.b.y-seg.a.y)*local};
  }
  getAngle(progress) {
    const p=Math.max(0,Math.min(.999999,progress));
    const target=p*this.totalLength;
    let seg=this.segments[this.segments.length-1];
    for (const s of this.segments) {
      if (target <= s.start+s.length) { seg=s; break; }
    }
    return Math.atan2(seg.b.y-seg.a.y,seg.b.x-seg.a.x);
  }
}
