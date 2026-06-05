import{j as e}from"./jsx-runtime-D_zvdyIk.js";const o={title:"Design/Animations",parameters:{layout:"padded",backgrounds:{default:"dark"}}};function a({className:r,label:d}){return e.jsx("div",{style:{padding:"1rem"},children:e.jsx("div",{className:r,style:{background:"rgba(255,255,255,0.1)",padding:"1rem",borderRadius:"0.5rem",minWidth:"200px",textAlign:"center"},children:d})})}const s={render:()=>e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"1rem"},children:[e.jsx(a,{className:"hf-fade-in",label:"hf-fade-in"}),e.jsx(a,{className:"hf-fade-out",label:"hf-fade-out"}),e.jsx(a,{className:"hf-slide-up",label:"hf-slide-up"}),e.jsx(a,{className:"hf-slide-down",label:"hf-slide-down"}),e.jsx(a,{className:"hf-pulse",label:"hf-pulse"}),e.jsx(a,{className:"hf-glow",label:"hf-glow"}),e.jsx(a,{className:"hf-scale-in",label:"hf-scale-in"})]})};var l,i,n;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem'
  }}>\r
      <AnimationDemo className="hf-fade-in" label="hf-fade-in" />\r
      <AnimationDemo className="hf-fade-out" label="hf-fade-out" />\r
      <AnimationDemo className="hf-slide-up" label="hf-slide-up" />\r
      <AnimationDemo className="hf-slide-down" label="hf-slide-down" />\r
      <AnimationDemo className="hf-pulse" label="hf-pulse" />\r
      <AnimationDemo className="hf-glow" label="hf-glow" />\r
      <AnimationDemo className="hf-scale-in" label="hf-scale-in" />\r
    </div>
}`,...(n=(i=s.parameters)==null?void 0:i.docs)==null?void 0:n.source}}};const t=["AllAnimations"];export{s as AllAnimations,t as __namedExportsOrder,o as default};
