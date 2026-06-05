import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{H as c}from"./HubLayout-CAmx_aPF.js";import{u as m}from"./profile-store-B2gGZayo.js";import{s as u}from"./mock-vantare-Dxd_STFz.js";import{M as p,R as f,a as o}from"./chunk-QUQL4437-CV-GYfzc.js";import"./index-Y0gaZlcC.js";import"./react-IGx8eIPn.js";const E={title:"Hub/EmptyState",component:c,decorators:[l=>e.jsx(p,{initialEntries:["/"],children:e.jsx(f,{children:e.jsx(o,{element:e.jsx(l,{}),children:e.jsx(o,{index:!0,element:null})})})})],parameters:{layout:"fullscreen",backgrounds:{default:"dark"}}},r={beforeEach:()=>{u(),m.setState({profiles:[],activeProfile:null,isLoading:!1,error:null})}};var t,s,a,n,i;r.parameters={...r.parameters,docs:{...(t=r.parameters)==null?void 0:t.docs,source:{originalSource:`{
  beforeEach: () => {
    setupMockVantare();
    useProfileStore.setState({
      profiles: [],
      activeProfile: null,
      isLoading: false,
      error: null
    });
  }
}`,...(a=(s=r.parameters)==null?void 0:s.docs)==null?void 0:a.source},description:{story:`Renders HubLayout with no active profile, triggering the inline\r
EmptyState component ("No Profile Selected").`,...(i=(n=r.parameters)==null?void 0:n.docs)==null?void 0:i.description}}};const P=["NoProfile"];export{r as NoProfile,P as __namedExportsOrder,E as default};
