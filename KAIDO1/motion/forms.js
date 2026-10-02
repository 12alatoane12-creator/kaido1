/* Deterministic, reusable geometry. No DOM, renderer or random asset dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KNForms=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const tau=Math.PI*2;
  const bounded=(n,min,max,fallback)=>Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;
  function createMesh(rings=18,segments=72){
    rings=bounded(rings,4,24,12);segments=bounded(segments,16,128,48);
    const count=rings*(segments+1),forms={knot:new Float32Array(count*3),orbit:new Float32Array(count*3),wave:new Float32Array(count*3)};
    for(let ring=0;ring<rings;ring++){
      const v=ring/rings*tau,cv=Math.cos(v),sv=Math.sin(v),latitude=(ring/(rings-1)-.5)*2.7;
      for(let segment=0;segment<=segments;segment++){
        const u=segment/segments*tau,cu=Math.cos(u),su=Math.sin(u),c2=Math.cos(u*2),s2=Math.sin(u*2),c3=Math.cos(u*3),s3=Math.sin(u*3),offset=(ring*(segments+1)+segment)*3;
        const orbitRadius=.67+.25*cv;
        forms.orbit[offset]=cu*orbitRadius;forms.orbit[offset+1]=sv*.25;forms.orbit[offset+2]=su*orbitRadius;
        const knotRadius=.64+.22*c3,dx=-.66*s3*c2-knotRadius*2*s2,dy=.66*c3,dz=-.66*s3*s2+knotRadius*2*c2;
        const length=Math.hypot(dx,dy,dz),tx=dx/length,ty=dy/length,tz=dz/length,normalLength=Math.hypot(dx,dz),nx=-dz/normalLength,nz=dx/normalLength;
        const bx=ty*nz,by=tz*nx-tx*nz,bz=-ty*nx,tube=.12;
        forms.knot[offset]=knotRadius*c2+tube*(cv*nx+sv*bx);
        forms.knot[offset+1]=.22*s3+tube*sv*by;
        forms.knot[offset+2]=knotRadius*s2+tube*(cv*nz+sv*bz);
        const waveRadius=(.9+.105*Math.cos(u*4+latitude*2))*Math.cos(latitude);
        forms.wave[offset]=cu*waveRadius;forms.wave[offset+1]=Math.sin(latitude)*.72+.06*Math.sin(u*3)*Math.cos(latitude);forms.wave[offset+2]=su*waveRadius;
      }
    }
    return {rings,segments,count,forms};
  }
  function createMorph(forms,initial='knot'){
    if(!forms[initial])throw Error('Unknown initial form');
    const values=new Float32Array(forms[initial]),source=new Float32Array(values);let target=forms[initial],name=initial,elapsed=.85,settled=true;
    return {
      values,get settled(){return settled;},
      select(next,{instant=false}={}){
        if(!forms[next])return false;
        if(instant){name=next;target=forms[next];values.set(target);source.set(target);elapsed=.85;settled=true;return true;}
        if(name===next)return false;
        source.set(values);target=forms[next];name=next;elapsed=0;settled=false;return true;
      },
      advance(seconds){
        if(settled||!Number.isFinite(seconds)||seconds<0)return values;
        elapsed=Math.min(.85,elapsed+seconds);const t=elapsed/.85,e=t*t*t*(t*(t*6-15)+10);
        for(let i=0;i<values.length;i++)values[i]=source[i]+(target[i]-source[i])*e;
        if(elapsed===.85){values.set(target);settled=true;}return values;
      }
    };
  }
  return {createMesh,createMorph};
});
