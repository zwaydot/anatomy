const DATA = __DATA__;
const stage = document.querySelector(".duo-stage");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const G = DATA.gl;
let fold = 0;
let target = 0;
let frame = 0;
let last = 0;
let visible = false;
let touring = !still.matches;
let idle = 0;
let clock = 0;
let own = false;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sigmaEdge = (deg) => G.sigma30 * Math.sin((deg * Math.PI) / 180) / Math.sin(Math.PI / 6);

const show = (deg) => {
  const text = `fold ${deg.toFixed(0)}° · σ_edge ${sigmaEdge(deg).toFixed(0)} px`;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(deg)));
  stage.setAttribute("aria-valuetext", `${Math.round(deg)} degrees`);
};

const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => {
    touring = !still.matches;
    run();
  }, 4200);
};

let paint = () => {};
const follow = (values) => ({ leaf: values.leaf ?? 0 });
const controller = TURN.mount(stage, DATA.turn, {
  follow,
  onHold: () => {
    touring = false;
    clearTimeout(idle);
  },
  onFrame: (turned) => {
    if (!own) fold = target = turned.values.leaf ?? fold;
    show(turned.values.leaf ?? fold);
    paint();
  },
});

const LIGHT = (stage.closest("[data-theme]")?.getAttribute("data-theme") ?? "dark") !== "dark" ? 1 : 0;

const FRAG = `${glslPose("Leaf")}
uniform float uFold;
uniform float uLight;
uniform float uPhoneW;
uniform float uHalfT;
uniform float uGap;
uniform float uBezel;
uniform float uZ0;
uniform float uZ1;
uniform float uSigma30;
vec4 over(vec4 top,vec4 under){return top+under*(1.-top.a);}
vec4 inkFor(vec3 seen,float cover){vec3 absorbed=1.-seen;float a=max(max(absorbed.r,max(absorbed.g,absorbed.b)),cover);return vec4(vec3(a)-absorbed,a);}
vec4 finish(vec4 ink,vec2 frag){ink.rgb=min(ink.rgb,vec3(ink.a));float n=(hash12(frag)-.5)/255.*smoothstep(0.,1.5/255.,ink.a);return clamp(ink+vec4(n),0.,1.);}
float sdBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float seg(vec2 uv,vec2 c,vec2 b){return sdBox(uv-c,b,.008);}
vec3 widget(vec2 uv){
  vec3 c=mix(vec3(.05,.06,.08),vec3(.11,.13,.18),uv.y);
  float sky=smoothstep(.32,.0,uv.y);
  c=mix(c,vec3(.22,.38,.58),sky*.7);
  c=mix(c,vec3(.55,.42,.38),smoothstep(.55,.95,uv.x)*sky*.35);
  float moon=length(uv-vec2(.82,.14))-.09;
  c=mix(c,vec3(.95,.93,.86),1.-smoothstep(0.,.016,moon));
  float hill=uv.y-(.62+.04*sin(uv.x*18.));
  c=mix(c,vec3(.08,.12,.14),1.-smoothstep(0.,.04,hill));
  float card=sdBox(uv-vec2(.22,.62),vec2(.14,.16),.04);
  c=mix(c,vec3(.18,.20,.24),1.-smoothstep(0.,.01,card));
  float card2=sdBox(uv-vec2(.78,.62),vec2(.14,.16),.04);
  c=mix(c,vec3(.20,.22,.28),1.-smoothstep(0.,.01,card2));
  float bar=sdBox(uv-vec2(.22,.56),vec2(.10,.012),.006);
  c=mix(c,vec3(.40,.78,.92),1.-smoothstep(0.,.008,bar));
  float bar2=sdBox(uv-vec2(.78,.56),vec2(.10,.012),.006);
  c=mix(c,vec3(.92,.62,.40),1.-smoothstep(0.,.008,bar2));
  float dock=sdBox(uv-vec2(.5,.91),vec2(.32,.04),.02);
  c=mix(c,vec3(.12,.13,.16),1.-smoothstep(0.,.008,dock));
  for(int i=0;i<5;i++){
    float x=.26+float(i)*.12;
    float d=length(uv-vec2(x,.91))-.022;
    vec3 col=mix(vec3(.45,.75,.95),vec3(.95,.55,.40),float(i)/4.);
    c=mix(c,col,1.-smoothstep(0.,.007,d));
  }
  // 大号 9:41
  vec2 t=uv-vec2(.74,.28);
  float g9=min(min(seg(t,vec2(.00,.00),vec2(.04,.012)),seg(t,vec2(.04,.04),vec2(.012,.04))),min(seg(t,vec2(.00,.08),vec2(.04,.012)),seg(t,vec2(-.04,.04),vec2(.012,.028))));
  g9=min(g9,seg(t,vec2(.00,.16),vec2(.04,.012)));
  float g4=min(seg(t,vec2(.14,-.02),vec2(.012,.06)),seg(t,vec2(.18,.08),vec2(.05,.012)));
  g4=min(g4,seg(t,vec2(.22,-.02),vec2(.012,.12)));
  float dots=min(length(t-vec2(.32,.04))-.012,length(t-vec2(.32,.12))-.012);
  float g4b=min(seg(t,vec2(.44,-.02),vec2(.012,.06)),seg(t,vec2(.48,.08),vec2(.05,.012)));
  g4b=min(g4b,seg(t,vec2(.52,-.02),vec2(.012,.12)));
  float g1=seg(t,vec2(.66,.06),vec2(.014,.12));
  float glyphs=min(min(g9,g4),min(dots,min(g4b,g1)));
  c=mix(c,vec3(.96,.97,.99),1.-smoothstep(0.,.01,glyphs));
  return c;
}
vec2 tap(int i){
  if(i==0)return vec2(.866,.5);
  if(i==1)return vec2(.5,.866);
  if(i==2)return vec2(-.5,.866);
  if(i==3)return vec2(-.866,.5);
  if(i==4)return vec2(-.866,-.5);
  if(i==5)return vec2(-.5,-.866);
  if(i==6)return vec2(.5,-.866);
  if(i==7)return vec2(.866,-.5);
  if(i==8)return vec2(1.,0.);
  if(i==9)return vec2(0.,1.);
  if(i==10)return vec2(-1.,0.);
  return vec2(0.,-1.);
}
vec3 uiBlur(vec2 uv,float sigma){
  vec3 acc=widget(uv);
  if(sigma<0.35)return acc;
  float wsum=1.;
  vec2 px=vec2(0.0034,0.0046);
  for(int i=0;i<12;i++){
    float r=.55+1.35*fract(float(i)*0.37);
    vec2 o=tap(i)*r*sigma*px;
    float w=exp(-r*r*0.55);
    acc+=widget(uv+o)*w;
    wsum+=w;
  }
  return acc/wsum;
}
float hitPlaneY(vec3 p,vec3 d,float y,out vec3 h){
  h=vec3(0.);
  if(abs(d.y)<1e-4)return -1e6;
  float t=(y-p.y)/d.y;
  h=p+d*t;
  return t;
}
float screenMask(vec3 h,float x0,float x1,float z0,float z1,float inset){
  vec2 c=vec2((x0+x1)*.5,(z0+z1)*.5);
  vec2 b=vec2((x1-x0)*.5-inset,(z1-z0)*.5-inset);
  return 1.-smoothstep(0.,.7*pixelOf(),sdBox(h.xz-c,b,2.4));
}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 p0=rayOf(vb);
  vec3 V=towardViewer();
  vec3 pl=toLeaf(p0);
  vec3 dl=dirToLeaf(V);
  vec3 hc,hi,hr;
  float tc=hitPlaneY(pl,dl,uHalfT,hc);
  float ti=hitPlaneY(pl,dl,0.25,hi);
  float tr=hitPlaneY(p0,V,-0.25,hr);
  vec3 nC=dirFromLeaf(vec3(0.,1.,0.));
  vec3 nI=dirFromLeaf(vec3(0.,-1.,0.));
  float fC=smoothstep(0.04,0.22,dot(nC,V));
  float fI=smoothstep(0.04,0.22,dot(nI,V));
  float fR=smoothstep(0.04,0.22,V.y);
  float mC=tc>-1e5?screenMask(hc,uGap,uGap+uPhoneW,uZ0,uZ1,uBezel)*fC:0.;
  float mI=ti>-1e5?screenMask(hi,uGap,uGap+uPhoneW,uZ0,uZ1,uBezel)*fI:0.;
  float mR=tr>-1e5?screenMask(hr,uGap,uGap+uPhoneW,uZ0,uZ1,uBezel)*fR:0.;
  // 较大 t 更靠近观察者
  float best=-1e5;
  int which=-1;
  if(mC>.02 && tc>best){best=tc;which=0;}
  if(mI>.02 && ti>best){best=ti;which=1;}
  if(mR>.02 && tr>best){best=tr;which=2;}
  if(which<0){gl_FragColor=vec4(0.);return;}
  vec3 hit=which==0?fromLeaf(hc):which==1?fromLeaf(hi):hr;
  float mask=which==0?mC:which==1?mI:mR;
  // 共享像面：打开后的书页平面 y=0
  vec3 img;
  float timg=hitPlaneY(p0,V,0.,img);
  if(timg<-1e4){gl_FragColor=vec4(0.);return;}
  vec2 uv=vec2((img.x+uPhoneW)/(2.*uPhoneW),(img.z-uZ0)/(uZ1-uZ0));
  uv=clamp(uv,0.,1.);
  float restX=which==2?hr.x:(which==0?hc.x:hi.x);
  float u=clamp((restX-uGap)/uPhoneW,0.,1.);
  float sig=uSigma30*(sin(uFold)/sin(0.523598775))*u*u*u;
  vec3 col=uiBlur(uv,sig);
  float gain=which==1?1.-.52*u*sin(uFold):which==0?1.-.08*sin(uFold):1.;
  col*=gain;
  float a=mask;
  vec3 seen=pow(max(col,0.),vec3(.92));
  vec4 light=inkFor(seen,a);
  vec4 dark=vec4(seen*a,a);
  gl_FragColor=finish(mix(dark,light,uLight),gl_FragCoord.xy);
}`;

const canvas = stage.querySelector("[data-canvas=screens]");
const layer = glLayer({
  canvas,
  fragment: FRAG,
  view: [G.W, G.H],
  camera: G.camera,
  uniforms: ["uFold", "uPhoneW", "uHalfT", "uGap", "uBezel", "uZ0", "uZ1", "uSigma30", "uLeafX", "uLeafY", "uLeafZ", "uLeafT"],
  fixed: { uLight: LIGHT },
});
if (layer) stage.setAttribute("data-gl", "");

paint = () => {
  if (!layer) return;
  const deg = controller.values.leaf ?? fold;
  layer.draw(
    {
      uFold: (deg * Math.PI) / 180,
      uPhoneW: G.phoneW,
      uHalfT: G.halfT,
      uGap: G.gap,
      uBezel: G.bezel,
      uZ0: G.z0,
      uZ1: G.z1,
      uSigma30: G.sigma30,
      ...TURN.poseUniforms(controller, "leaf", "uLeaf"),
    },
    clock,
  );
};

const draw = () => {
  own = true;
  controller.set({ leaf: fold });
  own = false;
};

const tourAt = (t) => {
  const cyc = 7.2;
  const u = (t % cyc) / cyc;
  if (u < 0.12) return 0;
  if (u < 0.5) {
    const s = (u - 0.12) / 0.38;
    const e = s * s * (3 - 2 * s);
    return 180 * e;
  }
  if (u < 0.62) return 180;
  const s = (u - 0.62) / 0.38;
  const e = s * s * (3 - 2 * s);
  return 180 * (1 - e);
};

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (calm) {
    touring = false;
    clearTimeout(idle);
  }
  if (touring) {
    clock += dt;
    target = tourAt(clock);
  }
  fold = calm ? target : fold + (target - fold) * (1 - Math.exp(-dt / 0.22));
  if (Math.abs(target - fold) < 0.02) fold = target;
  if (Math.abs(fold - (controller.values.leaf ?? 0)) > 0.01 || touring) draw();
  const settled = !touring && fold === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  },
  { rootMargin: "120px 0px" },
).observe(stage);

const boxToFold = (clientX) => {
  const box = stage.getBoundingClientRect();
  return clamp(((clientX - box.left) / box.width - 0.18) / 0.64, 0, 1) * 180;
};
let drag = false;
stage.addEventListener("pointerdown", (event) => {
  hold();
  drag = true;
  stage.setPointerCapture(event.pointerId);
  stage.setAttribute("data-drag", "");
  target = boxToFold(event.clientX);
  run();
});
stage.addEventListener("pointermove", (event) => {
  if (!drag) return;
  hold();
  target = boxToFold(event.clientX);
  run();
});
const release = () => {
  drag = false;
  stage.removeAttribute("data-drag");
};
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = fold + (event.shiftKey ? 15 : 5);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = fold - (event.shiftKey ? 15 : 5);
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = 180;
  if (next === null) return;
  event.preventDefault();
  hold();
  target = clamp(next, 0, 180);
  run();
});
if (still.matches) touring = false;
draw();
show(fold);
