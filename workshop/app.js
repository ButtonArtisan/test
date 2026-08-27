const codeEl = document.getElementById("code")
const panel = document.getElementById("panel")
const rotX = document.getElementById("rotX")
const rotY = document.getElementById("rotY")
const orbit = document.getElementById("orbit")
const viewer = document.getElementById("viewer")
const toggleCodeBtn = document.getElementById("toggleCode")
const wrap = document.getElementById("wrap")
const bgBtn = document.getElementById("bg")
const codeOptions = document.getElementById("codeOptions")
const toggleLayout = document.getElementById("toggleLayout")
const saveArt = document.getElementById("saveArt")

const thick = document.getElementById("thick")
const thick2 = document.getElementById("thick2")

const artW = document.getElementById("artW")
const artH = document.getElementById("artH")

const artX = document.getElementById("artX")
const artY = document.getElementById("artY")

const previewScale = document.getElementById("previewScale")

window.cameraOrbit = 0

let currentLayer = 1
let layers = {}
let layerTransforms = {}
let horizontal = false

for(let i=1;i<=8;i++){
  layers[i] = ""
  layerTransforms[i] = {
    x:0,
    y:0,
    z:0,
    z2:0,
    bg:true,
    w:"",
    h:"",
    tx:0,
    ty:0,
    scale:100
  }
}

const layerWrap = document.getElementById("layers")

for(let i=1;i<=8;i++){
  const b = document.createElement("button")
  b.textContent = i
  b.className = "layer"+(i===1?" active":"")
  b.onclick = ()=>selectLayer(i)
  layerWrap.appendChild(b)
}

function selectLayer(n){

  if(currentLayer===n){
    currentLayer=null
    document.querySelectorAll(".layer").forEach(b=>b.classList.remove("active"))
    codeEl.value=""

    artW.value=""
    artH.value=""
    artX.value=0
    artY.value=0

    if(previewScale) previewScale.value=100

    return
  }

  currentLayer=n

  document.querySelectorAll(".layer").forEach(b=>b.classList.remove("active"))
  layerWrap.children[n-1].classList.add("active")

  codeEl.value=layers[n]||""
  rotX.value=layerTransforms[n].x
  rotY.value=layerTransforms[n].y
  thick.value=layerTransforms[n].z || 0
  thick2.value=layerTransforms[n].z2 || 0

  artW.value = layerTransforms[n].w || ""
  artH.value = layerTransforms[n].h || ""

  artX.value = layerTransforms[n].tx || 0
  artY.value = layerTransforms[n].ty || 0

  if(previewScale){
    previewScale.value = layerTransforms[n].scale || 100
  }

  bgBtn.classList.toggle("active", !layerTransforms[n].bg)
}

function stripBackgrounds(str){
  const match = str.match(/^\s*<div[^>]*>([\s\S]*)<\/div>\s*$/i)
  if(match){
    return match[1]
  }
  return str
}

/* =========================
   CODE BUTTON = CLIPBOARD COLLECTOR
   ========================= */
const codeCollectorButtons = [...document.querySelectorAll(".code-collect-btn")]
const controlSwap = document.getElementById("controlSwap")
const collectedCode = {
  html:"",
  css:"",
  js:""
}

function unwrapCollectedCode(text, tag){
  const re = new RegExp("^\\s*<" + tag + "\\b[^>]*>([\\s\\S]*?)<\\/" + tag + ">\\s*$", "i")
  const match = String(text || "").match(re)
  return match ? match[1] : String(text || "")
}

function stripCollectedFileLinks(html){
  const isRemote = value => /^(https?:)?\/\//i.test(value) || /^data:/i.test(value)

  html = html.replace(
    /<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi,
    (tag, href) => isRemote(href) ? tag : ""
  )

  html = html.replace(
    /<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (tag, src) => isRemote(src) ? tag : ""
  )

  return html
}

function buildCollectedDocument(){
  let html = stripCollectedFileLinks(collectedCode.html.trim())
  const css = unwrapCollectedCode(collectedCode.css, "style")
  const js = unwrapCollectedCode(collectedCode.js, "script")
  const styleTag = `<style>\n${css}\n</style>`
  const safeJs = js.replace(/<\/script/gi, "<\\/script")
  const scriptTag = `<script>\n${safeJs}\n<\/script>`

  if(!/<html[\s>]/i.test(html) && !/<!doctype/i.test(html)){
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
${styleTag}
</head>
<body>
${html}
${scriptTag}
</body>
</html>`
  }

  if(/<\/head>/i.test(html)){
    html = html.replace(/<\/head>/i, styleTag + "</head>")
  }else if(/<html([^>]*)>/i.test(html)){
    html = html.replace(
      /<html([^>]*)>/i,
      `<html$1><head><meta charset="utf-8">${styleTag}</head>`
    )
  }else{
    html = styleTag + html
  }

  if(/<\/body>/i.test(html)){
    html = html.replace(/<\/body>/i, scriptTag + "</body>")
  }else{
    html += scriptTag
  }

  return html
}

function openCodeCollector(){
  document.body.classList.add("code-mode")
  controlSwap.classList.add("code-mode")
  codeOptions.setAttribute("aria-hidden", "false")
}

function closeCodeCollector(){
  document.body.classList.remove("code-mode")
  controlSwap.classList.remove("code-mode")
  codeOptions.setAttribute("aria-hidden", "true")
}

function hasCollectedCode(){
  return Object.values(collectedCode).some(value => value.trim() !== "")
}

async function collectCode(type, button){
  const text = await navigator.clipboard.readText()
  if(!text.trim()) return

  collectedCode[type] = text
  button.classList.add("collected")
}

codeCollectorButtons.forEach(button => {
  button.onclick = () => {
    const type = button.dataset.codeType
    collectCode(type, button).catch(() => alert("paste blocked"))
  }
})

toggleCodeBtn.onclick = () => {
  if(controlSwap.classList.contains("code-mode")){
    closeCodeCollector()
  }else{
    openCodeCollector()
  }
}

document.addEventListener("keydown", event => {
  if(event.key === "Escape") closeCodeCollector()
})

function run(){
  if(!currentLayer) return

  let raw=(codeEl.value||"").trim()

  if(hasCollectedCode()){
    raw=buildCollectedDocument()
    codeEl.value=raw
    closeCodeCollector()
  }

  const t = layerTransforms[currentLayer]

  const processed = t.bg ? raw : stripBackgrounds(raw)

  layers[currentLayer]=processed
  renderLayers(layers, layerTransforms)

  panel.style.opacity="1"
  panel.style.pointerEvents="auto"
}

async function paste(){
  const text=await navigator.clipboard.readText()
  codeEl.value=text
}

function clearLayer(){
  if(!currentLayer) return

  layers[currentLayer]=""
  codeEl.value=""

  Object.keys(collectedCode).forEach(type => {
    collectedCode[type]=""
  })

  codeCollectorButtons.forEach(button => {
    button.classList.remove("collected")
  })

  closeCodeCollector()
  renderLayers(layers, layerTransforms)
}

function stop(){
  const old=document.getElementById("pv")
  const fresh=document.createElement("iframe")

  fresh.id="pv"
  fresh.setAttribute("sandbox","allow-scripts allow-same-origin")
  fresh.setAttribute("scrolling","no")
  fresh.style.width="100%"
  fresh.style.height="100%"
  fresh.style.border="none"

  old.replaceWith(fresh)
}

function updateRotation(){
  if(currentLayer){
    layerTransforms[currentLayer].x = parseFloat(rotX.value) || 0
    layerTransforms[currentLayer].y = parseFloat(rotY.value) || 0
    renderLayers(layers, layerTransforms)
  }else{
    panel.style.transform =
    `rotateX(${rotX.value}deg) rotateY(${rotY.value}deg)`
  }
}

function updateThickness(){
  if(currentLayer){
    const t = layerTransforms[currentLayer]
    t.z = parseFloat(thick.value) || 0
    t.z2 = parseFloat(thick2.value) || 0
    renderLayers(layers, layerTransforms)
  }
}

function updateArtSize(){
  if(!currentLayer) return

  layerTransforms[currentLayer].w = artW.value
  layerTransforms[currentLayer].h = artH.value

  renderLayers(layers, layerTransforms)
}

function updateArtPosition(){
  if(!currentLayer) return

  layerTransforms[currentLayer].tx = parseFloat(artX.value) || 0
  layerTransforms[currentLayer].ty = parseFloat(artY.value) || 0

  renderLayers(layers, layerTransforms)
}

function updatePreviewScale(){
  if(!currentLayer || !previewScale) return

  layerTransforms[currentLayer].scale = parseFloat(previewScale.value) || 100

  renderLayers(layers, layerTransforms)
}

rotX.oninput = updateRotation
rotY.oninput = updateRotation

thick.oninput = updateThickness
thick2.oninput = updateThickness

if (artW) artW.oninput = updateArtSize
if (artH) artH.oninput = updateArtSize

if (artX) artX.oninput = updateArtPosition
if (artY) artY.oninput = updateArtPosition

artX.oninput = updateArtPosition
artY.oninput = updateArtPosition

if(previewScale){
  previewScale.oninput = updatePreviewScale
}

/* 2P FIX:
   camera orbit now rotates the actual rendered scene inside renderer.js,
   not the outside iframe/viewer card.
*/
orbit.oninput = () => {
  window.cameraOrbit = parseFloat(orbit.value) || 0
  viewer.style.transform = "none"
  renderLayers(layers, layerTransforms)
}

bgBtn.onclick = () => {
  if(!currentLayer) return

  let t = layerTransforms[currentLayer]
  t.bg = !t.bg

  bgBtn.classList.toggle("active", !t.bg)

  renderLayers(layers, layerTransforms)
}

toggleLayout.onclick=()=>{
  horizontal = !horizontal
  panel.classList.toggle("horizontal", horizontal)
  toggleLayout.classList.toggle("active", horizontal)
}

saveArt.onclick = () => {
  const fullHTML = buildExportHTML(layers, layerTransforms)

  const overlay = document.createElement("div")
  overlay.style.position = "fixed"
  overlay.style.inset = "0"
  overlay.style.background = "rgba(0,0,0,0.88)"
  overlay.style.zIndex = "9999"
  overlay.style.display = "flex"
  overlay.style.flexDirection = "column"
  overlay.style.padding = "16px"
  overlay.style.boxSizing = "border-box"

  const topBar = document.createElement("div")
  topBar.style.display = "flex"
  topBar.style.gap = "10px"
  topBar.style.marginBottom = "10px"

  const closeBtn = document.createElement("button")
  closeBtn.textContent = "Close"

  const copyBtn = document.createElement("button")
  copyBtn.textContent = "Copy"

  const downloadBtn = document.createElement("button")
  downloadBtn.textContent = "Download"

  const box = document.createElement("textarea")
  box.value = fullHTML
  box.style.flex = "1"
  box.style.width = "100%"
  box.style.background = "#07110d"
  box.style.color = "#d8ffe9"
  box.style.border = "1px solid #00a676"
  box.style.borderRadius = "10px"
  box.style.padding = "14px"
  box.style.fontFamily = "monospace"
  box.style.fontSize = "12px"
  box.style.resize = "none"
  box.style.outline = "none"

  closeBtn.onclick = () => overlay.remove()

  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(fullHTML)
    copyBtn.textContent = "Copied"
  }

  downloadBtn.onclick = () => {
    const blob = new Blob([fullHTML], { type: "text/html" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "saved-art.html"
    document.body.appendChild(a)
    a.click()
    a.remove()

    URL.revokeObjectURL(url)
  }

  topBar.appendChild(closeBtn)
  topBar.appendChild(copyBtn)
  topBar.appendChild(downloadBtn)

  overlay.appendChild(topBar)
  overlay.appendChild(box)

  document.body.appendChild(overlay)
}

document.getElementById("paste").onclick =
()=>paste().catch(()=>alert("paste blocked"))

document.getElementById("run").onclick = run
document.getElementById("clear").onclick = clearLayer
document.getElementById("stop").onclick = stop
