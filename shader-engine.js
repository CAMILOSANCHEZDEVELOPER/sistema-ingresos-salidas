/* ================================================================
   Rueda y Gana — Motor de fondos shader interactivos (WebGL1)
   3 opciones: carretera (grilla neón), synthwave (fluido), esmeralda (rueda)
   Reacciona a: mouse (cámara parallax) + click (ripple/pulso)
   ================================================================ */
(function () {
  "use strict";

  // ---- Fuente de ruido compartida (para el fluido synthwave) ----
  const NOISE = `
    float hash(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
      vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
    }
    float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }
  `;

  const HEAD = `
    precision highp float;
    uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse;
    uniform vec2 u_clickPos; uniform float u_clickAge;
    uniform float u_speed; uniform float u_intensity; uniform float u_parallax;
  `;

  // pequeño hash para estrellas (debe ir tras la declaración de precisión)
  const STAR = `float hashGlow(vec2 p){ return fract(sin(dot(floor(p*180.0), vec2(12.99,78.23)))*43758.5453); }\n`;

  // ---------- OPCIÓN 01 — CARRETERA NEÓN ----------
  const FRAG_CARRETERA = HEAD + STAR + `
    void main(){
      vec2 uv = (2.0*gl_FragCoord.xy - u_res)/u_res.y;
      vec2 m = u_mouse * u_parallax;
      float horizon = -0.18 + m.y*0.14;
      vec3 col = vec3(0.0);

      if(uv.y > horizon){
        float ty = (uv.y - horizon);
        vec3 sky = mix(vec3(0.015,0.04,0.10), vec3(0.0,0.0,0.015), clamp(ty*1.4,0.0,1.0));
        vec2 sunp = vec2(m.x*0.35, horizon + 0.42);
        float dd = length((uv - sunp)*vec2(1.0,1.2));
        float disc = smoothstep(0.34,0.31,dd);
        float stripe = step(0.0, sin((uv.y - horizon)*55.0));
        float sun = smoothstep(0.46,0.0,dd);
        vec3 sunCol = mix(vec3(0.0,0.95,1.0), vec3(0.20,0.35,1.0), clamp((uv.y-horizon)/0.55,0.0,1.0));
        col = sky + sunCol*sun*0.22;
        col += sunCol*disc*stripe*1.05;
        // estrellas tenues
        float st = step(0.992, hashGlow(uv));
        col += vec3(0.4,0.7,1.0)*st*0.5*clamp(ty*1.5,0.0,1.0);
      } else {
        float depth = 1.0/(horizon - uv.y);
        float scroll = u_time*u_speed*1.6;
        float gx = (uv.x + m.x*0.25) * depth * 2.2;
        float gz = depth*1.4 + scroll;
        float lx = smoothstep(0.07,0.0, abs(fract(gx)-0.5));
        float lz = smoothstep(0.07,0.0, abs(fract(gz)-0.5));
        float grid = max(lx,lz);
        float fade = clamp(1.0 - depth*0.035, 0.0, 1.0);
        vec3 gcol = vec3(0.0,0.85,1.0);
        col = gcol*grid*fade*1.45;
        col += vec3(0.0,0.18,0.40)*fade*0.5;
      }

      float age=u_clickAge;
      if(age<2.5){
        float r=age*1.4;
        float ring=smoothstep(0.18,0.0, abs(length(uv-u_clickPos)-r));
        col += vec3(0.3,0.9,1.0)*ring*(1.0-age/2.5);
      }
      col *= u_intensity;
      col = pow(max(col,0.0), vec3(0.85));
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 02 — SYNTHWAVE LÍQUIDO ----------
  const FRAG_SYNTH = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.25;
      vec2 p=uv*1.15 + m*0.35;
      vec2 q=vec2(fbm(p+vec2(0.0,t)), fbm(p+vec2(5.2,1.3)-t));
      vec2 r=vec2(fbm(p+1.6*q+vec2(1.7,9.2)+0.5*t), fbm(p+1.6*q+vec2(8.3,2.8)-0.5*t));
      float f=fbm(p+1.8*r);
      float md=length(uv-m);
      f += 0.25*exp(-md*md*2.5)*sin(md*10.0 - u_time*3.0);

      vec3 deep=vec3(0.16,0.0,0.30);
      vec3 mag =vec3(0.95,0.10,0.65);
      vec3 cyan=vec3(0.10,0.85,1.0);
      vec3 col=mix(deep,mag,smoothstep(0.25,0.6,f));
      col=mix(col,cyan,smoothstep(0.55,0.95,f+0.12*r.x));
      col += cyan*pow(clamp(r.y,0.0,1.0),3.0)*0.45;
      col += mag*pow(clamp(q.x,0.0,1.0),3.0)*0.28;

      float age=u_clickAge;
      if(age<2.5){
        float rr=age*1.3;
        float ring=smoothstep(0.2,0.0, abs(length(uv-u_clickPos)-rr));
        col += vec3(1.0,0.6,1.0)*ring*(1.0-age/2.5);
      }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 03 — GANANCIA ESMERALDA (rueda/turbina 3D) ----------
  const FRAG_ESMER = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      vec2 center=m*0.28;
      vec2 d=uv-center;
      float r=length(d);
      float a=atan(d.y,d.x);
      float t=u_time*u_speed;

      float spokes=cos(a*18.0 + sin(t*0.4)*0.5 + t*0.3);
      float rings=sin(r*16.0 - t*2.2);
      float pat=spokes*0.45+rings*0.55;

      vec3 base=vec3(0.0,0.10,0.07);
      vec3 mid =vec3(0.0,0.45,0.28);
      vec3 hi  =vec3(0.25,1.0,0.55);
      vec3 col=mix(base,mid,smoothstep(-0.4,0.4,pat));
      col=mix(col,hi,smoothstep(0.4,0.95,pat));

      float spec=pow(max(0.0,rings),10.0);
      col+=hi*spec*0.35;
      float lightD=length(uv-m*0.6);
      col+=hi*smoothstep(0.95,0.0,lightD)*0.15;
      col+=hi*smoothstep(0.18,0.0,r)*0.9;
      col*=smoothstep(2.3,0.1,r);

      float age=u_clickAge;
      if(age<2.5){
        float rr=age*1.5;
        float ring=smoothstep(0.16,0.0, abs(r-rr));
        col+=hi*ring*(1.0-age/2.5)*1.2;
      }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 04 — TÚNEL HIPERVELOZ ----------
  const FRAG_TUNEL = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      vec2 p=uv - m*0.32;                 // dirección del túnel
      float r=length(p)+0.0001;
      float a=atan(p.y,p.x);
      float t=u_time*u_speed;
      float z=0.34/r + t*1.6;             // avance hacia el vértice
      float spokeId=floor((a/6.2831+0.5)*54.0);
      float rnd=fract(sin(spokeId*43.13)*1234.543);
      float seg=fract(z*0.5 + rnd);
      float streak=pow(0.5+0.5*sin((a/6.2831+0.5)*6.2831*54.0),10.0);
      float bright=streak*smoothstep(0.0,0.25,seg)*smoothstep(1.0,0.6,seg);
      vec3 cyan=vec3(0.2,0.85,1.0), blue=vec3(0.35,0.45,1.0);
      vec3 col=mix(blue,cyan,seg)*bright*1.6;
      col += cyan*smoothstep(0.45,0.0,r)*0.6;          // brillo del vértice
      col *= clamp(r*1.6,0.0,1.0)+0.18;                // niebla en profundidad
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.7; float ring=smoothstep(0.16,0.0,abs(r-rr)); col+=cyan*ring*(1.0-age/2.5)*1.4; }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 05 — CIRCUITO VIVO (Voronoi) ----------
  const HASH2 = `vec2 hash2(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }\n`;
  const FRAG_CIRCUITO = HEAD + HASH2 + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.35;
      vec2 p=(uv+m*0.2)*3.6;
      vec2 g=floor(p), f=fract(p);
      float d1=8.0,d2=8.0;
      for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
        vec2 o=vec2(float(i),float(j));
        vec2 rr=hash2(g+o);
        vec2 pos=o+0.5+0.45*sin(t+6.2831*rr);
        float d=length(f-pos);
        if(d<d1){ d2=d1; d1=d; } else if(d<d2){ d2=d; }
      }
      float wire=1.0-smoothstep(0.0,0.06,d2-d1);
      vec3 base=vec3(0.0,0.055,0.05);
      vec3 cyan=vec3(0.1,0.9,0.85), green=vec3(0.25,1.0,0.5);
      vec3 col=base + mix(cyan,green,0.5+0.5*sin(d1*6.0+t*3.0))*wire*1.2;
      col += green*smoothstep(0.13,0.0,d1)*0.9;        // nodos
      float md=length(uv-m);
      col += cyan*smoothstep(0.6,0.0,md)*wire*1.4;      // realce con el mouse
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.4; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=green*ring*(1.0-age/2.5)*(wire*2.0+0.25); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 06 — AURORA SEDOSA ----------
  const FRAG_AURORA = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.25;
      vec3 col=vec3(0.012,0.02,0.05);
      for(int i=0;i<5;i++){
        float fi=float(i);
        float yoff=-0.55 + fi*0.24 + m.y*0.18;
        float wave=sin(uv.x*2.0 + t*2.0 + fi*1.3 + m.x*1.6)*0.13
                 + sin(uv.x*4.3 - t*1.5 + fi)*0.05;
        float d=abs(uv.y-(yoff+wave));
        float band=smoothstep(0.17,0.0,d);
        vec3 c=mix(vec3(0.1,0.95,0.6), vec3(0.5,0.2,1.0), fract(fi*0.3+t*0.15));
        c=mix(c, vec3(0.1,0.7,1.0), 0.5+0.5*sin(fi+t));
        col += c*band*0.55;
      }
      col += vec3(0.2,0.5,0.45)*pow(0.5+0.5*sin(uv.x*28.0+t*3.0),4.0)*0.05;
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.2,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.4,1.0,0.8)*ring*(1.0-age/2.5); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 07 — PLASMA METABALL ----------
  const FRAG_PLASMA = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed;
      float field=0.0;
      for(int i=0;i<6;i++){
        float fi=float(i);
        vec2 c=vec2(sin(t*0.6+fi*1.7)*0.85, cos(t*0.5+fi*2.3)*0.52);
        field += 0.12/(length(uv-c)+0.05);
      }
      field += 0.16/(length(uv-m)+0.04);               // blob del mouse
      float age=u_clickAge;
      if(age<2.0){ field += (1.0-age/2.0)*0.20/(length(uv-u_clickPos)+0.04); }
      vec3 a=vec3(0.6,0.0,0.85), b=vec3(0.0,0.8,1.0), rim=vec3(1.0,0.3,0.72);
      vec3 col=mix(vec3(0.04,0.0,0.08), a, smoothstep(0.8,1.6,field));
      col=mix(col, b, smoothstep(1.6,2.4,field));
      col += rim*smoothstep(1.85,2.05,field)*0.7;       // borde brillante
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 08 — PANAL HEX ----------
  const HEXFN = `
    float hexDist(vec2 p){ p=abs(p); return max(dot(p,normalize(vec2(1.0,1.73))), p.x); }
    vec4 hexGrid(vec2 uv){
      vec2 r=vec2(1.0,1.73), h=r*0.5;
      vec2 a=mod(uv,r)-h, b=mod(uv-h,r)-h;
      vec2 gv = dot(a,a)<dot(b,b) ? a : b;
      float ed=0.5-hexDist(gv);
      vec2 id=uv-gv;
      return vec4(ed,id.x,id.y,0.0);
    }
  `;
  const FRAG_HEX = HEAD + HEXFN + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed;
      float sc=5.0;
      vec2 p=(uv+m*0.15)*sc;
      vec4 hg=hexGrid(p);
      float edge=smoothstep(0.045,0.0,hg.x);
      vec2 id=hg.yz/sc;
      float dC=length(id-m);
      float pulse=0.5+0.5*sin(dC*8.0 - t*4.0);
      vec3 base=vec3(0.0,0.05,0.12), cyan=vec3(0.1,0.72,1.0);
      vec3 col=base + cyan*edge*0.45;
      col += cyan*pulse*smoothstep(0.0,0.5,hg.x)*0.5;
      col += vec3(0.3,0.9,1.0)*smoothstep(0.75,0.0,dC)*smoothstep(0.0,0.5,hg.x)*0.6;
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.5; float dr=length(id-u_clickPos); float ring=smoothstep(0.22,0.0,abs(dr-rr));
        col+=cyan*ring*(1.0-age/2.5); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 09 — LLUVIA DIGITAL ----------
  const FRAG_LLUVIA = HEAD + `
    float hsh(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5); }
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      vec2 p=uv+m*0.25;
      float cols=34.0;
      float cx=floor(p.x*cols);
      float spd=0.6+hsh(vec2(cx,1.0))*1.6;
      float t=u_time*u_speed*spd;
      float yy=p.y*4.0 + t;
      float row=floor(yy);
      float ch=hsh(vec2(cx,row));
      float glyph=step(0.35,ch);
      float head=fract(yy);
      float trail=pow(head,2.2);
      float bright=glyph*trail;
      float lead=smoothstep(0.92,1.0,head)*glyph;
      vec3 green=vec3(0.1,1.0,0.45);
      vec3 col=green*bright*0.8 + vec3(0.7,1.0,0.8)*lead;
      float md=smoothstep(0.6,0.0,length(uv-m));
      col += green*md*glyph*0.5;
      float age=u_clickAge;
      if(age<2.2){ float rr=age*1.5; float ring=smoothstep(0.18,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.6,1.0,0.7)*ring*(1.0-age/2.2)*glyph*2.0; }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 10 — NEBULOSA CÓSMICA ----------
  const FRAG_NEBULOSA = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.12;
      vec2 p=uv*1.3 + m*0.4;
      float n=fbm(p+vec2(t,fbm(p-t)));
      float n2=fbm(p*2.0 - vec2(t*1.3,0.0));
      vec3 deep=vec3(0.02,0.01,0.06);
      vec3 pur=vec3(0.42,0.12,0.7), pink=vec3(0.95,0.25,0.6), blue=vec3(0.15,0.4,1.0);
      vec3 col=mix(deep,pur,smoothstep(0.3,0.65,n));
      col=mix(col,pink,smoothstep(0.55,0.9,n)*0.8);
      col=mix(col,blue,smoothstep(0.4,0.8,n2)*0.4);
      // estrellas
      float st=step(0.9975, fract(sin(dot(floor(uv*240.0),vec2(12.9,78.2)))*43758.5));
      col += vec3(0.9,0.95,1.0)*st*(0.6+0.4*sin(u_time*3.0+uv.x*40.0));
      col += blue*smoothstep(0.7,0.0,length(uv-m))*n*0.5;
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.4; float ring=smoothstep(0.22,0.0,abs(length(uv-u_clickPos)-rr));
        col+=pink*ring*(1.0-age/2.5); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 11 — CALEIDOSCOPIO ----------
  const FRAG_CALEIDO = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.4;
      float r=length(uv);
      float a=atan(uv.y,uv.x)+t*0.3+m.x*1.5;
      float seg=6.2831/8.0;
      a=mod(a,seg); a=abs(a-seg*0.5);
      vec2 p=vec2(cos(a),sin(a))*r;
      float pat=sin(p.x*9.0 - t*2.0)*cos(p.y*9.0 + t*1.5);
      pat += 0.5*sin(r*14.0 - t*3.0 + m.y*4.0);
      vec3 c1=vec3(0.1,0.85,1.0), c2=vec3(0.8,0.2,0.9), c3=vec3(0.2,1.0,0.6);
      vec3 col=mix(c1,c2,0.5+0.5*sin(pat*3.1));
      col=mix(col,c3,0.5+0.5*cos(pat*2.0+t));
      col*=smoothstep(1.7,0.1,r)*0.5+0.4;
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.16,0.0,abs(r-rr));
        col+=vec3(1.0,0.9,0.7)*ring*(1.0-age/2.5)*1.2; }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 12 — RADAR / VELOCÍMETRO ----------
  const FRAG_RADAR = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      vec2 c=uv-m*0.3;
      float r=length(c);
      float a=atan(c.y,c.x);
      float t=u_time*u_speed;
      vec3 green=vec3(0.1,1.0,0.5), dgreen=vec3(0.0,0.25,0.15);
      vec3 col=dgreen*0.4;
      // anillos
      col += green*smoothstep(0.02,0.0,abs(fract(r*4.0-0.0)-0.0)) ;
      float rings=smoothstep(0.04,0.0,abs(fract(r*4.0)-0.0));
      col += green*0.5*smoothstep(0.05,0.0,abs(fract(r*4.0)-0.5));
      // líneas radiales
      col += green*0.4*smoothstep(0.04,0.0,abs(fract(a/6.2831*12.0)-0.5));
      // barrido
      float sweep=mod(a - t*2.0, 6.2831);
      float beam=smoothstep(1.2,0.0,sweep)*smoothstep(2.0,0.1,r);
      col += green*beam*0.9;
      // blip cerca del mouse
      float md=length(uv-m);
      col += vec3(0.6,1.0,0.7)*smoothstep(0.08,0.0,md)*(0.6+0.4*sin(t*6.0));
      col *= smoothstep(2.1,0.2,r)+0.05;
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.6; float ring=smoothstep(0.14,0.0,abs(r-rr));
        col+=green*ring*(1.0-age/2.5)*1.4; }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 13 — OLAS DE NEÓN ----------
  const FRAG_OLAS = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed;
      vec3 col=vec3(0.01,0.015,0.04);
      for(int i=0;i<7;i++){
        float fi=float(i);
        float ph=fi*0.9;
        float amp=0.16 + m.y*0.1;
        float y=sin(uv.x*1.6 + t*1.2 + ph + m.x*2.0)*amp
              + sin(uv.x*3.7 - t*0.8 + ph*1.7)*amp*0.4;
        y += (fi-3.0)*0.16;
        float d=abs(uv.y - y);
        float line=smoothstep(0.035,0.0,d);
        vec3 c=mix(vec3(0.1,0.8,1.0), vec3(0.9,0.2,0.8), fract(fi/7.0+t*0.1));
        col += c*line*1.1;
        col += c*smoothstep(0.16,0.0,d)*0.12;
      }
      float age=u_clickAge;
      if(age<2.2){ float rr=age*1.6; float ring=smoothstep(0.18,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.6,0.9,1.0)*ring*(1.0-age/2.2); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 14 — CRISTAL FRACTAL ----------
  const FRAG_FRACTAL = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.3;
      vec2 p=uv*1.4;
      float scale=1.0;
      float d=1e9;
      for(int i=0;i<6;i++){
        p=abs(p)/dot(p,p) - vec2(0.8+0.18*sin(t)+m.x*0.2, 0.86+0.1*cos(t*0.7)+m.y*0.2);
        scale*=dot(p,p);
        d=min(d, length(p));
      }
      float g=1.0/(1.0+d*8.0);
      vec3 c1=vec3(0.1,0.9,1.0), c2=vec3(0.7,0.2,1.0), c3=vec3(0.2,1.0,0.7);
      vec3 col=mix(c1,c2,fract(log(scale)*0.2+t));
      col=mix(col,c3,g);
      col*=0.4+g*1.8;
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(1.0,0.9,0.8)*ring*(1.0-age/2.5); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 15 — BURBUJAS ASCENDENTES ----------
  const FRAG_BURBUJAS = HEAD + `
    float h11(float x){ return fract(sin(x*127.1)*43758.5); }
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed;
      vec3 col=mix(vec3(0.02,0.05,0.12), vec3(0.0,0.02,0.05), uv.y*0.5+0.5);
      for(int i=0;i<26;i++){
        float fi=float(i);
        float sp=0.3+h11(fi)*0.6;
        float rad=0.025+h11(fi+9.0)*0.07;
        float x=(h11(fi+3.0)*2.0-1.0)*1.7 + sin(t*sp+fi)*0.08 + m.x*0.15*(rad*6.0);
        float y=mod(h11(fi+5.0)*3.0 + t*sp, 2.6)-1.3;
        vec2 bp=uv-vec2(x,y);
        float d=length(bp);
        float ring=smoothstep(rad,rad*0.7,d)*smoothstep(rad*0.78,rad,d);
        float fill=smoothstep(rad,0.0,d)*0.2;
        float spec=smoothstep(rad*0.5,0.0,length(bp-vec2(-rad*0.3,rad*0.3)))*0.5;
        vec3 c=mix(vec3(0.2,0.8,1.0), vec3(0.3,1.0,0.7), h11(fi+1.0));
        col += c*(ring*0.9+fill) + vec3(1.0)*spec;
      }
      col += vec3(0.2,0.6,1.0)*smoothstep(0.5,0.0,length(uv-m))*0.2;
      float age=u_clickAge;
      if(age<2.0){ float rr=age*1.6; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.5,0.9,1.0)*ring*(1.0-age/2.0); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 16 — TORMENTA ELÉCTRICA ----------
  const FRAG_TORMENTA = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed;
      // filamentos eléctricos hacia el mouse
      vec3 col=vec3(0.015,0.01,0.04);
      for(int i=0;i<4;i++){
        float fi=float(i);
        float n=fbm(vec2(uv.x*3.0+fi*5.0, uv.y*3.0 - t*1.5 + fi));
        float bolt=abs(uv.y - (m.y + (n-0.5)*1.2 + sin(uv.x*4.0+t*3.0+fi)*0.15));
        float line=0.012/(bolt+0.012);
        vec3 c=mix(vec3(0.4,0.6,1.0), vec3(0.7,0.4,1.0), fi/4.0);
        col += c*line*0.5;
      }
      // descarga vertical hacia el cursor
      float dx=abs(uv.x - (m.x + (fbm(vec2(uv.y*4.0,t*2.0))-0.5)*0.5));
      col += vec3(0.6,0.7,1.0)*(0.01/(dx+0.012))*0.4;
      // destello global aleatorio
      float flash=smoothstep(0.93,1.0,fbm(vec2(t*0.7,1.0)));
      col += vec3(0.3,0.35,0.6)*flash*0.5;
      col += vec3(0.5,0.6,1.0)*smoothstep(0.4,0.0,length(uv-m))*0.4;
      float age=u_clickAge;
      if(age<1.6){ float rr=age*2.0; float ring=smoothstep(0.2,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.7,0.8,1.0)*ring*(1.0-age/1.6)*1.6; }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 17 — METAL LÍQUIDO ----------
  const FRAG_METAL = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.2;
      vec2 p=uv*1.2+m*0.3;
      float n=fbm(p + vec2(fbm(p+t), fbm(p-t)));
      // gradiente -> normal para reflejo metálico
      float e=0.02;
      float nx=fbm(p+vec2(e,0.0)) - fbm(p-vec2(e,0.0));
      float ny=fbm(p+vec2(0.0,e)) - fbm(p-vec2(0.0,e));
      vec3 nor=normalize(vec3(-nx,-ny,0.18));
      vec3 ld=normalize(vec3(m*1.2,1.0));
      float diff=clamp(dot(nor,ld),0.0,1.0);
      float spec=pow(clamp(dot(reflect(-ld,nor),vec3(0.0,0.0,1.0)),0.0,1.0),28.0);
      vec3 cool=vec3(0.15,0.45,0.95), warm=vec3(0.55,0.75,1.0);
      vec3 col=mix(vec3(0.02,0.04,0.1), cool, n);
      col=mix(col, warm, diff*0.6);
      col += vec3(1.0)*spec*0.9;
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=warm*ring*(1.0-age/2.5)*1.1; }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 18 — ENJAMBRE (partículas) ----------
  const FRAG_ENJAMBRE = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed;
      vec3 col=vec3(0.01,0.02,0.05);
      for(int i=0;i<40;i++){
        float fi=float(i);
        float r=0.35+0.55*fract(fi*0.137);
        float sp=0.5+fract(fi*0.071)*1.5;
        float ang=fi*2.3999 + t*sp*(0.5+0.5*fract(fi*0.3));
        vec2 base=vec2(cos(ang),sin(ang))*r;
        base += (m-base)*0.35*(0.4+0.6*fract(fi*0.53)); // atracción al mouse
        float d=length(uv-base);
        float dot_=smoothstep(0.02,0.0,d);
        float glow=smoothstep(0.12,0.0,d)*0.25;
        vec3 c=mix(vec3(0.1,0.8,1.0), vec3(0.4,1.0,0.7), fract(fi*0.19));
        col += c*(dot_+glow);
        // líneas al vecino mouse
        float toM=length(uv-mix(base,m,0.5));
        col += c*smoothstep(0.4,0.0,length(base-m))*smoothstep(0.01,0.0,abs(dot(normalize(uv-base),normalize(m-base+1e-4))-1.0)*length(uv-base))*0.0;
      }
      col += vec3(0.2,0.7,1.0)*smoothstep(0.25,0.0,length(uv-m))*0.4;
      float age=u_clickAge;
      if(age<2.0){ float rr=age*1.7; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.5,1.0,0.9)*ring*(1.0-age/2.0); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ============ 5 ESTILOS VERDES — SENA (verde institucional #39A900) ============

  // ---------- OPCIÓN 19 — SENA · GRADIENTE MALLA ----------
  const FRAG_SENA_MALLA = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.4;
      // puntos de control animados que tiñen un degradado de malla
      vec2 c1=vec2(sin(t)*0.6, cos(t*0.8)*0.4)+m*0.4;
      vec2 c2=vec2(cos(t*0.7)*0.7, sin(t*1.1)*0.5)-m*0.3;
      vec2 c3=vec2(sin(t*1.3+2.0)*0.5, cos(t*0.6+1.0)*0.6);
      float w1=1.0/(0.15+dot(uv-c1,uv-c1));
      float w2=1.0/(0.15+dot(uv-c2,uv-c2));
      float w3=1.0/(0.15+dot(uv-c3,uv-c3));
      float ws=w1+w2+w3;
      vec3 sena=vec3(0.224,0.663,0.0);     // #39A900
      vec3 lime=vec3(0.62,0.92,0.2);
      vec3 deep=vec3(0.0,0.18,0.06);
      vec3 col=(sena*w1+lime*w2+deep*w3)/ws;
      col += lime*smoothstep(0.5,0.0,length(uv-m))*0.25;
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.2,0.0,abs(length(uv-u_clickPos)-rr));
        col+=lime*ring*(1.0-age/2.5); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 20 — SENA · CONTORNOS TOPO ----------
  const FRAG_SENA_TOPO = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.18;
      vec2 p=uv*1.5+m*0.5;
      float h=fbm(p+vec2(t,fbm(p-t*0.6)));
      // líneas de contorno (curvas de nivel)
      float lines=abs(fract(h*9.0)-0.5);
      float topo=smoothstep(0.06,0.0,lines);
      vec3 bg=mix(vec3(0.0,0.10,0.04), vec3(0.0,0.24,0.10), h);
      vec3 sena=vec3(0.30,0.85,0.18);
      vec3 col=bg + sena*topo*0.9;
      // realce de las curvas cercanas al mouse
      col += sena*topo*smoothstep(0.7,0.0,length(uv-m))*0.8;
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.4; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.7,1.0,0.4)*ring*(1.0-age/2.5)*(topo+0.3); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 21 — SENA · HOJAS / CRECIMIENTO ----------
  const FRAG_SENA_HOJAS = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed;
      vec2 c=uv-m*0.3;
      float r=length(c);
      float a=atan(c.y,c.x);
      // patrón filotáctico (girasol) en verde
      float petals=cos(a*8.0 + r*6.0 - t*1.2);
      float veins=sin(a*16.0 + sin(r*5.0 - t));
      float pat=petals*0.6+veins*0.4;
      vec3 deep=vec3(0.0,0.12,0.03), sena=vec3(0.22,0.66,0.0), lime=vec3(0.65,0.95,0.25);
      vec3 col=mix(deep,sena,smoothstep(-0.3,0.4,pat));
      col=mix(col,lime,smoothstep(0.5,0.95,pat));
      col*=smoothstep(2.2,0.1,r)*0.7+0.25;
      col += lime*smoothstep(0.14,0.0,r)*0.8;
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.16,0.0,abs(r-rr));
        col+=lime*ring*(1.0-age/2.5)*1.1; }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 22 — SENA · DATOS / BARRAS DE CRECIMIENTO ----------
  const FRAG_SENA_DATOS = HEAD + `
    float h1(float x){ return fract(sin(x*78.233)*43758.5); }
    void main(){
      vec2 uv=(gl_FragCoord.xy)/u_res.y;
      vec2 mr=u_mouse*u_parallax;
      float t=u_time*u_speed;
      float aspect=u_res.x/u_res.y;
      vec3 col=vec3(0.0,0.06,0.03);
      // columnas tipo ecualizador que suben (crecimiento/aprendizaje)
      float cols=26.0;
      float cx=floor(uv.x*cols/aspect);
      float seed=h1(cx);
      float barH=0.18+0.6*(0.5+0.5*sin(t*(0.6+seed)+cx*0.5+mr.x*3.0));
      barH *= 0.7+0.5*seed;
      float xin=fract(uv.x*cols/aspect);
      float bar=step(0.12,xin)*step(xin,0.88)*step(uv.y,barH);
      float grad=uv.y/barH;
      vec3 sena=mix(vec3(0.10,0.35,0.0), vec3(0.45,0.95,0.25), grad);
      col += sena*bar;
      // línea de brillo en la punta
      col += vec3(0.7,1.0,0.4)*step(0.12,xin)*step(xin,0.88)*smoothstep(0.03,0.0,abs(uv.y-barH))* (0.6+0.4*sin(t*4.0+cx));
      // realce por cercanía horizontal del mouse
      float mc=floor((mr.x*0.5+0.5)*cols);
      col += sena*bar*smoothstep(2.5,0.0,abs(cx-mc))*0.4;
      float age=u_clickAge;
      vec2 uvc=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      if(age<2.0){ float rr=age*1.6; float ring=smoothstep(0.16,0.0,abs(length(uvc-u_clickPos)-rr));
        col+=vec3(0.6,1.0,0.4)*ring*(1.0-age/2.0); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 23 — SENA · ANILLOS CONCÉNTRICOS ----------
  const FRAG_SENA_ANILLOS = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed;
      vec2 c=uv-m*0.5;
      float r=length(c);
      // ondas concéntricas que emanan (como el logo SENA en movimiento)
      float wave=sin(r*16.0 - t*3.0);
      float ring=smoothstep(0.55,1.0,wave);
      vec3 deep=vec3(0.0,0.10,0.04);
      vec3 sena=vec3(0.224,0.663,0.0);
      vec3 lime=vec3(0.6,0.95,0.25);
      vec3 col=deep + mix(sena,lime,0.5+0.5*sin(r*4.0-t))*ring;
      // halo central
      col += sena*smoothstep(0.8,0.0,r)*0.4;
      col += lime*smoothstep(0.1,0.0,r);
      col*=smoothstep(2.3,0.2,r)*0.7+0.2;
      float age=u_clickAge;
      if(age<2.5){ float rr=age*1.6; float rg=smoothstep(0.14,0.0,abs(r-rr));
        col+=lime*rg*(1.0-age/2.5)*1.2; }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ============ 5 ESTILOS VARIADOS ============

  // ---------- OPCIÓN 24 — VITRAL / MOSAICO ----------
  const FRAG_VITRAL = HEAD + HASH2 + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.3;
      vec2 p=(uv+m*0.2)*4.0;
      vec2 g=floor(p), f=fract(p);
      float d1=8.0; vec2 cell;
      for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
        vec2 o=vec2(float(i),float(j));
        vec2 rr=hash2(g+o);
        vec2 pos=o+0.5+0.4*sin(t+6.2831*rr);
        float d=length(f-pos);
        if(d<d1){ d1=d; cell=g+o; }
      }
      vec2 hh=hash2(cell);
      float hue=fract(hh.x+t*0.05);
      vec3 col=0.5+0.5*cos(6.2831*(hue+vec3(0.0,0.33,0.67)));
      col*=0.4+0.6*hh.y;
      float border=smoothstep(0.0,0.04,d1);
      col*=border; // líneas de plomo oscuras entre teselas
      col += smoothstep(0.5,0.0,length(uv-m))*col*0.5;
      float age=u_clickAge;
      if(age<2.0){ float rr=age*1.6; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(1.0)*ring*(1.0-age/2.0)*border; }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 25 — INTERFERENCIA / MOIRÉ ----------
  const FRAG_MOIRE = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed;
      float r1=length(uv-vec2(0.4,0.0)-m*0.5);
      float r2=length(uv+vec2(0.4,0.0)+m*0.5);
      float w1=sin(r1*44.0 - t*2.0);
      float w2=sin(r2*44.0 - t*2.0);
      float moire=w1*w2;
      vec3 a=vec3(0.1,0.6,1.0), b=vec3(0.9,0.2,0.7);
      vec3 col=mix(vec3(0.02,0.02,0.06), a, smoothstep(0.0,1.0,moire));
      col=mix(col,b,smoothstep(0.6,1.0,moire));
      col += vec3(0.3,0.8,1.0)*pow(0.5+0.5*moire,4.0)*0.4;
      float age=u_clickAge;
      if(age<2.0){ float rr=age*1.8; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(1.0,0.8,0.9)*ring*(1.0-age/2.0); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 26 — LAVA LAMP ----------
  const FRAG_LAVA = HEAD + `
    float h1l(float x){ return fract(sin(x*91.17)*43758.5); }
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.5;
      float field=0.0;
      for(int i=0;i<8;i++){
        float fi=float(i);
        float sp=0.3+h1l(fi)*0.5;
        float x=(h1l(fi+2.0)*2.0-1.0)*0.9 + sin(t*sp+fi)*0.15;
        float y=mod(h1l(fi+7.0)*2.6 + t*sp*0.6, 2.6)-1.3;
        float rad=0.18+h1l(fi+4.0)*0.16;
        field += rad*rad/(dot(uv-vec2(x,y),uv-vec2(x,y))+0.001);
      }
      field += 0.05/(dot(uv-m,uv-m)+0.02);
      vec3 hot=vec3(1.0,0.35,0.7), cool=vec3(0.5,0.0,0.8), bg=vec3(0.06,0.0,0.12);
      vec3 col=mix(bg, cool, smoothstep(0.6,1.1,field));
      col=mix(col, hot, smoothstep(1.1,1.7,field));
      col += hot*smoothstep(1.0,1.2,field)*0.4;
      float age=u_clickAge;
      if(age<2.0){ float rr=age*1.6; float ring=smoothstep(0.18,0.0,abs(length(uv-u_clickPos)-rr));
        col+=hot*ring*(1.0-age/2.0); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 27 — CAMPO DE ESTRELLAS (warp) ----------
  const FRAG_STARFIELD = HEAD + `
    float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      vec2 dir=uv - m*0.6;                 // centro del warp sigue al mouse
      float t=u_time*u_speed;
      vec3 col=vec3(0.005,0.008,0.02);
      for(int k=0;k<3;k++){
        float layer=float(k);
        float dep=1.0+layer;
        for(int i=0;i<40;i++){
          float fi=float(i)+layer*40.0;
          float ang=h21(vec2(fi,1.0))*6.2831;
          float rad=fract(h21(vec2(fi,2.0)) + t*(0.12/dep));
          vec2 sp=vec2(cos(ang),sin(ang))*rad*2.0 + m*0.6;
          float d=length(uv-sp);
          float br=smoothstep(0.012/dep,0.0,d)*rad;
          col += vec3(0.7,0.85,1.0)*br/dep;
          // streak hacia afuera
          col += vec3(0.4,0.6,1.0)*smoothstep(0.05/dep,0.0, length((uv-sp)-normalize(sp-m*0.6+1e-4)*0.0))*0.0;
        }
      }
      float age=u_clickAge;
      if(age<2.0){ float rr=age*2.0; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.7,0.85,1.0)*ring*(1.0-age/2.0); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ---------- OPCIÓN 28 — REJILLA WARP / GRAVEDAD ----------
  const FRAG_WARP = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y;
      vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed;
      // distorsión gravitatoria de la rejilla hacia el mouse
      vec2 d=uv-m;
      float g=0.25/(dot(d,d)+0.04);
      vec2 p=uv - normalize(d+1e-4)*g*0.3;
      p += 0.02*vec2(sin(p.y*4.0+t),cos(p.x*4.0+t));
      float lx=smoothstep(0.06,0.0, abs(fract(p.x*8.0)-0.5));
      float ly=smoothstep(0.06,0.0, abs(fract(p.y*8.0)-0.5));
      float grid=max(lx,ly);
      vec3 cyan=vec3(0.1,0.7,1.0), pink=vec3(0.8,0.2,0.9);
      vec3 col=vec3(0.01,0.02,0.05) + mix(cyan,pink,clamp(g,0.0,1.0))*grid*1.2;
      col += cyan*smoothstep(0.5,0.0,length(d))*0.5;
      float age=u_clickAge;
      if(age<2.0){ float rr=age*1.8; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=pink*ring*(1.0-age/2.0)*(grid+0.3); }
      col*=u_intensity;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  // ============ 20 ESTILOS CLAROS — para interfaz blanca/clara ============

  // 29 — TINTA SOBRE PAPEL
  const FRAG_TINTA = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.2; vec2 p=uv*1.3+m*0.45;
      float n=fbm(p+vec2(fbm(p+t),fbm(p-t)));
      float ink=smoothstep(0.46,0.64,n);
      vec3 paper=vec3(0.955,0.955,0.94), inkc=vec3(0.07,0.09,0.14);
      vec3 col=mix(paper,inkc,ink*0.92);
      col=mix(col,vec3(0.18,0.30,0.5),smoothstep(0.42,0.5,n)*0.10);
      col-=smoothstep(0.35,0.0,length(uv-m))*0.05;
      float age=u_clickAge; if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col-=vec3(0.4,0.45,0.55)*ring*(1.0-age/2.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 30 — MALLA PASTEL
  const FRAG_PMESH = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.3;
      vec2 c1=vec2(sin(t)*0.7,cos(t*0.8)*0.5)+m*0.4;
      vec2 c2=vec2(cos(t*0.7)*0.8,sin(t*1.1)*0.6)-m*0.3;
      vec2 c3=vec2(sin(t*1.3+2.0)*0.6,cos(t*0.6+1.0)*0.7);
      vec2 c4=vec2(cos(t*0.9+1.0)*0.7,sin(t*0.5+2.0)*0.5);
      float w1=1.0/(0.2+dot(uv-c1,uv-c1)), w2=1.0/(0.2+dot(uv-c2,uv-c2));
      float w3=1.0/(0.2+dot(uv-c3,uv-c3)), w4=1.0/(0.2+dot(uv-c4,uv-c4));
      float ws=w1+w2+w3+w4;
      vec3 col=(vec3(1.0,0.82,0.88)*w1+vec3(0.82,0.95,0.88)*w2+vec3(0.83,0.86,1.0)*w3+vec3(1.0,0.92,0.80)*w4)/ws;
      col=mix(col,vec3(1.0),0.18);
      col+=smoothstep(0.5,0.0,length(uv-m))*0.08;
      float age=u_clickAge; if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.18,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.1)*ring*(1.0-age/2.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 31 — TOPOGRAFÍA CLARA
  const FRAG_TOPOC = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.15; vec2 p=uv*1.6+m*0.5;
      float h=fbm(p+vec2(t,fbm(p-t*0.5)));
      float lines=abs(fract(h*11.0)-0.5);
      float topo=smoothstep(0.045,0.0,lines);
      vec3 col=vec3(0.95,0.96,0.97)-topo*vec3(0.5,0.55,0.62)*0.7;
      col=mix(col,vec3(0.15,0.45,0.85),topo*smoothstep(0.6,0.0,length(uv-m))*0.55);
      float age=u_clickAge; if(age<2.5){ float rr=age*1.4; float ring=smoothstep(0.14,0.0,abs(length(uv-u_clickPos)-rr));
        col-=vec3(0.3,0.35,0.45)*ring*(1.0-age/2.5)*(topo+0.3); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 32 — LUNARES
  const FRAG_LUNARES = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed; vec2 p=(uv+m*0.2)*5.0;
      vec2 id=floor(p), f=fract(p)-0.5;
      float rnd=fract(sin(dot(id,vec2(12.9,78.2)))*43758.5);
      float rad=0.16+0.12*sin(t*1.4+rnd*6.28);
      float d=length(f);
      float dotm=smoothstep(rad,rad-0.07,d);
      vec3 cc=0.6+0.35*cos(rnd*6.28+vec3(0.0,2.0,4.0)); cc=mix(cc,vec3(1.0),0.4);
      vec3 col=mix(vec3(0.965,0.955,0.975),cc,dotm*0.85);
      col+=cc*dotm*smoothstep(0.55,0.0,length(uv-m))*0.4;
      float age=u_clickAge; if(age<2.2){ float rr=age*1.5; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col-=vec3(0.2)*ring*(1.0-age/2.2)*dotm; }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 33 — PAPEL EMBOSADO
  const FRAG_PAPEL = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.2; vec2 p=uv*2.2+m*0.4; float e=0.015;
      float nx=fbm(p+vec2(e,0.0))-fbm(p-vec2(e,0.0));
      float ny=fbm(p+vec2(0.0,e))-fbm(p-vec2(0.0,e));
      vec3 nor=normalize(vec3(-nx,-ny,0.06));
      vec3 ld=normalize(vec3(m*1.4+vec2(0.3,0.4),1.0));
      float diff=clamp(dot(nor,ld),0.0,1.0);
      vec3 col=vec3(0.94,0.94,0.92)+(diff-0.5)*0.26;
      col=mix(col,vec3(0.96,0.94,0.90),0.3);
      float age=u_clickAge; if(age<2.5){ float rr=age*1.6; float ring=smoothstep(0.14,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.12)*ring*(1.0-age/2.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 34 — ACUARELA
  const FRAG_ACUA = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.12; vec2 p=uv*1.2+m*0.3;
      float n1=fbm(p+vec2(0.0,t)), n2=fbm(p*1.5+vec2(5.0,-t)), n3=fbm(p*0.8-t);
      vec3 col=vec3(0.975,0.975,0.965);
      col=mix(col,vec3(0.62,0.80,0.95),smoothstep(0.45,0.72,n1)*0.6);
      col=mix(col,vec3(0.98,0.74,0.80),smoothstep(0.50,0.76,n2)*0.5);
      col=mix(col,vec3(0.78,0.92,0.70),smoothstep(0.55,0.82,n3)*0.45);
      float edge=smoothstep(0.02,0.0,abs(fract(n1*8.0)-0.5));
      col-=edge*vec3(0.05,0.06,0.08);
      col=mix(col,vec3(0.5,0.7,0.95),smoothstep(0.4,0.0,length(uv-m))*0.2);
      float age=u_clickAge; if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.2,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,vec3(0.55,0.75,0.95),ring*(1.0-age/2.5)*0.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 35 — BLUEPRINT CLARO
  const FRAG_BPC = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      vec2 p=(uv+m*0.2)*8.0;
      float maj=max(smoothstep(0.06,0.0,abs(fract(p.x)-0.5)),smoothstep(0.06,0.0,abs(fract(p.y)-0.5)));
      vec2 p2=p*0.25;
      float mnr=max(smoothstep(0.03,0.0,abs(fract(p2.x)-0.5)),smoothstep(0.03,0.0,abs(fract(p2.y)-0.5)));
      vec3 paper=vec3(0.90,0.93,0.97), ink=vec3(0.22,0.42,0.72);
      vec3 col=mix(paper,ink,maj*0.45+mnr*0.22);
      float md=smoothstep(0.42,0.0,length(uv-m));
      col=mix(col,ink,md*0.18);
      col+=ink*smoothstep(0.04,0.0,abs(length(uv-m)-0.32))*0.5;
      float age=u_clickAge; if(age<2.5){ float rr=age*1.6; float ring=smoothstep(0.05,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,ink,ring*(1.0-age/2.5)); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 36 — SEDA CLARA
  const FRAG_SEDAC = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.18; vec2 p=uv*1.2+m*0.3;
      float n=fbm(p+vec2(fbm(p+t),fbm(p-t))); float e=0.02;
      float nx=fbm(p+vec2(e,0.0))-fbm(p-vec2(e,0.0));
      float ny=fbm(p+vec2(0.0,e))-fbm(p-vec2(0.0,e));
      vec3 nor=normalize(vec3(-nx,-ny,0.16));
      vec3 ld=normalize(vec3(m*1.2+vec2(0.2,0.3),1.0));
      float diff=clamp(dot(nor,ld),0.0,1.0);
      float spec=pow(clamp(dot(reflect(-ld,nor),vec3(0.0,0.0,1.0)),0.0,1.0),24.0);
      vec3 col=mix(vec3(0.96,0.95,0.97),vec3(0.80,0.83,0.95),n);
      col=mix(col,vec3(0.92,0.88,0.96),diff*0.4);
      col+=vec3(1.0)*spec*0.5;
      float age=u_clickAge; if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.15)*ring*(1.0-age/2.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 37 — CAUSTICS DE PISCINA
  const FRAG_CAUS = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.4; vec2 p=uv*3.0+m*0.6;
      float n=fbm(p+vec2(t,fbm(p-t)));
      float c=pow(1.0-abs(sin(n*6.2831+t)),4.0);
      float c2=pow(1.0-abs(sin(fbm(p*1.6-t)*6.2831)),6.0);
      vec3 col=vec3(0.90,0.96,0.98);
      col+=vec3(0.25,0.55,0.65)*c*0.7+vec3(0.4,0.7,0.8)*c2*0.5;
      col=mix(col,vec3(0.55,0.85,0.92),smoothstep(0.5,0.0,length(uv-m))*0.25);
      float age=u_clickAge; if(age<2.2){ float rr=age*1.6; float ring=smoothstep(0.18,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.3,0.6,0.7)*ring*(1.0-age/2.2); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 38 — MÁRMOL BLANCO
  const FRAG_MARMOL = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.08; vec2 p=uv*2.0+m*0.3;
      float n=fbm(p+fbm(p+vec2(t,0.0))*2.0);
      float veins=pow(1.0-abs(sin(n*5.0+p.x*0.5)),9.0);
      float fine=pow(1.0-abs(sin(n*13.0)),16.0)*0.4;
      vec3 col=mix(vec3(0.955,0.955,0.94),vec3(0.52,0.57,0.60),veins*0.75);
      col=mix(col,vec3(0.70,0.62,0.40),fine*0.5);
      col+=vec3(0.06)*smoothstep(0.45,0.0,length(uv-m));
      float age=u_clickAge; if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.14,0.0,abs(length(uv-u_clickPos)-rr));
        col-=vec3(0.2,0.18,0.12)*ring*(1.0-age/2.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 39 — HALFTONE
  const FRAG_HALF = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed; vec2 p=(uv+m*0.1)*15.0;
      vec2 f=fract(p)-0.5;
      float wave=0.5+0.5*sin(length(uv-m)*6.0-t*3.0+uv.x*4.0+uv.y*3.0);
      float rad=wave*0.52;
      float d=length(f);
      float dotm=smoothstep(rad,rad-0.12,d);
      vec3 col=mix(vec3(0.97,0.97,0.98),vec3(0.13,0.24,0.42),dotm*0.85);
      float age=u_clickAge; if(age<2.0){ float rr=age*1.7; float ring=smoothstep(0.18,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,vec3(0.1,0.3,0.6),ring*(1.0-age/2.0)*dotm); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 40 — AURORA PASTEL
  const FRAG_AURP = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.25; vec3 col=vec3(0.95,0.96,0.98);
      for(int i=0;i<5;i++){ float fi=float(i);
        float yoff=-0.5+fi*0.24+m.y*0.16;
        float wave=sin(uv.x*2.0+t*2.0+fi*1.3+m.x*1.6)*0.13+sin(uv.x*4.3-t*1.5+fi)*0.05;
        float band=smoothstep(0.18,0.0,abs(uv.y-(yoff+wave)));
        vec3 c=mix(vec3(0.65,0.85,1.0),vec3(1.0,0.78,0.88),fract(fi*0.3+t*0.15));
        c=mix(c,vec3(0.78,0.95,0.82),0.5+0.5*sin(fi+t)); c=mix(c,vec3(1.0),0.15);
        col=mix(col,c,band*0.45); }
      float age=u_clickAge; if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.2,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,vec3(0.7,0.9,1.0),ring*(1.0-age/2.5)*0.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 41 — OLAS PASTEL
  const FRAG_OLASP = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed; vec3 col=vec3(0.96,0.97,0.985);
      for(int i=0;i<7;i++){ float fi=float(i);
        float amp=0.16+m.y*0.1;
        float y=sin(uv.x*1.6+t*1.2+fi*0.9+m.x*2.0)*amp+sin(uv.x*3.7-t*0.8+fi*1.7)*amp*0.4+(fi-3.0)*0.16;
        float d=abs(uv.y-y);
        float line=smoothstep(0.03,0.0,d);
        vec3 c=mix(vec3(0.55,0.78,1.0),vec3(1.0,0.65,0.82),fract(fi/7.0+t*0.1)); c=mix(c,vec3(1.0),0.1);
        col=mix(col,c,line*0.8); col=mix(col,c,smoothstep(0.14,0.0,d)*0.06); }
      float age=u_clickAge; if(age<2.2){ float rr=age*1.6; float ring=smoothstep(0.18,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,vec3(0.6,0.8,1.0),ring*(1.0-age/2.2)*0.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 42 — CONFETI
  const FRAG_CONF = HEAD + `
    float h1c(float x){ return fract(sin(x*91.7)*43758.5); }
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed; vec3 col=vec3(0.965,0.97,0.98);
      for(int i=0;i<24;i++){ float fi=float(i);
        float sp=0.3+h1c(fi)*0.6;
        float x=(h1c(fi+2.0)*2.0-1.0)*1.7+sin(t*sp+fi)*0.1+m.x*0.12;
        float y=mod(h1c(fi+5.0)*3.0+t*sp,2.6)-1.3;
        float rot=t*sp*2.0+fi; vec2 q=uv-vec2(x,y);
        q=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*q;
        float box=step(max(abs(q.x),abs(q.y*2.0)),0.035);
        vec3 c=0.55+0.4*cos(h1c(fi+1.0)*6.28+vec3(0.0,2.0,4.0)); c=mix(c,vec3(1.0),0.25);
        col=mix(col,c,box); }
      col+=vec3(0.06)*smoothstep(0.3,0.0,length(uv-m));
      float age=u_clickAge; if(age<2.0){ float rr=age*1.7; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,vec3(0.7,0.85,1.0),ring*(1.0-age/2.0)*0.4); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 43 — ORIGAMI / FACETAS
  const FRAG_ORIG = HEAD + HASH2 + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.25; vec2 p=(uv+m*0.2)*3.5;
      vec2 g=floor(p), f=fract(p); float d1=8.0; vec2 cc; vec2 cell;
      for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 o=vec2(float(i),float(j));
        vec2 r=hash2(g+o); vec2 pos=o+0.5+0.4*sin(t+6.2831*r);
        float d=length(f-pos); if(d<d1){ d1=d; cc=pos-f; cell=g+o; } }
      vec2 hh=hash2(cell);
      vec3 base=0.55+0.4*cos(hh.x*6.28+vec3(0.0,2.0,4.0)); base=mix(base,vec3(1.0),0.35);
      float shade=0.5+0.5*dot(normalize(cc+1e-4),normalize(m+vec2(0.3,0.4)));
      vec3 col=base*(0.7+shade*0.5);
      float age=u_clickAge; if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.12)*ring*(1.0-age/2.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 44 — INTERFERENCIA CLARA
  const FRAG_MOIREC = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed;
      float r1=length(uv-vec2(0.4,0.0)-m*0.5), r2=length(uv+vec2(0.4,0.0)+m*0.5);
      float moire=sin(r1*40.0-t*2.0)*sin(r2*40.0-t*2.0);
      vec3 col=mix(vec3(0.97,0.97,0.98),vec3(0.35,0.52,0.82),smoothstep(0.0,1.0,moire)*0.55);
      col=mix(col,vec3(0.85,0.4,0.65),smoothstep(0.6,1.0,moire)*0.4);
      float age=u_clickAge; if(age<2.0){ float rr=age*1.8; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,vec3(0.4,0.5,0.7),ring*(1.0-age/2.0)*0.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 45 — VITRAL CLARO
  const FRAG_VITC = HEAD + HASH2 + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.3; vec2 p=(uv+m*0.2)*3.8;
      vec2 g=floor(p), f=fract(p); float d1=8.0; vec2 cell;
      for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 o=vec2(float(i),float(j));
        vec2 r=hash2(g+o); vec2 pos=o+0.5+0.4*sin(t+6.2831*r);
        float d=length(f-pos); if(d<d1){ d1=d; cell=g+o; } }
      vec2 hh=hash2(cell);
      vec3 cc=0.55+0.4*cos(hh.x*6.28+vec3(0.0,2.0,4.0)); cc=mix(cc,vec3(1.0),0.4); cc*=0.75+0.4*hh.y;
      float border=smoothstep(0.0,0.05,d1);
      vec3 col=mix(vec3(0.85,0.86,0.88),cc,border);
      col+=cc*smoothstep(0.5,0.0,length(uv-m))*0.3;
      float age=u_clickAge; if(age<2.0){ float rr=age*1.6; float ring=smoothstep(0.16,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.15)*ring*(1.0-age/2.0)*border; }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 46 — CRISTAL ESMERILADO
  const FRAG_FROST = HEAD + `
    float h1f(float x){ return fract(sin(x*81.1)*43758.5); }
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.5; float field=0.0;
      for(int i=0;i<7;i++){ float fi=float(i);
        vec2 c=vec2(sin(t*0.6+fi*1.7)*0.85,cos(t*0.5+fi*2.3)*0.55);
        field+=0.10/(length(uv-c)+0.05); }
      field+=0.13/(length(uv-m)+0.05);
      vec3 a=vec3(0.78,0.86,1.0), b=vec3(1.0,0.84,0.92);
      vec3 col=mix(vec3(0.95,0.96,0.98),a,smoothstep(0.8,1.5,field));
      col=mix(col,b,smoothstep(1.4,2.1,field));
      col+=vec3(1.0)*smoothstep(1.7,1.9,field)*0.3;
      float age=u_clickAge; if(age<2.0){ float rr=age*1.6; float ring=smoothstep(0.18,0.0,abs(length(uv-u_clickPos)-rr));
        col+=vec3(0.12)*ring*(1.0-age/2.0); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 47 — ONDAS ZEN
  const FRAG_ZEN = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed; vec2 c=uv-m*0.4; float r=length(c);
      float w=sin(r*20.0-t*1.5);
      float rake=0.5+0.5*sin(uv.x*60.0);
      vec3 sand=vec3(0.93,0.90,0.83), line=vec3(0.74,0.69,0.58);
      vec3 col=mix(sand,line,smoothstep(0.0,0.65,w)*0.6);
      col=mix(col,col*0.96,rake*0.25);
      col+=vec3(0.05)*smoothstep(0.4,0.0,r);
      float age=u_clickAge; if(age<2.5){ float rr=age*1.6; float ring=smoothstep(0.12,0.0,abs(r-rr));
        col-=vec3(0.12,0.11,0.09)*ring*(1.0-age/2.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 48 — GRADIENTE SUAVE
  const FRAG_SUAVE = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.4;
      float g=0.5+0.5*sin(uv.x*1.2+uv.y*0.8+t+m.x*2.0);
      float g2=0.5+0.5*sin(t*0.7+uv.y*1.5-uv.x*0.6+m.y*2.0);
      vec3 a=vec3(0.85,0.90,1.0), b=vec3(1.0,0.88,0.92), c=vec3(0.88,0.97,0.90);
      vec3 col=mix(a,b,g); col=mix(col,c,g2*0.6);
      col=mix(col,vec3(1.0),smoothstep(0.6,0.0,length(uv-m))*0.18);
      float age=u_clickAge; if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.22,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,vec3(0.8,0.88,1.0),ring*(1.0-age/2.5)*0.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // ============ 6 ESTILOS BLANCO + VERDE SENA (interfaz clara institucional) ============

  // 49 — SENA BLANCO · MALLA SUAVE
  const FRAG_SW_MESH = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.3;
      vec2 c1=vec2(sin(t)*0.7,cos(t*0.8)*0.5)+m*0.4;
      vec2 c2=vec2(cos(t*0.7)*0.8,sin(t*1.1)*0.6)-m*0.3;
      vec2 c3=vec2(sin(t*1.3+2.0)*0.6,cos(t*0.6+1.0)*0.7);
      float w1=1.0/(0.22+dot(uv-c1,uv-c1)), w2=1.0/(0.22+dot(uv-c2,uv-c2)), w3=1.0/(0.22+dot(uv-c3,uv-c3));
      float ws=w1+w2+w3;
      vec3 white=vec3(0.965,0.975,0.965), sena=vec3(0.55,0.82,0.35), deep=vec3(0.224,0.663,0.0);
      vec3 col=(white*w1*1.4+sena*w2+deep*w3*0.5)/ws;
      col=mix(col,vec3(0.98,0.99,0.98),0.30);
      col=mix(col,deep,smoothstep(0.55,0.0,length(uv-m))*0.12);
      float age=u_clickAge; if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.2,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,deep,ring*(1.0-age/2.5)*0.4); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 50 — SENA BLANCO · TOPOGRAFÍA VERDE
  const FRAG_SW_TOPO = HEAD + NOISE + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.15; vec2 p=uv*1.6+m*0.5;
      float h=fbm(p+vec2(t,fbm(p-t*0.5)));
      float lines=abs(fract(h*10.0)-0.5);
      float topo=smoothstep(0.05,0.0,lines);
      vec3 col=vec3(0.96,0.975,0.96)-topo*vec3(0.42,0.30,0.50)*0.55;
      col=mix(col,vec3(0.224,0.663,0.0),topo*(0.35+smoothstep(0.7,0.0,length(uv-m))*0.5));
      float age=u_clickAge; if(age<2.5){ float rr=age*1.4; float ring=smoothstep(0.14,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,vec3(0.18,0.55,0.0),ring*(1.0-age/2.5)*(topo+0.3)); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 51 — SENA BLANCO · CRECIMIENTO (hojas)
  const FRAG_SW_LEAF = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed; vec2 c=uv-m*0.3; float r=length(c); float a=atan(c.y,c.x);
      float petals=cos(a*7.0+r*5.0-t*1.0);
      float veins=sin(a*14.0+sin(r*4.0-t));
      float pat=petals*0.6+veins*0.4;
      vec3 white=vec3(0.965,0.975,0.96), sena=vec3(0.36,0.74,0.10), lime=vec3(0.62,0.88,0.30);
      vec3 col=mix(white,sena,smoothstep(0.0,0.6,pat)*0.4);
      col=mix(col,lime,smoothstep(0.55,0.95,pat)*0.35);
      col=mix(col,white,smoothstep(1.4,2.3,r)*0.6);
      float age=u_clickAge; if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.16,0.0,abs(r-rr));
        col=mix(col,sena,ring*(1.0-age/2.5)*0.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 52 — SENA BLANCO · REJILLA TÉCNICA
  const FRAG_SW_GRID = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      vec2 p=(uv+m*0.18)*7.0;
      float maj=max(smoothstep(0.05,0.0,abs(fract(p.x)-0.5)),smoothstep(0.05,0.0,abs(fract(p.y)-0.5)));
      vec2 p2=p*0.25;
      float mnr=max(smoothstep(0.03,0.0,abs(fract(p2.x)-0.5)),smoothstep(0.03,0.0,abs(fract(p2.y)-0.5)));
      vec3 white=vec3(0.955,0.97,0.955), sena=vec3(0.224,0.663,0.0);
      vec3 col=mix(white,sena,maj*0.30+mnr*0.16);
      float md=smoothstep(0.42,0.0,length(uv-m));
      col=mix(col,sena,md*0.16);
      col=mix(col,sena,smoothstep(0.04,0.0,abs(length(uv-m)-0.30))*0.5);
      float age=u_clickAge; if(age<2.5){ float rr=age*1.6; float ring=smoothstep(0.05,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,sena,ring*(1.0-age/2.5)*0.6); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 53 — SENA BLANCO · AURORA VERDE
  const FRAG_SW_AUR = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed*0.25; vec3 col=vec3(0.965,0.978,0.965);
      for(int i=0;i<5;i++){ float fi=float(i);
        float yoff=-0.5+fi*0.24+m.y*0.16;
        float wave=sin(uv.x*2.0+t*2.0+fi*1.3+m.x*1.6)*0.13+sin(uv.x*4.3-t*1.5+fi)*0.05;
        float band=smoothstep(0.18,0.0,abs(uv.y-(yoff+wave)));
        vec3 c=mix(vec3(0.30,0.72,0.10),vec3(0.60,0.88,0.32),fract(fi*0.3+t*0.15));
        col=mix(col,c,band*0.38); }
      float age=u_clickAge; if(age<2.5){ float rr=age*1.5; float ring=smoothstep(0.2,0.0,abs(length(uv-u_clickPos)-rr));
        col=mix(col,vec3(0.30,0.70,0.10),ring*(1.0-age/2.5)*0.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  // 54 — SENA BLANCO · ANILLOS
  const FRAG_SW_RING = HEAD + `
    void main(){
      vec2 uv=(2.0*gl_FragCoord.xy-u_res)/u_res.y; vec2 m=u_mouse*u_parallax;
      float t=u_time*u_speed; vec2 c=uv-m*0.45; float r=length(c);
      float wave=sin(r*15.0-t*2.6);
      float ring=smoothstep(0.55,1.0,wave);
      vec3 white=vec3(0.965,0.978,0.965), sena=vec3(0.224,0.663,0.0), lime=vec3(0.55,0.85,0.25);
      vec3 col=mix(white,mix(sena,lime,0.5+0.5*sin(r*3.5-t)),ring*0.45);
      col=mix(col,sena,smoothstep(0.10,0.0,r)*0.5);
      col=mix(col,white,smoothstep(1.6,2.4,r)*0.5);
      float age=u_clickAge; if(age<2.5){ float rr=age*1.6; float rg=smoothstep(0.12,0.0,abs(r-rr));
        col=mix(col,sena,rg*(1.0-age/2.5)*0.5); }
      col*=u_intensity; gl_FragColor=vec4(col,1.0);
    }`;

  const VERT = `attribute vec2 a; void main(){ gl_Position=vec4(a,0.0,1.0); }`;

  const SHADERS = {
    carretera: FRAG_CARRETERA,
    synthwave: FRAG_SYNTH,
    esmeralda: FRAG_ESMER,
    tunel: FRAG_TUNEL,
    circuito: FRAG_CIRCUITO,
    aurora: FRAG_AURORA,
    plasma: FRAG_PLASMA,
    hex: FRAG_HEX,
    lluvia: FRAG_LLUVIA,
    nebulosa: FRAG_NEBULOSA,
    caleido: FRAG_CALEIDO,
    radar: FRAG_RADAR,
    olas: FRAG_OLAS,
    fractal: FRAG_FRACTAL,
    burbujas: FRAG_BURBUJAS,
    tormenta: FRAG_TORMENTA,
    metal: FRAG_METAL,
    enjambre: FRAG_ENJAMBRE,
    senaMalla: FRAG_SENA_MALLA,
    senaTopo: FRAG_SENA_TOPO,
    senaHojas: FRAG_SENA_HOJAS,
    senaDatos: FRAG_SENA_DATOS,
    senaAnillos: FRAG_SENA_ANILLOS,
    vitral: FRAG_VITRAL,
    moire: FRAG_MOIRE,
    lava: FRAG_LAVA,
    starfield: FRAG_STARFIELD,
    warp: FRAG_WARP,
    tinta: FRAG_TINTA,
    pmesh: FRAG_PMESH,
    topoc: FRAG_TOPOC,
    lunares: FRAG_LUNARES,
    papel: FRAG_PAPEL,
    acuarela: FRAG_ACUA,
    blueprintc: FRAG_BPC,
    sedac: FRAG_SEDAC,
    caustics: FRAG_CAUS,
    marmol: FRAG_MARMOL,
    halftone: FRAG_HALF,
    aurorap: FRAG_AURP,
    olasp: FRAG_OLASP,
    confeti: FRAG_CONF,
    origami: FRAG_ORIG,
    moirec: FRAG_MOIREC,
    vitralc: FRAG_VITC,
    frost: FRAG_FROST,
    zen: FRAG_ZEN,
    suave: FRAG_SUAVE,
    swMesh: FRAG_SW_MESH,
    swTopo: FRAG_SW_TOPO,
    swLeaf: FRAG_SW_LEAF,
    swGrid: FRAG_SW_GRID,
    swAur: FRAG_SW_AUR,
    swRing: FRAG_SW_RING,
  };

  // ---------------- WebGL setup ----------------
  const canvas = document.getElementById("bg");
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) {
    document.body.classList.add("no-webgl");
    return;
  }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Shader error:", gl.getShaderInfoLog(s), src);
    }
    return s;
  }
  function makeProgram(frag) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error("Link error:", gl.getProgramInfoLog(p));
    }
    const loc = gl.getAttribLocation(p, "a");
    const u = {};
    ["u_res", "u_time", "u_mouse", "u_clickPos", "u_clickAge", "u_speed", "u_intensity", "u_parallax"].forEach(
      (n) => (u[n] = gl.getUniformLocation(p, n))
    );
    return { p, loc, u };
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const programs = {};
  Object.keys(SHADERS).forEach((k) => (programs[k] = makeProgram(SHADERS[k])));

  // ---------------- Estado ----------------
  const LS = {
    opt: localStorage.getItem("rg_opt") || "carretera",
    speed: parseFloat(localStorage.getItem("rg_speed")) || 1,
    intensity: parseFloat(localStorage.getItem("rg_intensity")) || 1,
    parallax: parseFloat(localStorage.getItem("rg_parallax")) || 1,
  };
  if (!SHADERS[LS.opt]) LS.opt = "carretera";

  const state = {
    current: LS.opt,
    speed: LS.speed,
    intensity: LS.intensity,
    parallax: LS.parallax,
    mouse: [0, 0],
    mTarget: [0, 0],
    clickPos: [0, 0],
    clickAt: -1e6,
  };

  // ---------------- Resize ----------------
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const w = Math.floor(innerWidth * dpr);
    const h = Math.floor(innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------------- Interacción ----------------
  window.addEventListener("pointermove", (e) => {
    state.mTarget[0] = (e.clientX / innerWidth) * 2 - 1;
    state.mTarget[1] = (1 - e.clientY / innerHeight) * 2 - 1;
  });
  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest && e.target.closest("#hud")) return; // no ripple sobre el panel
    state.clickAt = performance.now();
    state.clickPos[0] = (2 * e.clientX - innerWidth) / innerHeight;
    state.clickPos[1] = (innerHeight - 2 * e.clientY) / innerHeight;
  });

  // ---------------- Render loop ----------------
  const start = performance.now();
  let frameCount = 0;
  let lastErr = 0;
  function render(now) {
    resize();
    const t = (now - start) / 1000;
    state.mouse[0] += (state.mTarget[0] - state.mouse[0]) * 0.06;
    state.mouse[1] += (state.mTarget[1] - state.mouse[1]) * 0.06;

    const prog = programs[state.current];
    gl.useProgram(prog.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(prog.loc);
    gl.vertexAttribPointer(prog.loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(prog.u.u_res, canvas.width, canvas.height);
    gl.uniform1f(prog.u.u_time, t);
    gl.uniform2f(prog.u.u_mouse, state.mouse[0], state.mouse[1]);
    gl.uniform2f(prog.u.u_clickPos, state.clickPos[0], state.clickPos[1]);
    gl.uniform1f(prog.u.u_clickAge, (now - state.clickAt) / 1000);
    gl.uniform1f(prog.u.u_speed, state.speed);
    gl.uniform1f(prog.u.u_intensity, state.intensity);
    gl.uniform1f(prog.u.u_parallax, state.parallax);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    lastErr = gl.getError();
    frameCount++;
  }
  function frame(now) {
    render(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------------- Exponer para el panel ----------------
  window.RGShader = {
    setOption(opt) {
      if (!SHADERS[opt]) return;
      state.current = opt;
      localStorage.setItem("rg_opt", opt);
    },
    set(key, val) {
      state[key] = val;
      localStorage.setItem("rg_" + key, String(val));
    },
    get state() {
      return state;
    },
    renderOnce() {
      render(performance.now());
      return this.sample();
    },
    sample() {
      const px = new Uint8Array(4);
      const x = (canvas.width / 2) | 0,
        y = (canvas.height / 2) | 0;
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const tl = new Uint8Array(4);
      gl.readPixels(8, canvas.height - 8, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, tl);
      return { opt: state.current, center: [px[0], px[1], px[2]], corner: [tl[0], tl[1], tl[2]], frames: frameCount, err: lastErr, w: canvas.width, h: canvas.height };
    },
  };
})();
