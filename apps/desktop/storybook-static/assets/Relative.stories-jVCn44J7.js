import{j as e}from"./jsx-runtime-D_zvdyIk.js";import"./SettingsForm-Cwbdzq1s.js";import{G as _,P as M}from"./PositionBadge-Co8LWPpM.js";import"./index-Y0gaZlcC.js";import{S as u}from"./mock-telemetry-seeder-B3OY2noP.js";import"./react-IGx8eIPn.js";const D=3,A=3,y=D+1+A,C=25;function E(a){return Math.abs(a)<.05?"—":`${a>0?"+":"−"}${Math.abs(a).toFixed(1)}s`}function G(a){const s=[...a].sort((t,n)=>t.position-n.position),o=s.findIndex(t=>t.isPlayer);if(o<0)return[];const r=s[o],i=Math.max(0,Math.min(o-D,s.length-y)),l=i+y;return s.slice(i,Math.min(l,s.length)).map(t=>{let n=0;t.isPlayer||(n=t.position<r.position?-t.gap:t.gap);const m=t.isPitting&&t.bestLaptime===0;return{vehicle:t,gapToPlayer:n,isPlayer:t.isPlayer,isDnf:m}})}function k({telemetry:a}){if(!a||a.vehicles.length===0)return e.jsx("div",{"data-testid":"relative-empty",className:"flex items-center justify-center h-full text-white/60 text-sm",children:a?"No vehicles in session":"No telemetry data"});const s=G(a.vehicles);return s.length===0?e.jsx("div",{"data-testid":"relative-empty",className:"flex items-center justify-center h-full text-white/60 text-sm",children:"Player not found in session"}):e.jsxs(_,{className:"relative-overlay","data-testid":"relative-table",children:[e.jsx("style",{children:`
        .relative-row {
          transition: all 0.3s ease;
        }
        .relative-row-ahead {
          background: rgba(239, 68, 68, 0.10);
        }
        .relative-row-ahead-distant {
          background: rgba(239, 68, 68, 0.04);
        }
        .relative-row-behind {
          background: rgba(34, 197, 94, 0.10);
        }
        .relative-row-behind-distant {
          background: rgba(34, 197, 94, 0.04);
        }
        .relative-row-player {
          background: rgba(139, 0, 0, 0.2);
          border-left: 3px solid #DC143C;
        }
        .relative-row-player td:first-child {
          padding-left: calc(0.5rem - 3px);
        }
        .relative-row-dnf {
          opacity: 0.55;
          font-style: italic;
        }
        .relative-row-dnf td {
          text-decoration: line-through;
          text-decoration-color: rgba(255, 255, 255, 0.35);
        }
        .dnf-tag {
          display: inline-block;
          padding: 0 0.3rem;
          margin-left: 0.35rem;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.5625rem;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        .gap-cell-ahead {
          color: rgba(239, 68, 68, 0.9);
        }
        .gap-cell-behind {
          color: rgba(34, 197, 94, 0.9);
        }
        .gap-cell-zero {
          color: rgba(255, 255, 255, 0.4);
        }
      `}),e.jsxs("table",{className:"relative-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{width:36},children:"Pos"}),e.jsx("th",{children:"Driver"}),e.jsx("th",{style:{width:32},children:"Car"}),e.jsx("th",{style:{width:48},children:"Class"}),e.jsx("th",{style:{width:70},children:"Gap"})]})}),e.jsx("tbody",{children:s.map(o=>{const{vehicle:r,gapToPlayer:i,isPlayer:l,isDnf:c}=o,t=!l&&i<0,n=!l&&i>0,m=!l&&Math.abs(i)>5;let d="relative-row transition-all duration-300";l?d+=" relative-row-player bg-blood":t?d+=m?" relative-row-ahead-distant":" relative-row-ahead":n&&(d+=m?" relative-row-behind-distant":" relative-row-behind"),c&&(d+=" relative-row-dnf");const R=l||Math.abs(i)<.05?"gap-cell-zero":t?"gap-cell-ahead":"gap-cell-behind",T=c?"OUT":E(i),O=r.driverName.length>C;return e.jsxs("tr",{"data-testid":l?"player-highlight":void 0,className:d,children:[e.jsx("td",{children:e.jsx(M,{position:r.position})}),e.jsx("td",{children:e.jsxs("span",{className:"driver-name-cell",title:O?r.driverName:void 0,children:[r.driverName,c&&e.jsx("span",{className:"dnf-tag",children:"OUT"})]})}),e.jsx("td",{style:{color:"rgba(255,255,255,0.7)"},children:r.carNumber}),e.jsx("td",{children:e.jsxs("span",{className:"class-chip",style:{background:`${r.color}22`,color:r.color},children:[e.jsx("span",{className:"class-dot",style:{backgroundColor:r.color}}),r.color]})}),e.jsx("td",{className:R,children:T})]},r.id)})})]})]})}k.__docgenInfo={description:"",methods:[],displayName:"Relative",props:{telemetry:{required:!0,tsType:{name:"union",raw:"Telemetry | null",elements:[{name:"Telemetry"},{name:"null"}]},description:""}}};const F={title:"Overlays/Relative",component:k,decorators:[a=>e.jsx("div",{style:{padding:24,minHeight:"100vh",background:"linear-gradient(135deg, #0a0a0f 0%, #1a0a14 50%, #0a0a0f 100%)"},children:e.jsx("div",{style:{maxWidth:520,margin:"0 auto"},children:e.jsx(a,{})})})],parameters:{layout:"fullscreen"}},h={name:"default",args:{telemetry:u.midRaceState()}},p={args:{telemetry:u.emptyState()}},g={args:{telemetry:u.playerAtFront()}};var x,f,b;h.parameters={...h.parameters,docs:{...(x=h.parameters)==null?void 0:x.docs,source:{originalSource:`{
  name: 'default',
  args: {
    telemetry: SeedData.midRaceState()
  }
}`,...(b=(f=h.parameters)==null?void 0:f.docs)==null?void 0:b.source}}};var v,j,w;p.parameters={...p.parameters,docs:{...(v=p.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    telemetry: SeedData.emptyState()
  }
}`,...(w=(j=p.parameters)==null?void 0:j.docs)==null?void 0:w.source}}};var N,S,P;g.parameters={...g.parameters,docs:{...(N=g.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    telemetry: SeedData.playerAtFront()
  }
}`,...(P=(S=g.parameters)==null?void 0:S.docs)==null?void 0:P.source}}};const $=["defaultStory","empty","leading"];export{$ as __namedExportsOrder,F as default,h as defaultStory,p as empty,g as leading};
