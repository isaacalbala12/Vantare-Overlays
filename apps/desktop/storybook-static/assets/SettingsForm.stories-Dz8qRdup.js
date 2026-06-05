import{j as t}from"./jsx-runtime-D_zvdyIk.js";import{r as c}from"./index-Y0gaZlcC.js";import{S as n,a as d}from"./SettingsForm-Cwbdzq1s.js";const h={title:"UI-Core/SettingsForm",component:n,decorators:[a=>t.jsx("div",{style:{padding:24,minHeight:"100vh",background:"#0a0a0a"},children:t.jsx("div",{style:{maxWidth:480},children:t.jsx(a,{})})})],parameters:{layout:"fullscreen",backgrounds:{default:"dark"}}},s={render:()=>{const[a,i]=c.useState({rowCount:20,showMulticlass:!0,showGaps:!0,showLastLap:!0,showBestLap:!0,columns:["position","name","gap","lastLap"],opacity:1});return t.jsx(n,{schema:d,values:a,onChange:u=>i(p=>({...p,...u})),testId:"standings"})}};var e,r,o;s.parameters={...s.parameters,docs:{...(e=s.parameters)==null?void 0:e.docs,source:{originalSource:`{
  render: () => {
    const [values, setValues] = useState<Record<string, unknown>>({
      rowCount: 20,
      showMulticlass: true,
      showGaps: true,
      showLastLap: true,
      showBestLap: true,
      columns: ['position', 'name', 'gap', 'lastLap'],
      opacity: 1
    });
    return <SettingsForm schema={StandingsConfigSchema as any} values={values} onChange={partial => setValues(prev => ({
      ...prev,
      ...partial
    }))} testId="standings" />;
  }
}`,...(o=(r=s.parameters)==null?void 0:r.docs)==null?void 0:o.source}}};const S=["StandingsConfig"];export{s as StandingsConfig,S as __namedExportsOrder,h as default};
