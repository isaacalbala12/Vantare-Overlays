import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{H as h}from"./HubLayout-CAmx_aPF.js";import{u as f}from"./profile-store-B2gGZayo.js";import{s as x}from"./mock-vantare-Dxd_STFz.js";import{M as p,R as u,a as t}from"./chunk-QUQL4437-CV-GYfzc.js";import"./index-Y0gaZlcC.js";import"./react-IGx8eIPn.js";function r(){return e.jsx("div",{className:"flex items-center justify-center h-full text-white/30 text-sm",children:"Select a nav item to see the corresponding page"})}const k={title:"Hub/HubLayout",component:h,decorators:[s=>e.jsx(p,{initialEntries:["/"],children:e.jsx(u,{children:e.jsxs(t,{element:e.jsx(s,{}),children:[e.jsx(t,{index:!0,element:e.jsx(r,{})}),e.jsx(t,{path:"overlays",element:e.jsx(r,{})}),e.jsx(t,{path:"profiles",element:e.jsx(r,{})}),e.jsx(t,{path:"settings",element:e.jsx(r,{})})]})})})],parameters:{layout:"fullscreen",backgrounds:{default:"dark"}}},a={beforeEach:()=>{x({getActiveTheme:()=>Promise.resolve({id:"dark",name:"Dark",description:"Default dark theme",author:"Vantare",version:"1.0",tokens:{}})}),f.setState({activeProfile:{id:"profile-1",name:"My Racing Profile",createdAt:"2025-01-15T10:00:00Z",updatedAt:"2025-06-01T08:30:00Z",overlays:{},themeId:"dark"},profiles:[{id:"profile-1",name:"My Racing Profile",createdAt:"2025-01-15T10:00:00Z",updatedAt:"2025-06-01T08:30:00Z",overlays:{},themeId:"dark"},{id:"profile-2",name:"Streaming Setup",createdAt:"2025-03-20T14:00:00Z",updatedAt:"2025-05-28T16:00:00Z",overlays:{},themeId:"blood"}]})}},o={...a,decorators:[s=>e.jsx(p,{initialEntries:["/"],children:e.jsx(u,{children:e.jsxs(t,{element:e.jsx(s,{}),children:[e.jsx(t,{index:!0,element:e.jsx(r,{})}),e.jsx(t,{path:"overlays",element:e.jsx(r,{})}),e.jsx(t,{path:"profiles",element:e.jsx(r,{})}),e.jsx(t,{path:"settings",element:e.jsx(r,{})})]})})})],parameters:{...a.parameters,reactRouter:{initialEntries:["/"]}}};var n,i,l;a.parameters={...a.parameters,docs:{...(n=a.parameters)==null?void 0:n.docs,source:{originalSource:`{
  beforeEach: () => {
    setupMockVantare({
      getActiveTheme: () => Promise.resolve({
        id: 'dark',
        name: 'Dark',
        description: 'Default dark theme',
        author: 'Vantare',
        version: '1.0',
        tokens: {}
      })
    });
    useProfileStore.setState({
      activeProfile: {
        id: 'profile-1',
        name: 'My Racing Profile',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-06-01T08:30:00Z',
        overlays: {},
        themeId: 'dark'
      },
      profiles: [{
        id: 'profile-1',
        name: 'My Racing Profile',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-06-01T08:30:00Z',
        overlays: {},
        themeId: 'dark'
      }, {
        id: 'profile-2',
        name: 'Streaming Setup',
        createdAt: '2025-03-20T14:00:00Z',
        updatedAt: '2025-05-28T16:00:00Z',
        overlays: {},
        themeId: 'blood'
      }]
    });
  }
}`,...(l=(i=a.parameters)==null?void 0:i.docs)==null?void 0:l.source}}};var d,m,c;o.parameters={...o.parameters,docs:{...(d=o.parameters)==null?void 0:d.docs,source:{originalSource:`{
  ...WithActiveProfile,
  decorators: [Story => <MemoryRouter initialEntries={['/']}>\r
        <Routes>\r
          <Route element={<Story />}>\r
            <Route index element={<PlaceholderPage />} />\r
            <Route path="overlays" element={<PlaceholderPage />} />\r
            <Route path="profiles" element={<PlaceholderPage />} />\r
            <Route path="settings" element={<PlaceholderPage />} />\r
          </Route>\r
        </Routes>\r
      </MemoryRouter>],
  parameters: {
    ...WithActiveProfile.parameters,
    reactRouter: {
      initialEntries: ['/']
    }
  }
}`,...(c=(m=o.parameters)==null?void 0:m.docs)==null?void 0:c.source}}};const T=["WithActiveProfile","DashboardActive"];export{o as DashboardActive,a as WithActiveProfile,T as __namedExportsOrder,k as default};
