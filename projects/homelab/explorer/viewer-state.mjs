// Selection is independent of the label mode. Repeated parts share a type.
export const instancesFor = (type, instances) => instances.filter(item => item.type === type && !item.optional);
export function toggleSelection(current, type, instanceId) {
  return !type || (current?.type === type && current.instanceId === instanceId) ? null : { type, instanceId };
}

const componentTypes = new Set(['poe-hat-f', 'crucial-1tb', 'yellow-ssd']);
export function annotationEntries(mode, selected, assembly, equipment, hardware, representative = list => list[0]) {
  const all = [...assembly.instances, ...equipment.instances, ...hardware.instances].filter(i => !i.optional);
  let entries = [];
  if (mode === 'equipment' || mode === 'parts' || mode === 'hardware') {
    const document = mode === 'equipment' ? equipment : mode === 'parts' ? assembly : hardware;
    entries = document.parts.flatMap(p => {
      if (mode === 'equipment' && componentTypes.has(p.id)) return [];
      const instances = instancesFor(p.id, all);
      if (!instances.length) return [];
      return [selected?.type === p.id ? all.find(i => i.id === selected.instanceId) : representative(instances)];
    });
  }
  if (selected && !entries.some(i => i.id === selected.instanceId)) {
    const clicked = all.find(i => i.id === selected.instanceId);
    if (clicked) entries.push(clicked);
  }
  return entries;
}

const printedNames = {
  post:'5U post', joiner:'Post joiner', vent:'Top crossbar', bottom:'Bottom crossbar', edge:'Side frame edge',
  handle:'Handle', foot:'Foot', floor:'Bottom panel', 'pi-shelf':'Triple Pi shelf', 'switch-mount':'TP-Link mount',
  'zima-mount':'ZimaBoard panel', 'ssd-caddy':'SSD caddy', 'netgear-mount':'Netgear mount',
  'home-assistant-yellow-mount':'Yellow holder', 'keystone-panel':'Half-U keystone panel',
  'minisforum-mini-pc-holder':'Minisforum holder', 'base-shelf':'Jetson shelf',
  'shelf-support-left':'Rear support · left', 'shelf-support-right':'Rear support · right'
};
export function labelText(part, instance, quantity) {
  const s = part.specs;
  if (!part.kind) return { title: printedNames[part.id] || part.name, lines:[`${quantity} installed`], href:`downloads/#${part.id}`, link:'STL ↗' };
  if (part.kind === 'hardware') return { title:part.name, lines:[`${quantity} installed · ${part.material}`], href:`bom/#${part.id}`, link:'Parts ↗' };
  let title = part.name, lines;
  switch (part.id) {
    case 'pi5': title = `${quantity} × Raspberry Pi 5`; lines = ['16 GB RAM each', 'Waveshare PoE HAT on each']; break;
    case 'poe-hat-f': lines = ['PoE HAT (F) · Active cooling']; break;
    case 'tl-sg1005p': lines = ['5 × Gigabit · 4 PoE ports']; break;
    case 'zimaboard2': lines = ['Stock CPU cooler', '2 × Crucial 1 TB SATA SSDs']; break;
    case 'crucial-1tb': lines = ['1 TB · 2.5-inch SATA SSD']; break;
    case 'netgear-gs308': lines = ['8 × Gigabit · Unmanaged']; break;
    case 'home-assistant-yellow': lines = [`Compute Module 5 · ${s.ramGB} GB RAM`,`${s.storage.capacityTB} TB NVMe`]; break;
    case 'yellow-ssd': lines = ['1 TB · M.2 NVMe']; break;
    case 'minisforum-ms-a2':
    case 'minisforum-ms-01':
      lines = [`${s.cpu.model.replace('AMD ','').replace('Intel Core ','')} · ${s.memory.capacityGB} GB · ${s.storage.capacityTB} TB`,`${s.gpu.model.replace('NVIDIA ','').replace(' Generation','')} · ${s.gpu.vramGB} GB`]; break;
    case 'jetson-orin-nano': lines = [`${s.memory.capacityGB} GB LPDDR5 · Ampere GPU`,'6-core Arm CPU']; break;
    default: lines = [];
  }
  return {title, lines, href:part.sourceUrl, link:'Details ↗'};
}
