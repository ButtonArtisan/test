function escapeSrcdoc(str){
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/"/g,"&quot;");
}

function inferSize(content,t){
  const forcedW = t.w ? `${t.w}px` : "";
  const forcedH = t.h ? `${t.h}px` : "";

  if(forcedW && forcedH){
    return {w:forcedW,h:forcedH};
  }

  const widthMatches = [...content.matchAll(/width\s*:\s*(\d+)px/gi)].map(m=>Number(m[1]));
  const heightMatches = [...content.matchAll(/height\s*:\s*(\d+)px/gi)].map(m=>Number(m[1]));

  const foundW = widthMatches.length ? Math.max(...widthMatches) : 700;
  const foundH = heightMatches.length ? Math.max(...heightMatches) : 700;

  return {
    w: forcedW || `${Math.max(foundW + 160,700)}px`,
    h: forcedH || `${Math.max(foundH + 160,700)}px`
  };
}

function asSrcdoc(content){
  if(/<!doctype|<html/i.test(content)){
    return content;
  }

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
html,body{
  margin:0;
  width:100%;
  height:100%;
  background:transparent;
  overflow:visible;
}
body{
  display:grid;
  place-items:center;
}
.render-center-stage{
  position:relative;
  overflow:visible;
}
</style>
</head>
<body>
<div class="render-center-stage">
${content}
</div>
</body>
</html>`;
}

function renderLayers(layers, layerTransforms){
  const f = document.getElementById("pv");
  const activeLayers = Object.values(layers).filter(v => v.trim() !== "");
  if(activeLayers.length === 0) return;

  const cameraOrbit = window.cameraOrbit || 0;

  const xRot = layerTransforms[1].x || 0;
  const yRot = layerTransforms[1].y || 0;
  const finalYRot = yRot + cameraOrbit;

  const thickness = layerTransforms[1].z || 0;
  const thickness2 = layerTransforms[1].z2 || 0;

  const stackCountY = Math.max(1, Math.round(Math.abs(thickness) / 5));
  const stackCountX = Math.max(1, Math.round(Math.abs(thickness2) / 5));

  const spacingY = thickness >= 0 ? 2 : -2;
  const spacingX = thickness2 >= 0 ? 2 : -2;

  let html = `
<body style="
  margin:0;
  background:transparent;
  height:100vh;
  width:100vw;
  display:flex;
  align-items:center;
  justify-content:center;
  perspective:1000px;
  overflow:visible;
">
  <div id="container" style="
    width:100vw;
    height:100vh;
    position:relative;
    transform-style:preserve-3d;
    transform:rotateX(${xRot}deg) rotateY(${finalYRot}deg);
    overflow:visible;
  ">
`;

  for(let i=1;i<=8;i++){
    if(layers[i] && layers[i].trim() !== ""){
      const content = layers[i];
      const t = layerTransforms[i] || {};
      const size = inferSize(content,t);

      const moveX = t.tx || 0;
      const moveY = t.ty || 0;
      const scale = (t.scale || 100) / 100;
      const srcdoc = escapeSrcdoc(asSrcdoc(content));

      for(let y=0;y<stackCountY;y++){
        for(let x=0;x<stackCountX;x++){
          const yOffset = y * spacingY;
          const xOffset = x * spacingX;

          html += `
<div style="
  position:absolute;
  top:50%;
  left:50%;
  width:${size.w};
  height:${size.h};
  overflow:visible;
  transform:
    translate(
      calc(-50% + ${xOffset + moveX}px),
      calc(-50% + ${yOffset + moveY}px)
    )
    scale(${scale});
  transform-origin:center center;
">
  <iframe
    srcdoc="${srcdoc}"
    sandbox="allow-scripts allow-same-origin"
    scrolling="no"
    style="
      width:100%;
      height:100%;
      border:0;
      background:transparent;
      overflow:visible;
      display:block;
    ">
  </iframe>
</div>`;
        }
      }
    }
  }

  html += `
  </div>
</body>`;

  f.srcdoc = html;
}

function buildExportHTML(layers, layerTransforms){
  return document.getElementById("pv").srcdoc || "<!doctype html><html><body></body></html>";
}
