import{j as o}from"./jsx-runtime-D_zvdyIk.js";import{r as g}from"./index-Y0gaZlcC.js";import{a as j,R as I,D as M,b as Z,S as B}from"./SettingsForm-Cwbdzq1s.js";import"./PositionBadge-Co8LWPpM.js";import{c as R}from"./react-IGx8eIPn.js";import{u as x}from"./profile-store-B2gGZayo.js";import{s as A}from"./mock-vantare-Dxd_STFz.js";const d=R((a,v)=>({draftConfigs:{},saving:!1,error:null,loadOverlayConfig:async r=>{var n;try{a({error:null});const e=await window.vantare.getActiveProfile(),s=(n=e==null?void 0:e.overlays)==null?void 0:n[r],l={};if(s)for(const[i,c]of Object.entries(s))i!=="overlayId"&&(l[i]=c);a(i=>({draftConfigs:{...i.draftConfigs,[r]:l}}))}catch(e){const s=e instanceof Error?e.message:"Failed to load overlay config";a({error:s})}},updateOverlayConfig:(r,n)=>{a(e=>({draftConfigs:{...e.draftConfigs,[r]:{...e.draftConfigs[r],...n}}}))},saveOverlayConfig:async r=>{try{a({saving:!0,error:null});const n=v().draftConfigs[r],e=await window.vantare.getActiveProfile();if(!e)throw new Error("No active profile");const s={...e.overlays[r],...n},l={id:e.id,name:e.name,createdAt:e.createdAt,updatedAt:new Date().toISOString(),overlays:{...e.overlays,[r]:s},themeId:e.themeId};await window.vantare.saveProfile(l),a({saving:!1})}catch(n){const e=n instanceof Error?n.message:"Failed to save overlay config";a({error:e,saving:!1})}},discardChanges:async r=>{var n;try{a({error:null});const e=await window.vantare.getActiveProfile(),s=(n=e==null?void 0:e.overlays)==null?void 0:n[r],l={};if(s)for(const[i,c]of Object.entries(s))i!=="overlayId"&&(l[i]=c);a(i=>({draftConfigs:{...i.draftConfigs,[r]:l}}))}catch(e){const s=e instanceof Error?e.message:"Failed to discard changes";a({error:s})}}})),h=[{id:"standings",label:"Standings",schema:j},{id:"relative",label:"Relative",schema:I},{id:"delta",label:"Delta Bar",schema:M},{id:"stream-alerts",label:"Stream Alerts",schema:Z}];function p(){const[a,v]=g.useState("standings"),[r,n]=g.useState(null),e=d(t=>t.draftConfigs),s=d(t=>t.loadOverlayConfig),l=d(t=>t.updateOverlayConfig),i=d(t=>t.saveOverlayConfig),c=d(t=>t.discardChanges),m=d(t=>t.saving);g.useEffect(()=>{s(a)},[a,s]);const T=g.useCallback(async()=>{await i(a),n("Settings saved"),setTimeout(()=>n(null),2e3)},[a,i]),k=g.useCallback(async()=>{await c(a)},[a,c]),L=h.find(t=>t.id===a);return o.jsxs("div",{className:"p-6 h-full flex flex-col",children:[o.jsx("nav",{"data-testid":"overlay-settings-nav",className:"flex gap-1 mb-6 border-b border-white/10",children:h.map(t=>o.jsx("button",{onClick:()=>v(t.id),className:`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${a===t.id?"bg-white/10 text-white border-b-2 border-white":"text-white/50 hover:text-white hover:bg-white/5"}`,children:t.label},t.id))}),o.jsx("div",{"data-testid":"overlay-settings-form",className:"flex-1 overflow-auto",children:o.jsx(B,{schema:L.schema,values:e[a]??{},onChange:t=>l(a,t),testId:"settings"})}),o.jsxs("div",{className:"flex items-center gap-3 mt-4 pt-4 border-t border-white/10",children:[o.jsx("button",{onClick:T,"data-testid":"settings-save",disabled:m,className:"rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors",children:m?"Saving...":"Save"}),o.jsx("button",{onClick:k,"data-testid":"settings-discard",className:"rounded bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors",children:"Discard"}),r&&o.jsx("span",{"data-testid":"settings-confirmation",className:"text-sm text-green-400",children:r})]})]})}p.__docgenInfo={description:"",methods:[],displayName:"OverlaySettingsPage"};function O(){return g.useEffect(()=>{d.setState({draftConfigs:{standings:{rowCount:20,showMulticlass:!0,showGaps:!0,showLastLap:!0,showBestLap:!0,columns:["position","name","gap","lastLap"],opacity:1},relative:{rangeAhead:3,rangeBehind:3,showGaps:!0,colorCoding:!0,opacity:1},delta:{opacity:1},"stream-alerts":{opacity:1}},saving:!1,error:null})},[]),o.jsx(p,{})}const W={title:"Hub/OverlaySettingsPage",component:p,decorators:[a=>o.jsx("div",{className:"bg-[#0a0a0a] min-h-screen",children:o.jsx(a,{})})],parameters:{layout:"fullscreen",backgrounds:{default:"dark"}}},f={beforeEach:()=>{A({getActiveProfile:()=>Promise.resolve({id:"profile-1",name:"My Racing Profile",createdAt:"2025-01-15T10:00:00Z",updatedAt:"2025-06-01T08:30:00Z",overlays:{standings:{overlayId:"standings",rowCount:20,showMulticlass:!0,showGaps:!0,showLastLap:!0,showBestLap:!0,columns:["position","name","gap","lastLap"],opacity:1}},themeId:"dark"}),saveProfile:()=>Promise.resolve()}),x.setState({activeProfile:{id:"profile-1",name:"My Racing Profile",createdAt:"2025-01-15T10:00:00Z",updatedAt:"2025-06-01T08:30:00Z",overlays:{standings:{overlayId:"standings",rowCount:20,showMulticlass:!0,showGaps:!0,showLastLap:!0,showBestLap:!0,columns:["position","name","gap","lastLap"],opacity:1}},themeId:"dark"}})},render:()=>o.jsx(O,{})},u={...f,beforeEach:()=>{A({getActiveProfile:()=>Promise.resolve({id:"profile-1",name:"My Racing Profile",createdAt:"2025-01-15T10:00:00Z",updatedAt:"2025-06-01T08:30:00Z",overlays:{relative:{overlayId:"relative",rangeAhead:3,rangeBehind:3,showGaps:!0,colorCoding:!0,opacity:.9}},themeId:"dark"}),saveProfile:()=>Promise.resolve()}),x.setState({activeProfile:{id:"profile-1",name:"My Racing Profile",createdAt:"2025-01-15T10:00:00Z",updatedAt:"2025-06-01T08:30:00Z",overlays:{relative:{overlayId:"relative",rangeAhead:3,rangeBehind:3,showGaps:!0,colorCoding:!0,opacity:.9}},themeId:"dark"}}),d.setState({draftConfigs:{relative:{rangeAhead:3,rangeBehind:3,showGaps:!0,colorCoding:!0,opacity:.9}},saving:!1,error:null})},render:()=>o.jsx(O,{})};var y,w,C;f.parameters={...f.parameters,docs:{...(y=f.parameters)==null?void 0:y.docs,source:{originalSource:`{
  beforeEach: () => {
    setupMockVantare({
      getActiveProfile: () => Promise.resolve({
        id: 'profile-1',
        name: 'My Racing Profile',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-06-01T08:30:00Z',
        overlays: {
          standings: {
            overlayId: 'standings',
            rowCount: 20,
            showMulticlass: true,
            showGaps: true,
            showLastLap: true,
            showBestLap: true,
            columns: ['position', 'name', 'gap', 'lastLap'],
            opacity: 1
          }
        },
        themeId: 'dark'
      }),
      saveProfile: () => Promise.resolve()
    });
    useProfileStore.setState({
      activeProfile: {
        id: 'profile-1',
        name: 'My Racing Profile',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-06-01T08:30:00Z',
        overlays: {
          standings: {
            overlayId: 'standings',
            rowCount: 20,
            showMulticlass: true,
            showGaps: true,
            showLastLap: true,
            showBestLap: true,
            columns: ['position', 'name', 'gap', 'lastLap'],
            opacity: 1
          }
        },
        themeId: 'dark'
      }
    });
  },
  render: () => <OverlaySettingsPageWrapper />
}`,...(C=(w=f.parameters)==null?void 0:w.docs)==null?void 0:C.source}}};var b,S,P;u.parameters={...u.parameters,docs:{...(b=u.parameters)==null?void 0:b.docs,source:{originalSource:`{
  ...StandingsTab,
  beforeEach: () => {
    setupMockVantare({
      getActiveProfile: () => Promise.resolve({
        id: 'profile-1',
        name: 'My Racing Profile',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-06-01T08:30:00Z',
        overlays: {
          relative: {
            overlayId: 'relative',
            rangeAhead: 3,
            rangeBehind: 3,
            showGaps: true,
            colorCoding: true,
            opacity: 0.9
          }
        },
        themeId: 'dark'
      }),
      saveProfile: () => Promise.resolve()
    });
    useProfileStore.setState({
      activeProfile: {
        id: 'profile-1',
        name: 'My Racing Profile',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-06-01T08:30:00Z',
        overlays: {
          relative: {
            overlayId: 'relative',
            rangeAhead: 3,
            rangeBehind: 3,
            showGaps: true,
            colorCoding: true,
            opacity: 0.9
          }
        },
        themeId: 'dark'
      }
    });
    useOverlayConfigStore.setState({
      draftConfigs: {
        relative: {
          rangeAhead: 3,
          rangeBehind: 3,
          showGaps: true,
          colorCoding: true,
          opacity: 0.9
        }
      },
      saving: false,
      error: null
    });
  },
  render: () => <OverlaySettingsPageWrapper />
}`,...(P=(S=u.parameters)==null?void 0:S.docs)==null?void 0:P.source}}};const H=["StandingsTab","RelativeTab"];export{u as RelativeTab,f as StandingsTab,H as __namedExportsOrder,W as default};
