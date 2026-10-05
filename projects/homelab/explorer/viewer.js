import { annotationEntries, instancesFor, toggleSelection, labelText } from './viewer-state.mjs?v=copy-7';
const $ = id => document.getElementById(id);
const host = $('canvas-host'), stage = $('stage'), area = $('model-area');
const params = new URLSearchParams(location.search);
const embedded = params.has('embed');
const capturing = params.has('capture');
document.body.classList.toggle('embedded',embedded);
document.body.classList.toggle('capture',capturing);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
$('rotation').checked = !reducedMotion.matches && !capturing;
const modes = ['overview','equipment','parts','hardware'];
const cameraNames = ['perspective','front','rear','side','top','joints','u2','u3','u4','u5','u6','u7','u9','u12','u15'];
let mode = modes.includes(params.get('mode')) ? params.get('mode') : 'overview';
let cameraName = cameraNames.includes(params.get('view')) ? params.get('view') : 'perspective';
let manifest, equipment, hardware, THREE, renderer, scene, camera, controls;
let parts = new Map(), instances = [], meshes = [], meshByInstance = new Map(), callouts = [];
let selected = null, gpuReady = false, staticRequested = params.has('static');
let frame = 0, visible = true, renderNeeded = true, lastTime = 0, transition = null, previousExplosion = 0;
const modeButtons = [...document.querySelectorAll('[data-mode]')];
const svgNS = 'http://www.w3.org/2000/svg';
const projectUrl = document.body.dataset.projectUrl;
if (projectUrl) {
  for (const link of document.querySelectorAll('a')) {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('downloads/')) link.href = `${projectUrl}${href.includes('#') ? href.slice(href.indexOf('#')) : '#downloads'}`;
    else if (href.startsWith('bom/')) link.href = `${projectUrl}#bom`;
    else if (link.id === 'step-download' || href.endsWith('.step')) { link.href = `${projectUrl}#assemblies`; link.removeAttribute('download'); }
    if (embedded && link.href.startsWith(new URL(projectUrl,location.href).href.split('#')[0])) link.target = '_top';
  }
}

function status(text) { $('renderer-status').textContent = text; $('renderer-status').classList.toggle('sr-only',text === 'WebGPU'); }
function imageView() {
  const showImage = !gpuReady || staticRequested;
  if (showImage && Number($('explode').value)) { $('explode').value = '0'; applyExplosion(); }
  const image = $('fallback-image');
  image.src = `assets/images/screenshots/${mode}/perspective.jpg`;
  image.alt = `${mode === 'hardware' ? 'Translucent fastener' : 'Three-quarter'} screenshot of the homelab rack.`;
  image.onerror = () => { image.onerror = null; image.src = 'assets/images/screenshots/overview/perspective.jpg'; image.alt = 'Three-quarter screenshot of the homelab rack.'; };
  $('image-view').hidden = !showImage; host.hidden = showImage;
  $('reset-camera').hidden = showImage;
  document.body.classList.toggle('static',showImage);
  document.querySelector('.explode-control').hidden = showImage;
  $('rotation').closest('label').hidden = showImage;
  $('explode').disabled = showImage; $('rotation').disabled = showImage;
  $('explode').title = showImage ? 'Explode is available in 3D view' : 'Explode the entire assembly';
  $('interaction-hint').textContent = showImage ? 'Image view' : 'Drag to orbit · Scroll to zoom';
  $('static-toggle').textContent = staticRequested ? '3D view' : 'Image view';
  $('static-toggle').hidden = !gpuReady;
  if (gpuReady) status(showImage ? 'Image view' : 'WebGPU');
  updateLayoutMode(); updateCallouts();
  if (showImage) { cancelAnimationFrame(frame); frame = 0; } else invalidate();
}
function updateLayoutMode() {
  area.classList.toggle('labels-list', area.clientWidth < 720 || host.hidden);
}
function setMode(next, fit = true) {
  mode = next; selected = null;
  modeButtons.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mode === mode)));
  if (fit) cameraPreset('perspective');
  else imageView();
  applySelection(); applyMaterials(); rebuildCallouts();
}
function applyMaterials() {
  const xray = mode === 'hardware';
  for (const mesh of meshes) {
    const alpha = xray && parts.get(mesh.userData.type).kind !== 'hardware' ? .10 : mesh.userData.baseOpacity;
    if (mesh.material.transparent !== (alpha < 1)) mesh.material.needsUpdate = true;
    mesh.material.opacity = alpha; mesh.material.transparent = alpha < 1; mesh.material.depthWrite = alpha === 1;
    mesh.renderOrder = xray && parts.get(mesh.userData.type).kind === 'hardware' ? 2 : 0;
  }
  invalidate();
}
function applySelection() {
  $('selection').hidden = !selected;
  if (selected) {
    const part = parts.get(selected.type), instance = instances.find(i => i.id === selected.instanceId);
    const count = instancesFor(selected.type, instances).length;
    $('selection-name').textContent = labelText(part, instance, count).title;
    $('selection-count').textContent = count > 1 ? `${count} matching` : '';
  } else {
    $('selection-name').textContent = ''; $('selection-count').textContent = '';
  }
  for (const mesh of meshes) {
    const highlight = selected?.type === mesh.userData.type;
    mesh.material.color.copy(mesh.userData.baseColor);
    if (highlight) mesh.material.color.lerp(new THREE.Color(0xffbb77),.32);
    mesh.material.emissive.set(highlight ? 0x71400e : 0x000000);
    mesh.material.emissiveIntensity = highlight ? .55 : 0;
  }
  invalidate();
}
function selectPart(type, instanceId) {
  if (type && !instanceId) instanceId = representative(instancesFor(type,instances)).id;
  selected = toggleSelection(selected,type,instanceId);
  applySelection(); rebuildCallouts();
}
function worldAnchor(instanceId) {
  const mesh = meshByInstance.get(instanceId);
  if (!mesh) return null;
  const anchor = parts.get(mesh.userData.type).anchor;
  return (anchor ? new THREE.Vector3(...anchor) : mesh.geometry.boundingBox.getCenter(new THREE.Vector3())).applyMatrix4(mesh.matrixWorld);
}
function representative(list) {
  if (!camera || !controls) return list[0];
  return [...list].sort((a,b) => {
    const score = i => worldAnchor(i.id)?.distanceTo(controls.target) ?? Infinity;
    return score(a)-score(b);
  })[0];
}
function rebuildCallouts() {
  // Recreate both ends together. Empty selections cannot leave orphan SVG lines.
  $('annotations').replaceChildren(); $('leaders').replaceChildren(); callouts = [];
  if (!manifest) return;
  if (scene) scene.updateMatrixWorld(true);
  const entries = annotationEntries(mode,selected,manifest,equipment,hardware,representative);
  for (const instance of entries) {
    const part = parts.get(instance.type), count = instancesFor(part.id,instances).length;
    const text = labelText(part,instance,count);
    const card = document.createElement('article'); card.className = 'callout';
    card.dataset.type = part.id; card.dataset.instance = instance.id; card.dataset.kind = part.kind || 'printed';
    card.classList.toggle('is-selected',selected?.type === part.id);
    const button = document.createElement('button'); button.className = 'label-select';
    button.setAttribute('aria-pressed',String(selected?.type === part.id));
    button.setAttribute('aria-label',`Select ${text.title}${count > 1 ? `, ${count} matching parts` : ''}`);
    const title = document.createElement('span'); title.className = 'label-title'; title.textContent = text.title; button.append(title);
    for (const line of text.lines) { const span = document.createElement('span'); span.className = 'label-spec'; span.textContent = line; button.append(span); }
    button.addEventListener('click',()=>selectPart(part.id,instance.id)); card.append(button);
    const link = document.createElement('a'); link.className = 'label-link'; link.href = text.href; link.textContent = text.link;
    if (projectUrl && part.kind !== 'equipment') { link.href = `${projectUrl}#${part.id}`; if (embedded) link.target = '_top'; }
    link.setAttribute('aria-label',`${text.link.replace(' ↗','')} for ${text.title}`);
    if (part.kind === 'equipment') { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    card.append(link); $('annotations').append(card);
    const path = document.createElementNS(svgNS,'path'), dot = document.createElementNS(svgNS,'circle');
    dot.setAttribute('r',selected?.type === part.id ? '4' : '3');
    for (const node of [path,dot]) { node.classList.toggle('is-selected',selected?.type === part.id); $('leaders').append(node); }
    callouts.push({instance,card,path,dot});
  }
  updateCallouts(); invalidate();
}
function projectInstance(instanceId) {
  const anchor = worldAnchor(instanceId);
  if (!anchor || !camera) return null;
  const point = anchor.project(camera), w = stage.clientWidth, h = stage.clientHeight;
  return {x:(point.x+1)*w/2,y:(1-point.y)*h/2,onScreen:point.z>-1 && point.z<1 && Math.abs(point.x)<1 && Math.abs(point.y)<1};
}
function updateCallouts() {
  const listMode = area.classList.contains('labels-list');
  $('leaders').style.display = callouts.length && !listMode ? 'block' : 'none';
  if (listMode || !camera) {
    for (const c of callouts) { c.path.removeAttribute('d'); c.dot.style.display='none'; }
    return;
  }
  const w=stage.clientWidth,h=stage.clientHeight,labelWidth=w>1100?228:w>880?192:166;
  const margin=18,gap=7,top=18,bottom=h-18;
  const columns=[[],[]];
  const positioned=callouts.map(c=>({...c,point:projectInstance(c.instance.id)})).filter(c=>c.point).sort((a,b)=>a.point.y-b.point.y);
  for (const c of positioned) {
    c.card.style.setProperty('--label-width',`${labelWidth}px`);
    let side=c.point.x<w/2?0:1;
    if (columns[side].length>columns[1-side].length || columns[side].length>=Math.ceil(positioned.length/2)) side=1-side;
    c.height=c.card.offsetHeight; c.side=side;
    c.y=Math.max(top,Math.min(bottom-c.height,c.point.y-c.height/2));columns[side].push(c);
  }
  for (const column of columns) {
    for (let i=1;i<column.length;i++) column[i].y=Math.max(column[i].y,column[i-1].y+column[i-1].height+gap);
    for (let i=column.length-1;i>=0;i--) column[i].y=Math.min(column[i].y,i===column.length-1?bottom-column[i].height:column[i+1].y-gap-column[i].height);
    for (const c of column) {
      const x=c.side===0?margin:w-margin-labelWidth;
      c.card.style.left=`${x}px`;c.card.style.top=`${c.y}px`;
      c.card.classList.toggle('is-offscreen',!c.point.onScreen);
      c.path.style.display=c.dot.style.display=c.point.onScreen?'':'none';
      if (!c.point.onScreen) { c.path.removeAttribute('d'); continue; }
      const endX=c.side===0?x+labelWidth:x,endY=c.y+c.height/2;
      c.path.setAttribute('d',`M ${c.point.x} ${c.point.y} L ${endX+(c.side===0?12:-12)} ${endY} L ${endX} ${endY}`);
      c.dot.setAttribute('cx',c.point.x);c.dot.setAttribute('cy',c.point.y);
    }
  }
}
function cameraPreset(name,immediate=false) {
  cameraName=name;
  if (!camera) { imageView(); return; }
  const joints=name==='joints';
  const occupied=manifest.rackDatum.occupied.find(item=>name===`u${item.fromTop}`||(joints&&item.fromTop===15));
  const closeup=Boolean(occupied),target=new THREE.Vector3(0,closeup?occupied.centerY:manifest.height*.49,joints?-95:closeup?65:0);
  const directions={perspective:[.9,.35,1.5],front:[0,.015,1],rear:[0,.015,-1],side:[1,.015,0],top:[0,1,.001]};
  const labelSpace=!capturing && mode!=='overview' && stage.clientWidth>=720?400:0;
  const aspect=(host.clientWidth-labelSpace)/host.clientHeight||.9;
  const fitHeight=closeup?220:manifest.height*(name==='top'?.68:1.23);
  const fitWidth=(closeup?325:name==='perspective'?450:340)/aspect*1.12;
  const distance=Math.max(fitHeight,fitWidth)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*(1+Number($('explode').value)*.0035);
  const position=target.clone().add(new THREE.Vector3(...(joints?[.65,.55,-1.5]:closeup?[.65,.65,1.5]:directions[name])).normalize().multiplyScalar(distance));
  controls.autoRotate=$('rotation').checked;
  if (immediate||reducedMotion.matches||capturing) { camera.position.copy(position);controls.target.copy(target);controls.update(); }
  else transition={from:camera.position.clone(),to:position,targetFrom:controls.target.clone(),targetTo:target,start:performance.now()};
  imageView();invalidate();
}
function applyExplosion() {
  const amount=Number($('explode').value)/100;$('explode-value').value=`${Math.round(amount*100)}%`;
  $('explode').setAttribute('aria-valuetext',`${Math.round(amount*100)}% exploded`);
  if (camera&&controls) { transition=null;camera.position.sub(controls.target).multiplyScalar((1+.35*amount)/(1+.35*previousExplosion)).add(controls.target); }
  previousExplosion=amount;
  for (const mesh of meshes) mesh.position.copy(mesh.userData.basePosition).addScaledVector(mesh.userData.explodeVector,amount);
  invalidate();
}
function invalidate() {
  renderNeeded=true;
  if (!frame&&gpuReady&&!host.hidden&&visible&&!document.hidden) frame=requestAnimationFrame(renderFrame);
}
function renderFrame(time) {
  frame=0;if (!gpuReady||host.hidden||!visible||document.hidden) return;
  const delta=Math.min((time-lastTime)/1000||.016,.05);lastTime=time;
  if (transition) {
    const t=Math.min((time-transition.start)/650,1),eased=t*t*(3-2*t);
    camera.position.lerpVectors(transition.from,transition.to,eased);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,eased);
    if (t===1) transition=null;renderNeeded=true;
  }
  const changed=controls.update(delta);
  if (changed||renderNeeded||controls.autoRotate) { scene.updateMatrixWorld(true);renderer.render(scene,camera);updateCallouts();renderNeeded=false; }
  if (!frame&&(changed||transition||controls.autoRotate)) frame=requestAnimationFrame(renderFrame);
}
async function startGPU() {
  if (staticRequested) { status('Image view');imageView();return; }
  if (document.body.hasAttribute('data-local-models')) {
    // Restricted source meshes are retained only in the local authoring copy.
    const localAssets = await fetch('./local-models.json').catch(()=>null);
    if (!localAssets?.ok) { status('Image view');imageView();return; }
  }
  if (!navigator.gpu||!await navigator.gpu.requestAdapter()) { status('Image view');imageView();return; }
  THREE=await import('three/webgpu');
  const [{OrbitControls},{STLLoader}]=await Promise.all([import('./vendor/OrbitControls.js'),import('./vendor/STLLoader.js')]);
  renderer=new THREE.WebGPURenderer({antialias:true,alpha:true});await renderer.init();
  if (!renderer.backend.isWebGPUBackend) throw new Error('WebGPU backend unavailable');
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
  host.append(renderer.domElement);scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xe4efff,0x48505b,2.1));
  for (const [color,intensity,position] of [[0xffeed9,3.5,[-500,1000,700]],[0xb8d9ff,2.4,[550,500,-500]],[0xffffff,1.2,[250,250,850]]]) {
    const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);scene.add(light);
  }
  const rack=new THREE.Group();scene.add(rack);
  const loader=new STLLoader(),geometries=new Map();
  const files=[...new Set([...parts.values()].flatMap(p=>p.meshes?p.meshes.map(m=>m.file):[p.file]))];
  await Promise.all(files.map(async file=>{const geometry=await loader.loadAsync(file);geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.set(file,geometry);}));
  for (const instance of instances) {
    const part=parts.get(instance.type);
    for (const component of part.meshes||[{file:part.file,color:0x252930,roughness:.76,metalness:.09}]) {
      const opacity=component.opacity??1;
      const material=new THREE.MeshStandardMaterial({color:component.color,roughness:component.roughness,metalness:component.metalness,opacity,transparent:opacity<1,depthWrite:opacity===1});
      const mesh=new THREE.Mesh(geometries.get(component.file),material);
      mesh.applyMatrix4(new THREE.Matrix4().fromArray(instance.matrix));
      mesh.userData={...instance,baseOpacity:opacity,baseColor:material.color.clone(),basePosition:mesh.position.clone(),explodeVector:new THREE.Vector3(...instance.explode)};
      rack.add(mesh);meshes.push(mesh);if (!meshByInstance.has(instance.id)) meshByInstance.set(instance.id,mesh);
    }
  }
  const grid=new THREE.GridHelper(1200,24,0x465972,0x33445c);grid.position.y=-1;grid.material.transparent=true;grid.material.opacity=.14;scene.add(grid);
  camera=new THREE.PerspectiveCamera(32,1,1,8000);controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=180;controls.maxDistance=3200;controls.autoRotateSpeed=.55;controls.maxPolarAngle=Math.PI*.95;
  controls.addEventListener('change',invalidate);controls.addEventListener('start',()=>{transition=null;});
  gpuReady=true;imageView();
  const resize=()=>{updateLayoutMode();const {width,height}=host.getBoundingClientRect();if (width<1||height<1) return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();invalidate();};
  new ResizeObserver(resize).observe(stage);resize();cameraPreset(cameraName,true);
  const raycaster=new THREE.Raycaster();let down;
  renderer.domElement.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY,button:event.button};});
  renderer.domElement.addEventListener('pointerup',event=>{
    if (!down||down.button!==0||Math.hypot(event.clientX-down.x,event.clientY-down.y)>5) return;
    down=null;const box=renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1),camera);
    const hits=raycaster.intersectObjects(meshes,false);
    const hit=mode==='hardware' ? hits.find(h=>parts.get(h.object.userData.type).kind==='hardware')||hits[0] : hits[0];
    selectPart(hit?.object.userData.type,hit?.object.userData.id);
  });
  host.addEventListener('keydown',event=>{
    if (event.key.toLowerCase()==='r') cameraPreset('perspective');
    if (event.key==='+'||event.key==='-') {event.preventDefault();camera.position.sub(controls.target).multiplyScalar(event.key==='+'?.9:1.1).add(controls.target);invalidate();}
  });
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if (visible) invalidate();else {cancelAnimationFrame(frame);frame=0;}},{threshold:0}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if (!document.hidden) invalidate();else {cancelAnimationFrame(frame);frame=0;}});
  renderer.onDeviceLost=()=>{gpuReady=false;renderer.dispose();status('Image view');imageView();rebuildCallouts();};
  scene.updateMatrixWorld(true);status('WebGPU');invalidate();
}

modeButtons.forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
$('reset-camera').addEventListener('click',()=>cameraPreset('perspective'));
$('clear-selection').addEventListener('click',()=>selectPart(null));
$('explode').addEventListener('input',applyExplosion);
$('rotation').addEventListener('change',()=>{if (controls) {controls.autoRotate=$('rotation').checked;invalidate();}});
$('static-toggle').addEventListener('click',()=>{staticRequested=!staticRequested;imageView();});
document.addEventListener('keydown',event=>{if (event.key==='Escape') {selectPart(null);document.querySelector('.model-options').open=false;}});
window.addEventListener('resize',()=>{if (host.hidden) imageView();else {updateLayoutMode();updateCallouts();}});
if (embedded && parent !== window) {
  new ResizeObserver(()=>parent.postMessage({type:'homelab:height',height:Math.ceil($('explorer').getBoundingClientRect().height)},location.origin)).observe($('explorer'));
}
reducedMotion.addEventListener('change',()=>{if (reducedMotion.matches) {$('rotation').checked=false;if (controls) controls.autoRotate=false;}});
try {
  const responses=await Promise.all(['assembly','equipment','hardware'].map(file=>fetch(`./${file}.json`)));
  if (responses.some(response=>!response.ok)) throw new Error('Assembly data unavailable');
  [manifest,equipment,hardware]=await Promise.all(responses.map(response=>response.json()));
  // Only the installed open rack is part of this viewer and its labels.
  manifest.instances=manifest.instances.filter(i=>!i.optional);
  manifest.parts=manifest.parts.filter(p=>manifest.instances.some(i=>i.type===p.id));
  parts=new Map([...manifest.parts,...equipment.parts,...hardware.parts].map(part=>[part.id,part]));
  instances=[...manifest.instances,...equipment.instances,...hardware.instances];
  $('step-download').href=projectUrl ? `${projectUrl}#assemblies` : manifest.downloads.step;
  if (!projectUrl) $('step-download').download='';
  $('step-download').removeAttribute('aria-disabled');
  await startGPU();setMode(mode,false);
} catch(error) {
  console.error('Rack preview',error);gpuReady=false;if (renderer) renderer.dispose();status('Image view');imageView();
  if (manifest&&equipment&&hardware) rebuildCallouts();
} finally { $('load-status').hidden=true; }
