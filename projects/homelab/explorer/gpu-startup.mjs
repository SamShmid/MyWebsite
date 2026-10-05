// Test actual GPU access before choosing the image fallback, regardless of browser.
export async function initializeWebGPU(gpu, createRenderer) {
  if (!gpu) return { renderer: null, reason: 'unsupported' };
  const adapter = await gpu.requestAdapter();
  if (!adapter) return { renderer: null, reason: 'no-adapter' };
  const device = await adapter.requestDevice();
  let renderer;
  try {
    renderer = await createRenderer(device);
    await renderer.init();
    if (!renderer.backend.isWebGPUBackend) throw new Error('WebGPU renderer unavailable');
    return { renderer, reason: null };
  } catch (error) {
    renderer?.dispose();
    device.destroy();
    throw error;
  }
}
