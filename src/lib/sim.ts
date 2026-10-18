// Shared stepper wiring for <SimShell stepper>. A sim describes its steps; the shell's buttons drive it.
//   mountStepper(root, { steps: [{ caption: 'what just happened' , ...anything }], render: (step, i) => void })
// `root` is the [data-sim-root] element. No framework, no backend; works on static GitHub Pages.
export interface StepperOptions<S extends { caption: string }> {
  steps: S[];
  render: (step: S, index: number) => void;
  intervalMs?: number;
}

export function mountStepper<S extends { caption: string }>(root: HTMLElement, opts: StepperOptions<S>) {
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const prev = $<HTMLButtonElement>('[data-sim-prev]');
  const next = $<HTMLButtonElement>('[data-sim-next]');
  const play = $<HTMLButtonElement>('[data-sim-play]');
  const reset = $<HTMLButtonElement>('[data-sim-reset]');
  const count = $<HTMLElement>('[data-sim-count]');
  const caption = $<HTMLElement>('[data-sim-caption]');
  let i = 0;
  let timer: number | undefined;
  const stop = () => { if (timer !== undefined) { clearInterval(timer); timer = undefined; } play.setAttribute('aria-pressed', 'false'); play.textContent = '▶ Play'; };
  const show = () => {
    const step = opts.steps[i];
    opts.render(step, i);
    caption.textContent = step.caption;
    count.textContent = `Step ${i + 1} of ${opts.steps.length}`;
    prev.disabled = i === 0;
    next.disabled = i === opts.steps.length - 1;
    if (i === opts.steps.length - 1) stop();
  };
  prev.addEventListener('click', () => { stop(); if (i > 0) { i--; show(); } });
  next.addEventListener('click', () => { stop(); if (i < opts.steps.length - 1) { i++; show(); } });
  reset.addEventListener('click', () => { stop(); i = 0; show(); });
  play.addEventListener('click', () => {
    if (timer !== undefined) return stop();
    if (i === opts.steps.length - 1) i = 0;
    show();
    play.setAttribute('aria-pressed', 'true');
    play.textContent = '⏸ Pause';
    timer = window.setInterval(() => { if (i < opts.steps.length - 1) { i++; show(); } else stop(); }, opts.intervalMs ?? 1600);
  });
  show();
}

// Small helpers shared by sims.
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const fmt = (n: number) => n.toLocaleString('en-US');
