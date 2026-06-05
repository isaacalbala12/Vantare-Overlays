import{j as e}from"./jsx-runtime-D_zvdyIk.js";import"./SettingsForm-Cwbdzq1s.js";import{G as B}from"./PositionBadge-Co8LWPpM.js";import"./index-Y0gaZlcC.js";import{d}from"./mock-telemetry-seeder-B3OY2noP.js";import"./react-IGx8eIPn.js";function $(a,r){return a-r}const k=5,w="—";function n(){return e.jsx("div",{"data-testid":"delta-bar","data-direction":"neutral",className:"delta-bar",children:e.jsxs(B,{className:"delta-overlay",children:[e.jsx("div",{className:"delta-track",children:e.jsx("div",{className:"delta-center-line"})}),e.jsx("span",{className:"delta-value delta-value--neutral","data-testid":"delta-value",children:w})]})})}function D({telemetry:a}){if(!a||!a.lap)return e.jsx(n,{});const{lastLaptime:r,bestLaptime:p}=a.lap;if(r===0||p===0)return e.jsx(n,{});const t=$(r,p);if(!Number.isFinite(t))return e.jsx(n,{});const s=t>0?"positive":t<0?"negative":"neutral";if(s==="neutral")return e.jsx(n,{});const E=`${t>0?"+":""}${(t/1e3).toFixed(3)}s`,R={width:`${Math.min(Math.abs(t)/k,1)*100}%`,...s==="positive"?{left:"50%"}:{right:"50%"}};return e.jsx("div",{"data-testid":"delta-bar","data-direction":s,className:"delta-bar",children:e.jsxs(B,{className:"delta-overlay",children:[e.jsxs("div",{className:"delta-track",children:[e.jsx("div",{className:`delta-fill delta-fill--${s}`,style:R,"data-testid":"delta-fill"}),e.jsx("div",{className:"delta-center-line"})]}),e.jsx("span",{className:`delta-value delta-value--${s}`,"data-testid":"delta-value",children:E})]})})}D.__docgenInfo={description:"",methods:[],displayName:"DeltaBar",props:{telemetry:{required:!0,tsType:{name:"union",raw:"Telemetry | null",elements:[{name:"Telemetry"},{name:"null"}]},description:""}}};const H={title:"Overlays/DeltaBar",component:D,parameters:{layout:"centered",backgrounds:{default:"dark"}}},l={args:{telemetry:d({playerPosition:5,lap:{lastLaptime:81500,bestLaptime:82e3}})}},i={args:{telemetry:d({playerPosition:5,lap:{lastLaptime:82500,bestLaptime:82e3}})}},o={args:{telemetry:d({playerPosition:5,lap:{lastLaptime:82500,bestLaptime:0}})}},c={args:{telemetry:d({playerPosition:5,lap:{lastLaptime:0,bestLaptime:82e3}})}},m={args:{telemetry:null}};var u,y,S;l.parameters={...l.parameters,docs:{...(u=l.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    telemetry: deterministicRaceState({
      playerPosition: 5,
      lap: {
        lastLaptime: 81_500,
        bestLaptime: 82_000
      }
    })
  }
}`,...(S=(y=l.parameters)==null?void 0:y.docs)==null?void 0:S.source}}};var g,x,f;i.parameters={...i.parameters,docs:{...(g=i.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    telemetry: deterministicRaceState({
      playerPosition: 5,
      lap: {
        lastLaptime: 82_500,
        bestLaptime: 82_000
      }
    })
  }
}`,...(f=(x=i.parameters)==null?void 0:x.docs)==null?void 0:f.source}}};var h,v,L;o.parameters={...o.parameters,docs:{...(h=o.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    telemetry: deterministicRaceState({
      playerPosition: 5,
      lap: {
        lastLaptime: 82_500,
        bestLaptime: 0
      }
    })
  }
}`,...(L=(v=o.parameters)==null?void 0:v.docs)==null?void 0:L.source}}};var b,j,N;c.parameters={...c.parameters,docs:{...(b=c.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    telemetry: deterministicRaceState({
      playerPosition: 5,
      lap: {
        lastLaptime: 0,
        bestLaptime: 82_000
      }
    })
  }
}`,...(N=(j=c.parameters)==null?void 0:j.docs)==null?void 0:N.source}}};var _,T,P;m.parameters={...m.parameters,docs:{...(_=m.parameters)==null?void 0:_.docs,source:{originalSource:`{
  args: {
    telemetry: null
  }
}`,...(P=(T=m.parameters)==null?void 0:T.docs)==null?void 0:P.source}}};const I=["FasterThanBest","SlowerThanBest","EmptyState","SessionStart","NullTelemetry"];export{o as EmptyState,l as FasterThanBest,m as NullTelemetry,c as SessionStart,i as SlowerThanBest,I as __namedExportsOrder,H as default};
