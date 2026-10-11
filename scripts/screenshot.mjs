// Dependency-free Chrome DevTools Protocol screenshotter.
// Node 24 ships a global WebSocket + fetch, so no puppeteer needed.
//
//   npm run build && npm run preview     # in one shell
//   node scripts/screenshot.mjs          # in another
//
// Crispness rules this enforces:
//   - deviceScaleFactor: 2      -> real retina pixels, not an upscaled 1x grab
//   - --force-color-profile=srgb
//   - --disable-lcd-text        -> grayscale AA, kills colour fringing on 1-bit type
//   - await document.fonts.ready -> no fallback-glyph flash
//   - poll .hero-typed          -> the typewriter types at a random 85-125ms/char,
//                                  so a fixed sleep lands mid-word about half the
//                                  time; we wait for the text to stop growing
//   - pause CSS animations     -> the red caret blinks on a 1.06s steps(1) loop
//                                  and would be caught missing ~50% of the time
//
// Motion deliberately stays ON. With motion off, Swirl.svelte renders its
// *pre-intro* frame — every sprite flung to 2.8x spread and mostly culled — so
// the hero's right half comes out empty. Reduced motion is a broken frame, not
// a still one.

import { writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/usr/bin/google-chrome-stable';
const PORT = 9222;
const BASE = process.env.BASE ?? 'http://127.0.0.1:4173';
const OUT = process.env.OUT ?? './docs/screenshots';
const DSF = 2;

/** pages to capture */
const SHOTS = [
	{ name: 'home', path: '/', w: 1440, h: 900, full: false },
	{ name: 'home-dark', path: '/', w: 1440, h: 900, full: false, dark: true },
	{ name: 'work', path: '/work/', w: 1440, h: 1100, full: false },
	{ name: 'about', path: '/about/', w: 1440, h: 1000, full: false },
	{ name: 'cv', path: '/cv/', w: 1440, h: 1000, full: false },
	{ name: 'contact', path: '/contact/', w: 1440, h: 900, full: false }
];

// fail loudly rather than writing six blank PNGs
try {
	const probe = await fetch(BASE, { signal: AbortSignal.timeout(3000) });
	if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
} catch {
	console.error(`\nNo site at ${BASE}.\nStart one first:\n\n  npm run build && npm run preview\n`);
	process.exit(1);
}

const chrome = spawn(CHROME, [
	'--headless=new',
	`--remote-debugging-port=${PORT}`,
	'--hide-scrollbars',
	'--force-color-profile=srgb',
	'--disable-lcd-text',
	// software WebGL so the Bayer dither + swirl canvases actually paint
	'--use-gl=angle',
	'--use-angle=swiftshader',
	'--enable-unsafe-swiftshader',
	'--no-sandbox',
	'--disable-dev-shm-usage',
	'--no-first-run',
	'--disable-extensions',
	'--user-data-dir=/tmp/opencode/chrome-profile',
	'about:blank'
], { stdio: 'ignore' });

async function endpoint() {
	for (let i = 0; i < 60; i++) {
		try {
			const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
			return (await r.json()).webSocketDebuggerUrl;
		} catch {
			await sleep(250);
		}
	}
	throw new Error('chrome never came up');
}

/** minimal CDP session over the browser-level socket */
async function connect() {
	const url = await endpoint();
	const ws = new WebSocket(url);
	await new Promise((res, rej) => {
		ws.onopen = res;
		ws.onerror = rej;
	});

	let id = 0;
	const pending = new Map();
	const listeners = [];

	ws.onmessage = (ev) => {
		const msg = JSON.parse(ev.data);
		if (msg.id && pending.has(msg.id)) {
			const { resolve, reject } = pending.get(msg.id);
			pending.delete(msg.id);
			msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
		} else if (msg.method) {
			for (const l of listeners) l(msg);
		}
	};

	const send = (method, params = {}, sessionId) =>
		new Promise((resolve, reject) => {
			const n = ++id;
			pending.set(n, { resolve, reject });
			ws.send(JSON.stringify({ id: n, method, params, sessionId }));
		});

	return { send, on: (fn) => listeners.push(fn), close: () => ws.close() };
}

const cdp = await connect();

/** open a tab and return { targetId, sessionId } */
async function openTab() {
	const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
	const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
	return { targetId, sessionId };
}

async function capture(shot) {
	const { targetId, sessionId: s } = await openTab();

	// device metrics FIRST so the renderer lays out at the real pixel grid
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: shot.w,
		height: shot.h,
		deviceScaleFactor: DSF,
		mobile: false,
		screenWidth: shot.w,
		screenHeight: shot.h
	}, s);

	// Motion must stay ON: with motion off the Swirl renders its *pre-intro*
	// frame (sprites flung to 2.8x spread, mostly culled) and the hero's right
	// half comes out empty. So we run with motion and wait for the intro to
	// finish instead. Theme is the only thing we force.
	await cdp.send('Emulation.setEmulatedMedia', {
		media: 'screen',
		features: [
			{ name: 'prefers-color-scheme', value: shot.dark ? 'dark' : 'light' },
			{ name: 'prefers-reduced-motion', value: 'no-preference' }
		]
	}, s);

	await cdp.send('Page.enable', {}, s);
	await cdp.send('Runtime.enable', {}, s);

	const loaded = new Promise((resolve) => {
		const off = cdp.on((m) => {
			if (m.method === 'Page.loadEventFired' && m.sessionId === s) resolve();
		});
	});

	await cdp.send('Page.navigate', { url: BASE + shot.path }, s);
	await loaded;

	// fonts, then a couple of frames for the canvases to settle
	await cdp.send('Runtime.evaluate', {
		expression: `document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`,
		awaitPromise: true
	}, s);

	// The hero has timed animations. The typewriter types at 85-125ms/char
	// *randomly*, so a fixed sleep lands mid-word about half the time (you get
	// "AI/ML En" instead of "AI/ML Engineer"). Poll the DOM instead: the text
	// stops growing for 1900ms once the first phrase is fully typed, so
	// "unchanged for a few consecutive polls" == we are in that hold window.
	const typed = () =>
		cdp.send('Runtime.evaluate', {
			expression: `(document.querySelector('.hero-typed')?.textContent ?? '').length`,
			returnByValue: true
		}, s).then((r) => r.result.value);

	let last = -1, stable = 0, waited = 0;
	const deadline = shot.settle ?? 12000;
	while (waited < deadline) {
		await sleep(100);
		waited += 100;
		const n = await typed();
		if (n === last && n > 0) {
			if (++stable >= 4) break; // ~400ms of no growth == fully typed
		} else {
			stable = 0;
		}
		last = n;
	}

	// The red caret blinks forever (steps(1), 1.06s) — a screenshot would
	// catch it ~50% of the time missing. Freeze every CSS animation at its
	// first keyframe so the caret is always solid. Canvas rAF is untouched,
	// so the settled swirl keeps its frame.
	await cdp.send('Runtime.evaluate', {
		expression: `document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) {} })`
	}, s);
	await sleep(250);

	const { data } = await cdp.send('Page.captureScreenshot', {
		format: 'png',
		captureBeyondViewport: shot.full,
		optimizeForSpeed: false
	}, s);

	mkdirSync(OUT, { recursive: true });
	const file = `${OUT}/${shot.name}.png`;
	writeFileSync(file, Buffer.from(data, 'base64'));

	const dims = shot.full
		? await cdp.send('Runtime.evaluate', {
			expression: `[document.documentElement.scrollWidth, document.documentElement.scrollHeight].join('x')`,
			returnByValue: true
		}, s)
		: { result: { value: `${shot.w}x${shot.h}` } };

	console.log(`${file}  ->  ${dims.result.value} css px @${DSF}x`);

	await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
}

try {
	for (const shot of SHOTS) {
		await capture(shot);
	}
} finally {
	cdp.close();
	chrome.kill();
}