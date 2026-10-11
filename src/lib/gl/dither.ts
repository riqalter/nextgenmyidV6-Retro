/**
 * The 1-bit pipeline.
 *
 * Full-colour media is never shown by default. Everything renders through an
 * 8×8 Bayer ordered-dither threshold and resolves back to colour only on
 * intent — and even then the dissolve is Bayer-ordered in 2×2-cell blocks, so
 * colour appears as a pattern sweeping across the frame rather than a
 * cross-fade. That difference is the whole point: this is a language, not a
 * filter.
 *
 * Two rules the output depends on:
 *   1. sqrt(luma) before thresholding — linear luma lands under 0.25 for dark
 *      artwork and dithers into noise. Correct gamma first, then threshold.
 *   2. sample the dithered branch at the CELL CENTRE, not per pixel — per-pixel
 *      sampling makes the pattern shimmer while the source moves.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;

uniform sampler2D uTex;
uniform vec2 uRes;    // canvas device pixels
uniform vec2 uTexRes; // source pixels
uniform float uCell;  // dither cell, device px
uniform float uMix;   // 0 = 1-bit, 1 = full colour
uniform float uContrast;
uniform float uPivot;

/* The threshold does not emit black and white — it emits THIS theme's two
   inks. A 1-bit print belongs to the surface it sits on; hardcoding #000/#fff
   would drop a glaring white rectangle onto a dark page. */
uniform vec3 uInk;
uniform vec3 uPaper;

float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

// object-fit: cover, reimplemented — a texture can't object-fit.
vec2 coverUV(vec2 uv) {
  float da = uRes.x / uRes.y;
  float sa = uTexRes.x / max(uTexRes.y, 1.0);
  vec2 s = da > sa ? vec2(sa / da, 1.0) : vec2(1.0, da / sa);
  return uv * s + (1.0 - s) * 0.5;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uCell);

  // The reveal itself is dithered, in chunky 2x2-cell blocks.
  if (bayer8(floor(cell / 2.0)) + 0.5 / 64.0 < uMix) {
    gl_FragColor = vec4(texture2D(uTex, coverUV(vUv)).rgb, 1.0);
    return;
  }

  vec3 c = texture2D(uTex, coverUV((cell + 0.5) * uCell / uRes)).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  l = clamp((sqrt(l) - uPivot) * uContrast + uPivot, 0.0, 1.0);

  // + 0.5/64 half-LSB bias, or a threshold of exactly 0.5 aliases.
  float bit = step(bayer8(cell) + 0.5 / 64.0, l);
  gl_FragColor = vec4(mix(uInk, uPaper, bit), 1.0);
}`;

export type DitherSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

export interface DitherOptions {
	/** dither cell in CSS px — 3 reads as halftone */
	cell?: number;
	/** gamma lift; higher for dark artwork (labels survive) */
	contrast?: number;
	/** pivot the contrast is applied around */
	pivot?: number;
}

/** `#dedede` → linear-light RGB, because the texture is sampled in sRGB. */
function hexToLinear(hex: string): [number, number, number] {
	const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
	if (!m) return [0, 0, 0];
	const n = parseInt(m[1], 16);
	const to = (b: number) => {
		const c = b / 255;
		return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	};
	return [to((n >> 16) & 255), to((n >> 8) & 255), to(n & 255)];
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
	const sh = gl.createShader(type)!;
	gl.shaderSource(sh, src);
	gl.compileShader(sh);
	if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(sh);
		gl.deleteShader(sh);
		throw new Error('shader: ' + log);
	}
	return sh;
}

export class DitherRenderer {
	readonly ok: boolean;
	private gl: WebGLRenderingContext | null = null;
	private tex: WebGLTexture | null = null;
	private uMix: WebGLUniformLocation | null = null;
	private uCell: WebGLUniformLocation | null = null;
	private uTexRes: WebGLUniformLocation | null = null;
	private uInk: WebGLUniformLocation | null = null;
	private uPaper: WebGLUniformLocation | null = null;
	/** linear-space RGB of the two inks the threshold resolves between */
	private inkRGB: [number, number, number] = [0, 0, 0];
	private paperRGB: [number, number, number] = [1, 1, 1];
	private opts: Required<DitherOptions>;
	private dpr = 1;

	constructor(
		private canvas: HTMLCanvasElement,
		opts: DitherOptions = {}
	) {
		this.opts = { cell: 3, contrast: 1.7, pivot: 0.5, ...opts };

		let gl: WebGLRenderingContext | null = null;
		try {
			gl = canvas.getContext('webgl', {
				// AA greys would poison the threshold; nothing here needs depth.
				antialias: false,
				depth: false,
				alpha: false,
				premultipliedAlpha: false,
				preserveDrawingBuffer: false
			});
		} catch {
			gl = null;
		}

		if (!gl) {
			this.ok = false;
			return;
		}

		try {
			const prog = gl.createProgram()!;
			gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
			gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
			gl.linkProgram(prog);
			if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
				throw new Error('link: ' + gl.getProgramInfoLog(prog));
			}
			gl.useProgram(prog);

			const buf = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			// one oversized triangle beats a quad: no diagonal seam, fewer verts
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
			const loc = gl.getAttribLocation(prog, 'aPos');
			gl.enableVertexAttribArray(loc);
			gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

			this.tex = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, this.tex);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			this.uMix = gl.getUniformLocation(prog, 'uMix');
			this.uCell = gl.getUniformLocation(prog, 'uCell');
			this.uTexRes = gl.getUniformLocation(prog, 'uTexRes');
			this.uInk = gl.getUniformLocation(prog, 'uInk');
			this.uPaper = gl.getUniformLocation(prog, 'uPaper');

			this.gl = gl;
			this.ok = true;
		} catch (err) {
			console.warn('[dither] unavailable:', err);
			this.gl = null;
			this.ok = false;
		}
	}

	/** Cap at 1.5 — past that the extra fragments buy nothing on a 1-bit image. */
	resize(cssW: number, cssH: number) {
		const gl = this.gl;
		if (!gl) return;
		this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
		const w = Math.max(1, Math.round(cssW * this.dpr));
		const h = Math.max(1, Math.round(cssH * this.dpr));
		if (this.canvas.width !== w || this.canvas.height !== h) {
			this.canvas.width = w;
			this.canvas.height = h;
		}
		gl.viewport(0, 0, w, h);
		gl.uniform2f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM)!, 'uRes')!, w, h);
	}

	upload(source: DitherSource) {
		const gl = this.gl;
		if (!gl || !this.tex) return;
		const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
		const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
		if (!w || !h) return;

		try {
			gl.bindTexture(gl.TEXTURE_2D, this.tex);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
			this.texW = w;
			this.texH = h;
		} catch {
			// a tainted/decoder-failed frame is not worth taking the page down for
		}
	}

	private texW = 1;
	private texH = 1;

	/**
 * Point the threshold at a theme's two inks. Call on mount and on theme
 * change — a dithered print has to be made of the surface it sits on.
 */
setPalette(ink: string, paper: string) {
		this.inkRGB = hexToLinear(ink);
		this.paperRGB = hexToLinear(paper);
	}

	/** mix: 0 = pure 1-bit, 1 = full colour */
	draw(mix: number) {
		const gl = this.gl;
		if (!gl || !this.tex) return;
		const cell = this.opts.cell * this.dpr;
		gl.uniform1f(this.uCell, cell);
		gl.uniform1f(this.uMix, mix);
		gl.uniform3fv(this.uInk, this.inkRGB);
		gl.uniform3fv(this.uPaper, this.paperRGB);
		gl.uniform1f(
			gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM)!, 'uContrast')!,
			this.opts.contrast
		);
		gl.uniform1f(
			gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM)!, 'uPivot')!,
			this.opts.pivot
		);
		gl.uniform2f(this.uTexRes, this.texW, this.texH);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	/** Hand the context back if the GPU is reset mid-session. */
	destroy() {
		const gl = this.gl;
		if (gl) {
			if (this.tex) gl.deleteTexture(this.tex);
			const ext = gl.getExtension('WEBGL_lose_context');
			ext?.loseContext();
		}
		this.gl = null;
	}
}