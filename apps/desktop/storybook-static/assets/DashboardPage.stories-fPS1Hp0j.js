import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as o}from"./index-Y0gaZlcC.js";import{c as k}from"./react-IGx8eIPn.js";import{u as m}from"./settings-store-CF5RzJ1G.js";import{u}from"./profile-store-B2gGZayo.js";import"./SettingsForm-Cwbdzq1s.js";import"./PositionBadge-Co8LWPpM.js";import{L as T,M as P}from"./chunk-QUQL4437-CV-GYfzc.js";import{s as b}from"./mock-vantare-Dxd_STFz.js";function A(){const[t,n]=o.useState(!1),[i,d]=o.useState(null);return o.useEffect(()=>{if(window.vantare)return window.vantare.onSimState(r=>{n(r.connected),d(r.name)})},[]),{connected:t,simName:i}}const M={connected:"bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]",disconnected:"bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]",error:"bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"},_={connected:"animate-pulse",disconnected:"",error:""};function y({status:t,label:n}){return e.jsxs("span",{className:"inline-flex items-center gap-2","aria-label":n??t,children:[e.jsx("span",{className:`inline-block h-2.5 w-2.5 rounded-full ${M[t]} ${_[t]}`}),n&&e.jsx("span",{className:"text-xs text-white/70",children:n})]})}y.__docgenInfo={description:"",methods:[],displayName:"StatusIndicator",props:{status:{required:!0,tsType:{name:"union",raw:"'connected' | 'disconnected' | 'error'",elements:[{name:"literal",value:"'connected'"},{name:"literal",value:"'disconnected'"},{name:"literal",value:"'error'"}]},description:""},label:{required:!1,tsType:{name:"string"},description:""}}};const D=k(t=>({demoMode:!1,setDemoMode:n=>t({demoMode:n}),isLoading:!0,setIsLoading:n=>t({isLoading:n})}));function w(){const{connected:t,simName:n}=A(),{demoMode:i,setDemoMode:d}=D(),s=m(a=>a.settings),r=u(a=>a.activeProfile),[N,p]=o.useState("Default");o.useEffect(()=>{window.vantare.getActiveTheme().then(a=>{a!=null&&a.name&&p(a.name)}).catch(()=>{p("Default")})},[]);const j=t?"connected":"disconnected";return e.jsxs("div",{className:"p-6 space-y-6",children:[e.jsx("h1",{className:"text-lg font-semibold text-white/80",children:"Dashboard"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[e.jsxs("div",{"data-testid":"dashboard-sim-status",className:"glass-panel p-4 space-y-2",children:[e.jsx("h2",{className:"text-sm font-medium text-white/50 uppercase tracking-wide",children:"Sim Status"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(y,{status:j}),e.jsx("span",{className:"text-sm text-white/70",children:t&&n?n:"No sim detected"})]})]}),e.jsxs("div",{"data-testid":"dashboard-quick-settings",className:"glass-panel p-4 space-y-2",children:[e.jsx("h2",{className:"text-sm font-medium text-white/50 uppercase tracking-wide",children:"Quick Settings"}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-sm text-white/70",children:"Demo Mode"}),e.jsx("button",{"data-testid":"demo-mode-toggle",onClick:()=>d(!i),className:`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${i?"bg-blue-600":"bg-white/20"}`,children:e.jsx("span",{className:`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${i?"translate-x-[18px]":"translate-x-[2px]"}`})})]}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-sm text-white/70",children:"HTTP Server Port"}),e.jsx("span",{className:"text-sm text-white/90 font-mono",children:(s==null?void 0:s.httpServerPort)??"—"})]}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-sm text-white/70",children:"Overlay Visibility Key"}),e.jsx("span",{className:"text-sm text-white/90 font-mono",children:(s==null?void 0:s.overlayVisibilityKey)??"—"})]})]})]}),e.jsxs("div",{"data-testid":"dashboard-active-profile",className:"glass-panel p-4 space-y-2",children:[e.jsx("h2",{className:"text-sm font-medium text-white/50 uppercase tracking-wide",children:"Active Profile"}),e.jsx("p",{className:"text-sm text-white/90",children:(r==null?void 0:r.name)??"No profile selected"}),r&&e.jsx(T,{to:"/profiles",className:"inline-block text-xs text-blue-400 hover:text-blue-300 transition-colors",children:"Manage"})]}),e.jsxs("div",{"data-testid":"dashboard-active-theme",className:"glass-panel p-4 space-y-2",children:[e.jsx("h2",{className:"text-sm font-medium text-white/50 uppercase tracking-wide",children:"Active Theme"}),e.jsx("p",{className:"text-sm text-white/90",children:N}),e.jsx("p",{className:"text-xs text-white/40",children:"Read-only"})]})]})]})}w.__docgenInfo={description:"",methods:[],displayName:"DashboardPage"};const F={title:"Hub/DashboardPage",component:w,decorators:[t=>e.jsx(P,{children:e.jsx("div",{className:"bg-[#0a0a0a] min-h-screen",children:e.jsx(t,{})})})],parameters:{layout:"fullscreen",backgrounds:{default:"dark"}}},l={beforeEach:()=>{b({getActiveTheme:()=>Promise.resolve({id:"midnight",name:"Midnight",description:"",author:"",version:"1.0",tokens:{}}),onSimState:t=>(t({connected:!0,name:"iRacing"}),()=>{})}),u.setState({activeProfile:{id:"profile-1",name:"My Racing Profile",createdAt:"2025-01-15T10:00:00Z",updatedAt:"2025-06-01T08:30:00Z",overlays:{},themeId:"midnight"}}),m.setState({settings:{language:"en",autostart:!1,minimizeToTray:!0,startMinimized:!1,overlayVisibilityKey:"F9",preferredSim:"auto",alertVolume:.8,alertEnabled:!0,autoUpdate:!0,updateChannel:"stable",httpServerPort:2546,networkAccess:!0},isLoading:!1,error:null})}},c={beforeEach:()=>{b({getActiveTheme:()=>Promise.resolve({id:"dark",name:"Dark",description:"",author:"",version:"1.0",tokens:{}}),onSimState:t=>(t({connected:!1,name:null}),()=>{})}),u.setState({activeProfile:{id:"profile-2",name:"Streaming Setup",createdAt:"2025-03-20T14:00:00Z",updatedAt:"2025-05-28T16:00:00Z",overlays:{},themeId:"dark"}}),m.setState({settings:{language:"en",autostart:!1,minimizeToTray:!0,startMinimized:!1,overlayVisibilityKey:"F9",preferredSim:"auto",alertVolume:.8,alertEnabled:!0,autoUpdate:!0,updateChannel:"stable",httpServerPort:2546,networkAccess:!0},isLoading:!1,error:null})}};var h,x,f;l.parameters={...l.parameters,docs:{...(h=l.parameters)==null?void 0:h.docs,source:{originalSource:`{
  beforeEach: () => {
    setupMockVantare({
      getActiveTheme: () => Promise.resolve({
        id: 'midnight',
        name: 'Midnight',
        description: '',
        author: '',
        version: '1.0',
        tokens: {}
      }),
      onSimState: (callback: (state: any) => void) => {
        callback({
          connected: true,
          name: 'iRacing'
        });
        return () => {};
      }
    });
    useProfileStore.setState({
      activeProfile: {
        id: 'profile-1',
        name: 'My Racing Profile',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-06-01T08:30:00Z',
        overlays: {},
        themeId: 'midnight'
      }
    });
    useSettingsStore.setState({
      settings: {
        language: 'en',
        autostart: false,
        minimizeToTray: true,
        startMinimized: false,
        overlayVisibilityKey: 'F9',
        preferredSim: 'auto',
        alertVolume: 0.8,
        alertEnabled: true,
        autoUpdate: true,
        updateChannel: 'stable',
        httpServerPort: 2546,
        networkAccess: true
      },
      isLoading: false,
      error: null
    });
  }
}`,...(f=(x=l.parameters)==null?void 0:x.docs)==null?void 0:f.source}}};var g,v,S;c.parameters={...c.parameters,docs:{...(g=c.parameters)==null?void 0:g.docs,source:{originalSource:`{
  beforeEach: () => {
    setupMockVantare({
      getActiveTheme: () => Promise.resolve({
        id: 'dark',
        name: 'Dark',
        description: '',
        author: '',
        version: '1.0',
        tokens: {}
      }),
      onSimState: (callback: (state: any) => void) => {
        callback({
          connected: false,
          name: null
        });
        return () => {};
      }
    });
    useProfileStore.setState({
      activeProfile: {
        id: 'profile-2',
        name: 'Streaming Setup',
        createdAt: '2025-03-20T14:00:00Z',
        updatedAt: '2025-05-28T16:00:00Z',
        overlays: {},
        themeId: 'dark'
      }
    });
    useSettingsStore.setState({
      settings: {
        language: 'en',
        autostart: false,
        minimizeToTray: true,
        startMinimized: false,
        overlayVisibilityKey: 'F9',
        preferredSim: 'auto',
        alertVolume: 0.8,
        alertEnabled: true,
        autoUpdate: true,
        updateChannel: 'stable',
        httpServerPort: 2546,
        networkAccess: true
      },
      isLoading: false,
      error: null
    });
  }
}`,...(S=(v=c.parameters)==null?void 0:v.docs)==null?void 0:S.source}}};const U=["Connected","Disconnected"];export{l as Connected,c as Disconnected,U as __namedExportsOrder,F as default};
