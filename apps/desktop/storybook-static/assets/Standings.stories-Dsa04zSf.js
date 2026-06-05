import{j as t}from"./jsx-runtime-D_zvdyIk.js";import{r as m}from"./index-Y0gaZlcC.js";import"./SettingsForm-Cwbdzq1s.js";import{G as _,P as B,T as N}from"./PositionBadge-Co8LWPpM.js";import{S as x}from"./mock-telemetry-seeder-B3OY2noP.js";import"./react-IGx8eIPn.js";function S(a){return`+${a.toFixed(1)}s`}const M=25;function A({telemetry:a,maxRows:L=20}){if(!a||a.vehicles.length===0)return t.jsx("div",{"data-testid":"standings-empty",className:"flex items-center justify-center h-full text-white/60 text-sm",children:a?"No vehicles in session":"No telemetry data"});const g=m.useRef(null),l=m.useRef(null),y=m.useRef(null),f=[...a.vehicles].sort((e,r)=>e.position-r.position);let s=-1;const n=f.map((e,r)=>({...e,gapToAhead:e.position===1?null:e.gap,cumulativeGap:0,intervalFromPlayer:0}));let j=0;if(n.forEach((e,r)=>{j+=r===0?0:e.gap??0,e.cumulativeGap=j,e.isPlayer&&(s=r)}),s>=0){const e=n[s].cumulativeGap;n.forEach(r=>{r.intervalFromPlayer=e-r.cumulativeGap})}const o=s>=0?n[s].position:null;m.useEffect(()=>{if(!o||!l.current)return;const e=y.current;if(y.current=o,e===null&&o>20){l.current.scrollIntoView({behavior:"smooth",block:"center"});return}if(e!==null&&e!==o&&g.current){const r=g.current,i=l.current,d=r.getBoundingClientRect(),c=i.getBoundingClientRect();c.top>=d.top&&c.bottom<=d.bottom||i.scrollIntoView({behavior:"smooth",block:"center"})}},[o]);const b=[...new Set(f.map(e=>e.color))].filter(Boolean),I=n.slice(0,L);return t.jsx("div",{ref:g,className:"standings-container",children:t.jsxs(_,{className:"standings-overlay","data-testid":"standings-table",children:[t.jsx("style",{children:`
        .standings-table tr:last-child td {
          border-bottom: none;
        }
        .standings-row-player {
          background: rgba(139, 0, 0, 0.2);
          border-left: 3px solid #DC143C;
          position: relative;
        }
        .standings-row-player td:first-child {
          padding-left: calc(0.5rem - 3px);
        }
        .standings-row-even {
          background: rgba(255, 255, 255, 0.02);
        }
        .standings-row-class-gt3 {
          background: rgba(225, 6, 0, 0.06);
        }
        .standings-row-class-gte {
          background: rgba(0, 210, 190, 0.06);
        }
        .text-leader {
          color: #fbbf24;
          font-weight: 600;
        }
        .text-interval-ahead {
          color: rgba(34, 197, 94, 0.9);
        }
        .text-interval-behind {
          color: rgba(239, 68, 68, 0.9);
        }
        .text-interval-zero {
          color: rgba(255, 255, 255, 0.4);
        }
        .driver-name {
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: inline-block;
          vertical-align: middle;
        }
      `}),t.jsxs("table",{className:"standings-table",children:[t.jsx("thead",{children:t.jsxs("tr",{children:[t.jsx("th",{style:{width:36},children:"Pos"}),t.jsx("th",{children:"Driver"}),t.jsx("th",{style:{width:32},children:"Car"}),b.length>1&&t.jsx("th",{style:{width:48},children:"Class"}),t.jsx("th",{style:{width:56},children:"Gap"}),t.jsx("th",{style:{width:70},children:"Last Lap"}),t.jsx("th",{style:{width:70},children:"Best Lap"}),t.jsx("th",{style:{width:60},children:"Interval"})]})}),t.jsx("tbody",{children:I.map((e,r)=>{const i=r%2===0,d=e.isPlayer?"standings-row-player":i?"standings-row-even":"",c=(()=>{if(e.isPlayer)return t.jsx("span",{className:"text-interval-zero",children:"—"});const v=Math.abs(e.intervalFromPlayer);if(v<.1)return t.jsx("span",{className:"text-interval-zero",children:"—"});e.intervalFromPlayer>0;const V=e.intervalFromPlayer>0?"text-interval-ahead":"text-interval-behind";return t.jsx("span",{className:V,children:S(v)})})(),w=e.driverName.length>M;return t.jsxs("tr",{"data-testid":e.isPlayer?"player-highlight":void 0,className:d,ref:e.isPlayer?l:void 0,children:[t.jsx("td",{children:t.jsx(B,{position:e.position})}),t.jsx("td",{children:t.jsx("span",{className:"driver-name",title:w?e.driverName:void 0,children:e.driverName})}),t.jsx("td",{style:{color:"rgba(255,255,255,0.7)"},children:e.carNumber}),b.length>1&&t.jsx("td",{children:t.jsxs("span",{className:"class-chip",style:{background:`${e.color}22`,color:e.color},children:[t.jsx("span",{className:"class-dot",style:{backgroundColor:e.color}}),e.color]})}),t.jsx("td",{children:e.gapToAhead===null?t.jsx("span",{className:"text-leader",children:"LEADER"}):S(e.gapToAhead)}),t.jsx("td",{children:t.jsx(N,{timeMs:e.lastLaptime})}),t.jsx("td",{children:t.jsx(N,{timeMs:e.bestLaptime})}),t.jsx("td",{children:c})]},e.id)})})]})]})})}A.__docgenInfo={description:"",methods:[],displayName:"Standings",props:{telemetry:{required:!0,tsType:{name:"union",raw:"Telemetry | null",elements:[{name:"Telemetry"},{name:"null"}]},description:""},maxRows:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"20",computed:!1}}}};const J={title:"Overlays/Standings",component:A,decorators:[a=>t.jsx("div",{style:{padding:24,minHeight:"100vh",background:"linear-gradient(135deg, #0a0a0f 0%, #1a0a14 50%, #0a0a0f 100%)"},children:t.jsx("div",{style:{maxWidth:720,margin:"0 auto"},children:t.jsx(a,{})})})],parameters:{layout:"fullscreen"}},p={name:"default",args:{telemetry:x.midRaceState()}},u={args:{telemetry:x.emptyState()}},h={args:{telemetry:x.playerAtFront()}};var R,P,E;p.parameters={...p.parameters,docs:{...(R=p.parameters)==null?void 0:R.docs,source:{originalSource:`{
  name: 'default',
  args: {
    telemetry: SeedData.midRaceState()
  }
}`,...(E=(P=p.parameters)==null?void 0:P.docs)==null?void 0:E.source}}};var G,k,C;u.parameters={...u.parameters,docs:{...(G=u.parameters)==null?void 0:G.docs,source:{originalSource:`{
  args: {
    telemetry: SeedData.emptyState()
  }
}`,...(C=(k=u.parameters)==null?void 0:k.docs)==null?void 0:C.source}}};var D,F,T;h.parameters={...h.parameters,docs:{...(D=h.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    telemetry: SeedData.playerAtFront()
  }
}`,...(T=(F=h.parameters)==null?void 0:F.docs)==null?void 0:T.source}}};const K=["defaultStory","empty","playerAtFront"];export{K as __namedExportsOrder,J as default,p as defaultStory,u as empty,h as playerAtFront};
