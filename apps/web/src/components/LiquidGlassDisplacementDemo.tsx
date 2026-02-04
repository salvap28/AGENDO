'use client';

import { useEffect } from 'react';
import { Pane } from 'tweakpane';
import { gsap, Draggable } from 'gsap/all';

type PresetKey = 'dock' | 'pill' | 'bubble' | 'free';

type Config = {
  icons: boolean;
  scale: number;
  radius: number;
  border: number;
  lightness: number;
  displace: number;
  blend: string;
  x: 'R' | 'G' | 'B';
  y: 'R' | 'G' | 'B';
  alpha: number;
  blur: number;
  r: number;
  g: number;
  b: number;
  saturation: number;
  width: number;
  height: number;
  frost: number;
  theme: 'system' | 'light' | 'dark';
  debug: boolean;
  top: boolean;
  preset: PresetKey;
  size?: number;
};

const blendOptions = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
] as const;

export default function LiquidGlassDisplacementDemo() {
  useEffect(() => {
    gsap.registerPlugin(Draggable);

    const body = document.body;
    body.classList.add('liquid-glass-demo');

    const root = document.documentElement;
    const previousDataset = {
      icons: root.dataset.icons,
      mode: root.dataset.mode,
      top: root.dataset.top,
      debug: root.dataset.debug,
      theme: root.dataset.theme,
    };
    const previousVars = {
      size: root.style.getPropertyValue('--size'),
      width: root.style.getPropertyValue('--width'),
      height: root.style.getPropertyValue('--height'),
      radius: root.style.getPropertyValue('--radius'),
      frost: root.style.getPropertyValue('--frost'),
      outputBlur: root.style.getPropertyValue('--output-blur'),
      saturation: root.style.getPropertyValue('--saturation'),
    };

    const effect = document.querySelector<HTMLElement>('.liquid-glass-demo .effect');
    const placeholder = document.querySelector<HTMLElement>('.liquid-glass-demo .dock-placeholder');
    const filter = document.querySelector<SVGSVGElement>('.liquid-glass-demo .filter');
    const debugPen = document.querySelector<HTMLElement>('.liquid-glass-demo .displacement-debug');

    if (!effect || !placeholder || !filter || !debugPen) {
      body.classList.remove('liquid-glass-demo');
      return;
    }

    const displacementMaps = filter.querySelectorAll('feDisplacementMap');
    const redChannel = filter.querySelector('#redchannel');
    const greenChannel = filter.querySelector('#greenchannel');
    const blueChannel = filter.querySelector('#bluechannel');
    const feImage = filter.querySelector('feImage');
    const blurNode = filter.querySelector('feGaussianBlur');

    const base = {
      icons: false,
      scale: -180,
      radius: 16,
      border: 0.07,
      lightness: 50,
      displace: 0,
      blend: 'difference',
      x: 'R' as const,
      y: 'B' as const,
      alpha: 0.93,
      blur: 11,
      r: 0,
      g: 10,
      b: 20,
      saturation: 1,
    };

    const presets: Record<PresetKey, Partial<Config>> = {
      dock: {
        ...base,
        icons: true,
        width: 336,
        height: 96,
        radius: 16,
        displace: 0.2,
        frost: 0.45,
      },
      pill: {
        ...base,
        width: 320,
        height: 120,
        radius: 60,
        displace: 2,
        frost: 0.1,
      },
      bubble: {
        ...base,
        width: 240,
        height: 240,
        radius: 120,
        scale: -200,
        border: 0.15,
        frost: 0.1,
        displace: 0,
        alpha: 0.98,
      },
      free: {
        ...base,
        width: 336,
        height: 150,
        displace: 0,
        frost: 0.1,
        border: 0.15,
        alpha: 0.98,
      },
    };

    const config: Config = {
      ...(presets.dock as Config),
      theme: 'system',
      debug: false,
      top: false,
      preset: 'dock',
    };

    const ctrl = new Pane({ title: 'config', expanded: true }) as any;

    const buildDisplacementImage = () => {
      const border = Math.min(config.width, config.height) * (config.border * 0.5);
      const kids = `
        <svg class="displacement-image" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}">
          <defs>
            <linearGradient id="red" x1="1" x2="0">
              <stop offset="0%" stop-color="#000" />
              <stop offset="100%" stop-color="red" />
            </linearGradient>
            <linearGradient id="blue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#000" />
              <stop offset="100%" stop-color="blue" />
            </linearGradient>
          </defs>
          <rect width="${config.width}" height="${config.height}" fill="#000" />
          <rect width="${config.width}" height="${config.height}" rx="${config.radius}" fill="url(#red)" />
          <rect width="${config.width}" height="${config.height}" rx="${config.radius}" fill="url(#blue)" style="mix-blend-mode:${config.blend};" />
          <rect
            x="${border}"
            y="${border}"
            width="${config.width - (border * 2)}"
            height="${config.height - (border * 2)}"
            rx="${config.radius}"
            fill="hsl(0 0% ${config.lightness}% / ${config.alpha})"
            style="filter:blur(${config.blur}px)"
          />
        </svg>
        <div class="label">
          <span>displacement image</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 832 833" aria-hidden="true">
            <path
              d="M551.454 543.824c20.811 0 36.966-6.724 49.288-19.052c6.373-6.366 10.661-14.451 10.661-23.433c0-19.554-14.951-32.632-39.11-32.632c-31.377 0-58.528 27.15-58.528 58.52c0 24.16 13.078 39.111 32.632 39.111c8.982 0 17.067-4.288 23.433-10.661c12.328-12.322 19.052-28.477 19.052-49.288c0-41.781-23.59-81.612-59.703-117.719C482.921 342.42 423.835 310 348.806 310c-76.728 0-127.869 27.903-193.868 81.608c-46.763 38.273-81.979 56.227-110.931 56.227c-11.357 0-22.188-2.73-31.553-7.906c-8.266-4.454-12.322-10.827-12.322-19.054c0-16.438 15.553-31.959 39.273-31.959c25.52 0 48.666 6.877 68.074 20.247c17.118 11.723 26.58 19.109 44.167 19.109c23.749 0 39.264-15.517 39.264-39.273c0-15.511-6.558-30.581-19.009-44.798C150.211 324.458 95.417 304 41.755 304C14.379 304 0 318.542 0 346.15c0 17.329 7.5 34.39 20.614 46.877c25.81 24.602 69.438 36.171 122.425 36.171c82.14 0 116.79-60.037 206.393-60.037c59.154 0 97.773 21.16 134.116 57.49c30.837 30.836 49.048 70.671 49.048 117.173c0 6.603-2.341 8.945-8.946 8.945ZM586.253 724.668c74.494 0 121.334-27.838 195.493-81.595c46.761-38.272 82.155-56.228 111.106-56.228c11.357 0 21.839 2.727 31.379 7.91c8.266 4.453 12.317 10.823 12.317 19.049c0 16.442-15.373 31.959-39.264 31.959c-25.521 0-48.666-6.876-68.07-20.243c-17.118-11.728-26.576-19.109-44.167-19.109c-23.754 0-39.269 15.511-39.269 39.269c0 15.515 6.563 30.585 19.01 44.802c31.692 36.169 86.485 56.629 140.147 56.629c27.372 0 41.751-14.542 41.751-42.15c0-17.329-7.5-34.394-20.613-46.881c-25.807-24.602-69.439-36.171-122.425-36.171c-82.137 0-117.26 60.039-206.567 60.039c-59.15 0-97.6-21.162-133.941-57.491c-30.839-30.835-48.875-70.667-48.875-117.173c0-6.604 2.341-8.95 8.941-8.95h22.731c20.81 0 36.961 6.729 49.288 19.051c6.366 6.37 10.654 14.451 10.654 23.433c0 19.554-15.119 32.632-39.106 32.632c-31.377 0-58.528-27.15-58.528-58.52c0-24.16 13.078-39.11 32.632-39.11c8.982 0 17.067 4.287 23.433 10.661c12.322 12.322 19.052 28.477 19.052 49.288c0 41.781-23.765 81.608-59.703 117.715c-46.088 46.263-105.524 78.674-180.373 78.674c-28.56 0-47.951-21.125-47.951-51.775c0-28.203 19.739-48.642 47.951-48.642Z"
              fill="currentColor"
            />
          </svg>
        </div>
      `;

      debugPen.innerHTML = kids;
      const svgEl = debugPen.querySelector<SVGSVGElement>('.displacement-image');
      if (!svgEl || !feImage) return;
      const serialized = new XMLSerializer().serializeToString(svgEl);
      const encoded = encodeURIComponent(serialized);
      gsap.set(feImage, { attr: { href: `data:image/svg+xml;utf8,${encoded}` } });
    };

    const update = () => {
      buildDisplacementImage();
      root.style.setProperty('--size', String(config.size));
      gsap.set(root, {
        '--width': config.width,
        '--height': config.height,
        '--radius': config.radius,
        '--frost': config.frost,
        '--output-blur': config.displace,
        '--saturation': config.saturation,
      });
      root.dataset.icons = `${config.icons}`;
      root.dataset.mode = config.preset;
      root.dataset.top = `${config.top}`;
      root.dataset.debug = `${config.debug}`;
      root.dataset.theme = config.theme;
      if (displacementMaps.length) {
        gsap.set(displacementMaps, {
          attr: {
            scale: config.scale,
            xChannelSelector: config.x,
            yChannelSelector: config.y,
          },
        });
      }
      if (redChannel) {
        gsap.set(redChannel, { attr: { scale: config.scale + config.r } });
      }
      if (greenChannel) {
        gsap.set(greenChannel, { attr: { scale: config.scale + config.g } });
      }
      if (blueChannel) {
        gsap.set(blueChannel, { attr: { scale: config.scale + config.b } });
      }
      if (blurNode) {
        gsap.set(blurNode, { attr: { stdDeviation: config.displace } });
      }
    };

    const sync = (event?: any) => {
      const label = event?.target?.controller?.view?.labelElement?.innerText;
      const startViewTransition = (document as Document & { startViewTransition?: (cb: () => void) => void })
        .startViewTransition;
      if (!startViewTransition || (label !== 'theme' && label !== 'top')) {
        update();
        return;
      }
      startViewTransition(() => update());
    };

    ctrl.addBinding(config, 'debug');
    ctrl.addBinding(config, 'top');

    ctrl
      .addBinding(config, 'preset', {
        label: 'mode',
        options: {
          dock: 'dock',
          pill: 'pill',
          bubble: 'bubble',
          free: 'free',
        },
      })
      .on('change', () => {
        document.documentElement.dataset.mode = config.preset;
        settings.expanded = config.preset === 'free';
        settings.disabled = config.preset !== 'free';
        if (config.preset !== 'free') {
          const values = presets[config.preset];
          document.documentElement.dataset.icons = `${values.icons}`;
          if (morph) morph.kill();
          const timeline = gsap.timeline({ onUpdate: () => ctrl.refresh() });
          morph = timeline;
          Object.entries(values).forEach(([key, value]) => {
            timeline.to(config, { [key]: value }, 0);
          });
        }
      });

    ctrl.addBinding(config, 'theme', {
      options: {
        system: 'system',
        light: 'light',
        dark: 'dark',
      },
    });

    const settings = ctrl.addFolder({ title: 'settings', expanded: false });
    settings.addBinding(config, 'frost', { min: 0, max: 0.5, step: 0.01 });
    settings.addBinding(config, 'saturation', { min: 0, max: 4, step: 0.1 });
    settings.addBinding(config, 'icons');
    settings.addBinding(config, 'width', { min: 100, max: 600, step: 1 });
    settings.addBinding(config, 'height', { min: 40, max: 400, step: 1 });
    settings.addBinding(config, 'radius', { min: 0, max: 300, step: 1 });
    settings.addBinding(config, 'border', { min: 0, max: 1, step: 0.01 });
    settings.addBinding(config, 'alpha', { min: 0, max: 1, step: 0.01 });
    settings.addBinding(config, 'lightness', { min: 0, max: 100, step: 1 });
    settings.addBinding(config, 'blur', { min: 0, max: 20, step: 0.5 });
    settings.addBinding(config, 'displace', { min: 0, max: 12, step: 1 });
    settings.addBinding(config, 'x', { options: { R: 'R', G: 'G', B: 'B' } });
    settings.addBinding(config, 'y', { options: { R: 'R', G: 'G', B: 'B' } });
    settings.addBinding(config, 'blend', {
      options: blendOptions.reduce<Record<string, string>>((acc, entry) => {
        acc[entry] = entry;
        return acc;
      }, {}),
    });
    settings.addBinding(config, 'scale', { min: -1000, max: 1000, step: 1 });

    const chromatic = settings.addFolder({ title: 'chromatic' });
    chromatic.addBinding(config, 'r', { min: -100, max: 100, step: 1 });
    chromatic.addBinding(config, 'g', { min: -100, max: 100, step: 1 });
    chromatic.addBinding(config, 'b', { min: -100, max: 100, step: 1 });

    let morph: gsap.core.Timeline | null = null;
    const draggableInstances = Draggable.create(effect, { type: 'x,y' });

    ctrl.on('change', sync);
    update();

    const { top, left } = placeholder.getBoundingClientRect();
    gsap.set(effect, {
      top: top > window.innerHeight ? window.innerHeight * 0.5 : top,
      left,
      opacity: 1,
    });

    return () => {
      draggableInstances.forEach((instance: { kill: () => void }) => instance.kill());
      ctrl.dispose();
      body.classList.remove('liquid-glass-demo');
      if (debugPen) {
        debugPen.innerHTML = '';
      }
      const restoreData = (key: string, value?: string) => {
        if (!value) {
          delete root.dataset[key as keyof DOMStringMap];
          return;
        }
        root.dataset[key as keyof DOMStringMap] = value;
      };
      restoreData('icons', previousDataset.icons);
      restoreData('mode', previousDataset.mode);
      restoreData('top', previousDataset.top);
      restoreData('debug', previousDataset.debug);
      restoreData('theme', previousDataset.theme);

      const restoreVar = (name: string, value: string) => {
        if (!value) {
          root.style.removeProperty(name);
          return;
        }
        root.style.setProperty(name, value);
      };
      restoreVar('--size', previousVars.size);
      restoreVar('--width', previousVars.width);
      restoreVar('--height', previousVars.height);
      restoreVar('--radius', previousVars.radius);
      restoreVar('--frost', previousVars.frost);
      restoreVar('--output-blur', previousVars.outputBlur);
      restoreVar('--saturation', previousVars.saturation);
    };
  }, []);

  return (
    <div className="liquid-glass-demo">
      <header>
        <h1 className="fluid">
          glass
          <br />
          displacement
        </h1>
        <p className="fluid">
          it&apos;s not perfect, but neither is the platform.
          <br />
          we love it anyway.
        </p>
      </header>

      <div className="effect">
        <div className="nav-wrap">
          <nav>
            <img src="https://assets.codepen.io/605876/finder.png" alt="" />
            <img src="https://assets.codepen.io/605876/launch-control.png" alt="" />
            <img src="https://assets.codepen.io/605876/safari.png" alt="" />
            <img src="https://assets.codepen.io/605876/calendar.png" alt="" />
          </nav>
        </div>
        <svg className="filter" viewBox="0 0 1 1" aria-hidden="true">
          <defs>
            <filter id="filter" colorInterpolationFilters="sRGB">
              <feImage x="0" y="0" width="1" height="1" result="map" />
              <feDisplacementMap id="redchannel" in="SourceGraphic" in2="map" scale="1" xChannelSelector="R" yChannelSelector="G" result="redchannel" />
              <feColorMatrix
                in="redchannel"
                type="matrix"
                values="1 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
                result="red"
              />
              <feDisplacementMap id="greenchannel" in="SourceGraphic" in2="map" scale="1" xChannelSelector="R" yChannelSelector="G" result="greenchannel" />
              <feColorMatrix
                in="greenchannel"
                type="matrix"
                values="0 0 0 0 0
                        0 1 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
                result="green"
              />
              <feDisplacementMap id="bluechannel" in="SourceGraphic" in2="map" scale="1" xChannelSelector="R" yChannelSelector="G" result="bluechannel" />
              <feColorMatrix
                in="bluechannel"
                type="matrix"
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 1 0 0
                        0 0 0 1 0"
                result="blue"
              />
              <feBlend in="red" in2="green" mode="screen" result="blendRG" />
              <feBlend in="blendRG" in2="blue" mode="screen" result="blendRGB" />
              <feGaussianBlur in="blendRGB" stdDeviation="0.5" />
            </filter>
          </defs>
        </svg>
        <div className="displacement-debug" aria-hidden="true" />
      </div>

      <main>
        <section className="placeholder">
          <div className="dock-placeholder" />
          <span className="arrow arrow--debug">
            <span>drag, scroll, configure</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 232" aria-hidden="true">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M146.669 85.786c-1.553-10.172 1.098-20.242 5.201-29.586 8.571-19.524 24.613-34.993 42.664-45.387 1.531-.881.109-3.112-1.415-2.235-18.553 10.682-35.256 26.498-44.088 46.626-4.161 9.481-6.957 19.855-5.381 30.166.202 1.323.419 2.642.719 3.945.3 1.307.617 2.645 1.287 3.815.674 1.178 1.683 2.068 3.123 2.021 1.239-.04 2.662-1.048 2.79-2.412.138-1.476-.793-2.583-1.438-3.832-.632-1.225-.85-2.719-1.062-4.056Z"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M165.877 87.364c1.975-7.767-2.215-16.175-9.476-19.516-6.73-3.097-14.906-1.609-20.295 2.861-6.079 5.043-8.862 13.433-7.697 21.089.134.882 1.246 1.219 1.815.738 7.15-6.039 15.685-9.622 25.108-10.847 2.435-.316 4.894-.429 7.35-.361.842.023 1.771.049 2.616.195.398.068.776.17 1.17.256.242.053.654.206.127.068-.575-.151-1.181-.591-1.32-1.206-.139-.616.127-1.25.596-1.666.189-.168.888-.288.203-.189-.454.065-.2-.159.067.012.267.171.244.042.174.194a4.724 4.724 0 0 1-.104.23l-.292.678c-.157.412.066-.127.101-.247a10.94 10.94 0 0 1-.141.434c-.074.211-.15.422-.231.631-.599 1.559-.974 3.098-1.399 4.718-.239.912-.056 1.833.873 2.264.79.366 1.789-.003 2.029-.95Z"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M50.173 106.116c3.127-4.227 4.832-9.32 4.858-14.579.027-5.259-1.625-10.369-4.71-14.627-1.087-1.501-3.69-.046-2.588 1.476 2.819 3.89 4.33 8.563 4.305 13.365-.024 4.8-1.584 9.46-4.437 13.319-1.092 1.477 1.49 2.53 2.572 1.066Z"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M178.029 20.076c.273 3.58.989 7.074 2.49 10.355.641 1.4 1.498 2.642 2.748 3.546 1.192.862 2.707 1.668 4.226 1.472 2.418-.312 3.384-2.749 2.689-4.885-.395-1.211-1.283-2.293-1.999-3.326-.81-1.17-1.552-2.4-2.217-3.657-1.351-2.557-2.344-5.307-2.996-8.126-.452-1.953-3.45-1.385-2.941.621Z"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M159.95 82.583c-1.488-3.61-5.847-4.792-9.36-4.64-4.313.185-8.674 2.762-10.951 6.4-.95 1.519 1.637 2.976 2.588 1.475 1.749-2.761 4.976-4.713 8.215-4.899.293-.017.586-.014.88-.01.176.003.723.05.217.007.229.02.457.06.683.1.569.1 1.13.236 1.668.448 1.088.428 2.1 1.003 2.597 2.173.704 1.66 3.138.583 2.463-1.054Z"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M54.228 99.105c1.334-1.982 2.059-4.421 2.096-6.814.038-2.495-.67-4.962-2.037-7.034-1.011-1.533-3.601-.277-2.588 1.475 2.013 3.486 1.737 7.799-.395 10.931-1.044 1.534 1.903 2.984 2.924 1.442Z"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M153.418 23.802c2.81 3.017 6.66 4.864 10.768 5.033 1.286.053 2.825-.23 3.195-1.681.319-1.255-.64-2.434-1.879-2.622-.254-.038-.493-.087-.743-.15-.271-.069.479.173.221.068-.057-.023-.114-.047-.17-.073a11.278 11.278 0 0 1-.511-.248c-.324-.168-.641-.35-.951-.543-.625-.39-1.211-.841-1.765-1.325a15.353 15.353 0 0 1-3.502-4.164c-.909-1.592-3.564-.176-2.663 1.55Z"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M64.09 147.652c-4.926 12.73-8.188 26.139-11.602 39.339-3.433 13.275-6.607 26.622-9.924 39.928-1.037 4.164-2.199 8.358-2.788 12.614-.366 2.646-.327 5.602 1.737 7.573 2.274 2.171 5.607 1.819 8.41 1.107 6.675-1.696 12.554-6.284 16.941-11.463 4.647-5.485 7.51-12.224 9.984-18.809 2.8-7.452 5.028-15.101 7.118-22.777.461-1.691-2.092-2.696-2.557-.992-3.249 11.955-6.585 24.266-12.183 35.326-2.722 5.377-6.122 10.631-10.825 14.499-2.176 1.79-4.634 3.239-7.251 4.3-1.321.535-2.693.95-4.095 1.206-1.312.239-3.073.613-4.214-.243-2.298-1.724-1.469-5.605-.958-7.875.69-3.061 1.541-6.089 2.305-9.132 3.297-13.133 6.46-26.298 9.839-39.41 3.384-13.135 6.551-26.355 10.999-39.186.637-1.84-2.239-3.001-2.961-1.145Z"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M61.475 115.743c-2.762 13.109-5.323 26.261-8.114 39.365-2.795 13.122-5.567 26.259-8.748 39.295-.977 4.006-2.072 7.999-2.719 12.076-.546 3.436.283 8.326 4.452 8.788 3.89.43 8.02-2.491 10.917-4.79 4.001-3.176 7.178-7.311 9.741-11.736 5.456-9.421 8.266-20.205 11.467-30.531 1.312-4.233 2.655-8.487 3.573-12.828.921-4.359 1.407-8.797 1.525-13.25.079-2.977.112-5.986-.119-8.958-.222-2.851-.543-5.811-1.548-8.503-1.424-3.815-4.464-6.736-8.574-7.334-4.95-.72-9.343 2.253-11.853 6.358-2.835 4.639-3.664 10.12-4.207 15.409-.202 1.966 2.839 2.34 3.043.364.722-6.996 2.034-16.934 10.825-17.49 7.23-.457 9.613 7.162 10.31 12.96.889 7.394.44 14.974-.924 22.277-1.383 7.405-3.851 14.62-6.161 21.774-2.36 7.31-4.755 14.735-8.538 21.483-3.405 6.075-9.002 13.321-16.076 15.417-1.899.562-4.227.543-4.966-1.665-.662-1.979-.117-4.275.341-6.225 1.239-5.267 2.478-10.534 3.614-15.824 2.795-13.01 5.583-26.027 8.308-39.052 2.7-12.905 5.193-25.854 7.718-38.793.367-1.879-2.512-2.603-2.908-.722Z"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M62.404 129.613c-1.458-7.285 2.144-14.418 4.678-21.078 2.491-6.547 6.194-16.677 13.947-17.957 3.88-.641 8.165.932 9.929 4.683 2.07 4.401.27 9.524-1.298 13.788-3.885 10.565-9.646 20.444-13.098 31.184-1.228 3.822-2.433 7.824-2.008 11.878.359 3.426 2.313 6.678 5.654 7.93 3.513 1.316 7.306-.193 10.156-2.385 3.329-2.56 5.643-6.125 7.627-9.785 4.084-7.537 7.115-15.597 9.488-23.855.513-1.785-2.212-2.795-2.727-1.002-2.659 9.257-6.116 18.625-11.342 26.803-1.263 1.977-2.747 3.913-4.523 5.46-1.574 1.372-3.683 2.712-5.857 2.633-3.808-.139-5.217-3.839-5.174-7.165.054-4.164 1.475-8.194 2.825-12.074 3.582-10.293 9.1-19.832 13.012-29.994 3.354-8.71 4.582-21.717-5.907-25.501-9.087-3.28-16.136 5.888-20.035 12.762-4.785 8.43-10.665 20.95-8.637 30.978.371 1.836 3.275 1.07 2.912-.705Z"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M53.613 122.235c-2.742-7.626-4.885-15.849-6.655-23.753-1.835-8.186-2.956-16.518-3.463-24.891-.205-3.39-.261-6.786-.187-10.181.05-2.279.278-4.609.824-6.827.39-1.581.896-2.387 2.62-1.846 1.747.548 3.142 2.216 4.171 3.64 1.318 1.822 2.313 3.872 3.087 5.982 1.807 4.927 2.506 10.184 2.98 15.373 1.094 11.963.9 24.052 1.615 36.038.107 1.794 2.904 1.848 2.803.029-.945-16.98.151-34.108-2.861-50.911-.906-5.05-2.29-10.115-4.94-14.554-1.931-3.233-6.132-7.416-10.308-5.162-3.889 2.1-4.216 7.794-4.329 11.669-.143 4.863.063 9.737.493 14.582.803 9.05 2.424 18.005 4.492 26.845 1.296 5.538 2.78 11.033 4.638 16.414.582 1.686 3.133.689 2.54-.408Z"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M43.704 137.706c-1.941-6.833-3.686-13.751-5.177-20.696-1.603-7.471-2.904-15.062-3.762-22.653-.43-3.803-.731-7.623-.895-11.447-.131-3.072-.199-6.224.326-9.265.215-1.247.548-2.541 1.099-3.684.365-.757.534-.853 1.399-.439 1.411.675 2.601 2.089 3.39 3.391 1.113 1.837 1.852 3.902 2.423 5.978 1.436 5.217 1.821 10.673 2.194 16.048.894 12.88 1.7 25.755 3.528 38.543.264 1.846 3.214 1.087 2.947-.712-2.47-16.622-2.879-33.48-4.203-50.223-.509-6.438-1.776-13.035-5.058-18.679-1.826-3.139-5.982-7.235-9.855-4.861-3.172 1.945-3.676 6.432-3.814 9.783-.174 4.263.098 8.548.529 12.788.773 7.587 2.064 15.124 3.631 22.584 1.402 6.667 3.026 13.286 4.858 19.85.516 1.849 3.356.832 2.75-1.146Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </section>

        <section>
          <p className="fluid">
            How do you create a displacement map for a shape? With SVG. If you can do it
            with SVG, you can generate it and inject it with JS. The look is achieved by
            splitting the RGB channels and then offsetting them by different scales.
          </p>
          <div className="apps">
            <div className="app">
              <img src="https://assets.codepen.io/605876/heptabase.png" alt="" />
              <span>Heptabase</span>
            </div>
            <div className="app">
              <img src="https://assets.codepen.io/605876/notebook.png" alt="" />
              <span>Notebook</span>
            </div>
            <div className="app">
              <img src="https://assets.codepen.io/605876/readwise.png" alt="" />
              <span>Readwise</span>
            </div>
            <div className="app">
              <img src="https://assets.codepen.io/605876/dropbox.png" alt="" />
              <span>Dropbox</span>
            </div>
            <div className="app">
              <img src="https://assets.codepen.io/605876/inoreader.png" alt="" />
              <span>Inoreader</span>
            </div>
            <div className="app">
              <img src="https://assets.codepen.io/605876/readdle.png" alt="" />
              <span>Readdle</span>
            </div>
            <div className="app">
              <img src="https://assets.codepen.io/605876/examples.png" alt="" />
              <span>Example</span>
            </div>
            <div className="app">
              <img src="https://assets.codepen.io/605876/drafts.png" alt="" />
              <span>Drafts</span>
            </div>
          </div>
        </section>

        <section className="emojis fluid">
          <span>{'\u200d'}</span>
          <span />
          <span />
          <span />
          <span />
          <span />
        </section>

        <section>
          <p className="fluid">
            Check the &quot;debug&quot; option to see what&apos;s going on 👀
            <br />
            The displacement image is being generated using SVG and then encoded and
            injected into the filter. There is an array of settings. But with{' '}
            <code>presets</code> for <code>dock</code>, <code>pill</code>,
            <code>bubble</code>, and <code>free</code> modes.
          </p>
        </section>

        <section className="images">
          <img src="https://assets.codepen.io/605876/earth.jpg" alt="" />
          <img src="https://assets.codepen.io/605876/nebula.jpg" alt="" />
          <img src="https://assets.codepen.io/605876/moon.jpg" alt="" />
        </section>

        <section>
          <p className="fluid">
            This is a <b>Chromium</b> only effect. The <code>backdrop-filter</code>{' '}
            property with a URL value won&apos;t work in FireFox or Safari.
          </p>
        </section>

        <section>
          <p className="fluid">
            However, for the displacement map, you could use <code>turbulence</code>.
            You just wouldn&apos;t be able to map it to the shape you&apos;re trying to distort.
            But you could still use it for a displacement.
          </p>
        </section>

        <section>
          <p className="fluid">
            Double the fun. <span role="img" aria-label="excited">🙌</span>
          </p>
        </section>
      </main>

      <footer>┬┴┬┴┤•ᴥ•ʔ jhey © 2025 ├┬┴┬┴</footer>

      <a className="bear-link" href="https://x.com/jh3yy" target="_blank" rel="noreferrer noopener">
        <svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
          <path d="M449.617 78.191c-20.81 0-36.965 6.724-49.287 19.052-6.366 6.366-10.654 14.451-10.654 23.433 0 19.554 15.112 32.632 39.105 32.632 31.377 0 58.529-27.15 58.529-58.52 0-24.16-13.078-39.11-32.633-39.11-8.982 0-17.067 4.287-23.433 10.66-12.322 12.323-19.051 28.478-19.051 49.288 0 41.782 23.764 81.608 59.703 117.716C518.156 279.597 577.591 312 652.441 312c28.559 0 47.95-21.124 47.95-51.774 0-28.203-19.739-48.642-47.95-48.642-74.494 0-121.335 27.838-195.494 81.595-46.761 38.272-82.154 56.227-111.106 56.227-11.356 0-21.838-2.726-31.378-7.906-8.266-4.454-12.318-10.827-12.318-19.053 0-16.438 15.374-31.959 39.263-31.959 25.521 0 48.667 6.876 68.07 20.246 17.118 11.723 26.576 19.109 44.167 19.109 23.754 0 39.268-15.517 39.268-39.273 0-15.511-6.562-30.581-19.009-44.798-31.692-36.169-86.485-56.627-140.147-56.627-27.372 0-41.75 14.541-41.75 42.15 0 17.329 7.499 34.39 20.612 46.877 25.807 24.602 69.439 36.171 122.424 36.171 82.137 0 117.26-60.037 206.568-60.037 59.149 0 97.597 21.16 133.94 57.49 30.84 30.836 48.875 70.672 48.875 117.172 0 6.604-2.341 8.945-8.94 8.945h-22.731ZM586.253 724.668c74.494 0 121.334-27.838 195.493-81.595 46.761-38.272 82.155-56.228 111.106-56.228 11.357 0 21.839 2.727 31.379 7.91 8.266 4.453 12.317 10.823 12.317 19.049 0 16.442-15.373 31.959-39.264 31.959-25.521 0-48.666-6.876-68.07-20.243-17.118-11.728-26.576-19.109-44.167-19.109-23.754 0-39.269 15.511-39.269 39.269 0 15.515 6.563 30.585 19.01 44.802 31.692 36.169 86.485 56.629 140.147 56.629 27.372 0 41.751-14.542 41.751-42.15 0-17.329-7.5-34.394-20.613-46.881-25.807-24.602-69.439-36.171-122.425-36.171-82.137 0-117.26 60.039-206.567 60.039-59.15 0-97.6-21.162-133.941-57.491-30.839-30.835-48.875-70.667-48.875-117.173 0-6.604 2.341-8.95 8.941-8.95h22.731c20.81 0 36.961 6.729 49.288 19.051 6.366 6.37 10.654 14.451 10.654 23.433 0 19.554-15.119 32.632-39.106 32.632-31.377 0-58.528-27.15-58.528-58.52 0-24.16 13.078-39.11 32.632-39.11 8.982 0 17.067 4.287 23.433 10.661 12.322 12.322 19.052 28.477 19.052 49.288 0 41.781-23.765 81.608-59.703 117.715-46.088 46.263-105.524 78.674-180.373 78.674-28.56 0-47.951-21.125-47.951-51.775 0-28.203 19.739-48.642 47.951-48.642Z" />
        </svg>
      </a>
    </div>
  );
}
