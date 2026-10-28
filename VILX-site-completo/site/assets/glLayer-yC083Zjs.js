import{Renderer as W,Camera as _,Transform as A,Plane as T,Texture as V,Program as I,Mesh as R}from"./ogl-CfiLqOdF.js";const C=`
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uVelocity;
uniform float uStrength;
uniform float uBend;
uniform float uViewportW;
varying vec2 vUv;
varying float vShade;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  float half_w = uViewportW * 0.5;
  float nx = world.x / half_w;
  float cx = modelMatrix[3].x / half_w;
  // Curvatura: cada foto se inclina como se a faixa fosse a parede interna
  // de um cilindro. O centro da foto fica no lugar, então a legenda em DOM
  // continua alinhada logo abaixo.
  world.z -= uBend * (nx * nx - cx * cx) * uViewportW * 0.14;
  // Arrasto líquido: o meio da foto "atrasa" em relação às bordas.
  float bow = sin(uv.y * 3.14159265);
  world.x -= bow * uVelocity * uStrength * 46.0;
  world.z -= sin(uv.x * 3.14159265) * abs(uVelocity) * uStrength * 70.0;
  vShade = clamp(1.0 - abs(cx) * 0.28, 0.55, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
}`,q=`
precision highp float;
uniform sampler2D tMap;
uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform vec2 uMouse;
uniform float uHover;
uniform float uVelocity;
uniform float uStrength;
uniform float uRadius;
uniform float uAlpha;
uniform float uDim;
uniform float uTime;
varying vec2 vUv;
varying float vShade;

void main() {
  vec2 uv = vUv;
  float v = uVelocity * uStrength;

  // ondulação líquida, só existe enquanto há movimento
  uv.x += sin(uv.y * 8.0 + uTime * 2.2) * 0.014 * v;
  uv.y += sin(uv.x * 6.0 + uTime * 1.7) * 0.01 * abs(v);

  // lente discreta sob o cursor
  vec2 aspect = vec2(uPlaneSize.x / uPlaneSize.y, 1.0);
  vec2 d = uv - uMouse;
  float dist = length(d * aspect);
  float lens = smoothstep(0.42, 0.0, dist) * uHover * uStrength;
  uv -= d * lens * 0.16;

  // object-fit: cover
  float pr = uPlaneSize.x / uPlaneSize.y;
  float ir = uImageSize.x / uImageSize.y;
  vec2 s = pr > ir ? vec2(1.0, ir / pr) : vec2(pr / ir, 1.0);
  vec2 cuv = (uv - 0.5) * s + 0.5;

  float shift = 0.006 * v + lens * 0.004;
  vec3 col;
  col.r = texture2D(tMap, cuv + vec2(shift, 0.0)).r;
  col.g = texture2D(tMap, cuv).g;
  col.b = texture2D(tMap, cuv - vec2(shift, 0.0)).b;
  col *= vShade * mix(1.0, 0.55, uDim);

  // cantos arredondados (SDF)
  vec2 p = (vUv - 0.5) * uPlaneSize;
  vec2 q = abs(p) - (uPlaneSize * 0.5 - uRadius);
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  float a = 1.0 - smoothstep(-0.75, 0.75, sd);
  gl_FragColor = vec4(col, a * uAlpha);
}`;function G(r){const{canvas:d,images:z}=r,v=new W({canvas:d,dpr:Math.min(window.devicePixelRatio||1,2),alpha:!0,antialias:!1,premultipliedAlpha:!1,powerPreference:"high-performance"}),o=v.gl;o.clearColor(0,0,0,0);const m=new _(o,{fov:40,near:1,far:8e3}),g=new A,p=new T(o,{widthSegments:20,heightSegments:10});let s=1,c=1,y=0;const S=e=>{e.preventDefault(),r.onLost()};d.addEventListener("webglcontextlost",S);const x=z.map(e=>{const i=new V(o,{generateMipmaps:v.isWebgl2,minFilter:v.isWebgl2?o.LINEAR_MIPMAP_LINEAR:o.LINEAR,wrapS:o.CLAMP_TO_EDGE,wrapT:o.CLAMP_TO_EDGE}),t=new I(o,{vertex:C,fragment:q,transparent:!0,depthTest:!1,uniforms:{tMap:{value:i},uImageSize:{value:[e.naturalWidth||e.width||1,e.naturalHeight||e.height||1]},uPlaneSize:{value:[1,1]},uMouse:{value:[.5,.5]},uHover:{value:0},uVelocity:{value:0},uStrength:{value:r.strength},uBend:{value:r.bend},uViewportW:{value:1},uRadius:{value:r.radius},uAlpha:{value:0},uDim:{value:0},uTime:{value:0}}}),u=new R(o,{geometry:p,program:t});u.setParent(g),u.visible=!1;const a={mesh:u,program:t,texture:i,ready:!1,shown:!1,drawn:!1,hover:0,dim:0},n=()=>{a.ready||!e.naturalWidth||(i.image=e,t.uniforms.uImageSize.value=[e.naturalWidth,e.naturalHeight],a.ready=!0,r.onReady())},f=()=>{e.decode?e.decode().then(n,n):n()};return e.complete&&e.naturalWidth?f():e.addEventListener("load",f,{once:!0}),a});function M(){const e=d.parentElement;s=e.clientWidth||1,c=e.clientHeight||1,v.setSize(s,c),m.perspective({aspect:s/c});const i=m.fov*Math.PI/180;m.position.z=c/2/Math.tan(i/2)}function E(e){y+=e.dt;let i=!1;x.forEach((t,u)=>{const a=e.layout[u];if(t.drawn=!1,!a||!t.ready){t.mesh.visible=!1;return}const n=a.x+e.offset;if(t.mesh.visible=n+a.w>-s*.2&&n<s*1.2,!t.mesh.visible)return;const f=e.mouse.inside&&e.mouse.x>n&&e.mouse.x<n+a.w&&e.mouse.y>a.y&&e.mouse.y<a.y+a.h,b=(P,h,D)=>{const w=P+(h-P)*(1-Math.exp(-e.dt*D));return Math.abs(w-h)>.002&&(i=!0),Math.abs(w-h)<.002?h:w};t.hover=b(t.hover,f?1:0,6),t.dim=b(t.dim,u===e.active?0:1,6);const l=t.program.uniforms;f&&(l.uMouse.value=[(e.mouse.x-n)/a.w,1-(e.mouse.y-a.y)/a.h]),l.uHover.value=t.hover,l.uDim.value=t.dim,l.uAlpha.value=1,l.uVelocity.value=e.velocity,l.uViewportW.value=s,l.uPlaneSize.value=[a.w,a.h],l.uTime.value=y,t.mesh.scale.set(a.w,a.h,1),t.mesh.position.set(n+a.w/2-s/2,c/2-(a.y+a.h/2),0),t.drawn=!0});try{v.render({scene:g,camera:m})}catch(t){return console.warn("[FlexCarousel] WebGL indisponível para estas imagens, usando fotos em DOM",t),r.onLost(),!1}return x.forEach((t,u)=>{t.drawn&&!t.shown&&(t.shown=!0,r.onShown(u))}),i}function L(){d.removeEventListener("webglcontextlost",S),x.forEach(e=>{e.program.remove(),o.deleteTexture(e.texture.texture)}),p.remove(),o.getExtension("WEBGL_lose_context")?.loseContext()}return M(),{resize:M,render:E,dispose:L}}export{G as createGLLayer};
