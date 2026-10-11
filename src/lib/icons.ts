/**
 * 1-bit icons.
 *
 * Every icon is pure black stroke on a 16×16 grid. That constraint is not
 * cosmetic: hover recolours them with `invert(1) hue-rotate(180deg)`, which
 * assumes the art is black, white or red and nothing else. An orange icon
 * would silently break it.
 */

const wrap = (body: string) =>
	`url("data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23000' stroke-width='1.4' stroke-linecap='square'>${body}</svg>`
	).replace(/%25/g, '%')}")`;

export const icons = {
	monitor: wrap('<rect x="1.5" y="2.5" width="13" height="9"/><path d="M6 14h4M8 11.5V14"/>'),
	folder: wrap('<path d="M1.5 4.5h4l1.5 2h7.5v7h-13z"/><path d="M1.5 6.5h13"/>'),
	terminal: wrap('<rect x="1.5" y="2.5" width="13" height="11"/><path d="M4 6.5l2.5 2L4 10.5M8.5 11h4"/>'),
	mail: wrap('<rect x="1.5" y="3.5" width="13" height="9"/><path d="M2 4.5l6 4.5 6-4.5"/>'),
	code: wrap('<path d="M5.5 4L2 8l3.5 4M10.5 4L14 8l-3.5 4"/>'),
	film: wrap('<rect x="2.5" y="2.5" width="11" height="11"/><path d="M5.5 2.5v11M10.5 2.5v11"/>'),
	camera: wrap('<rect x="1.5" y="5.5" width="13" height="8"/><path d="M5 5.5l1-2h4l1 2"/><circle cx="8" cy="9.5" r="2.2"/>'),
	prism: wrap('<path d="M8 2.5L14.5 13.5h-13z"/><path d="M8 7v6.5M8 7l4 6.5M8 7L4 13.5"/>'),
	trash: wrap('<path d="M3.5 4.5h9l-1 9h-7z"/><path d="M2 4.5h12M6 4.5V2.5h4v2"/>'),
	trashEmpty: wrap('<path d="M3.5 4.5h9l-1 9h-7z"/><path d="M2 4.5h12M6 4.5V2.5h4v2M6 7v4M10 7v4"/>'),

	/* theme switch: the sun shows the current surface, the moon the one you
	   would switch to. Both are 1-bit line art, no fills. */
	sun: wrap('<circle cx="8" cy="8" r="3.2"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.05 3.05l1.13 1.13M11.82 11.82l1.13 1.13M12.95 3.05l-1.13 1.13M4.18 11.82l-1.13 1.13"/>'),
	moon: wrap('<path d="M13 9.8A5.8 5.8 0 016.2 3a5.8 5.8 0 106.8 6.8z"/>')
} as const;

export type IconName = keyof typeof icons;