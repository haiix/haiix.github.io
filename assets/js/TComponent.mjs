//#region src/AbstractComponent.ts
var e = class {
	parent;
	constructor(e) {
		this.parent = e?.parent;
	}
	onerror(e) {
		if (this.parent) this.parent.onerror(e);
		else throw e;
	}
}, t = /* @__PURE__ */ new Set();
function n(e, n) {
	t.has(e) || (console.warn(`[TComponent] ${n}`), t.add(e));
}
//#endregion
//#region src/BuildContext.ts
var r = /^\s*(?:return\s+)?(?:this\s*\.\s*)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:\(\s*(?:event)?\s*\))?\s*;?\s*$/u, i = new Set([
	"for",
	"aria-labelledby",
	"aria-describedby",
	"aria-controls",
	"aria-owns",
	"aria-activedescendant",
	"aria-flowto",
	"aria-errormessage",
	"aria-details",
	"headers",
	"list"
]);
function a(e) {
	return /^[a-zA-Z][a-zA-Z0-9-]*$/u.test(e);
}
function o(e, t) {
	return (n) => {
		try {
			let r = t.call(e, n);
			r instanceof Promise ? r.catch((t) => {
				e.onerror(t);
			}) : r === !1 && n.preventDefault();
		} catch (t) {
			e.onerror(t);
		}
	};
}
function s() {
	return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : `tcomp-${Math.random().toString(36).slice(2, 11)}`;
}
function c(e, t, r) {
	t in e ? n(`duplicate-id:${t}`, `Duplicate id "${t}" found in template. Only the first instance will be mapped.`) : e[t] = r;
}
var l = class {
	idMap = {};
	idReferenceMap = [];
	component;
	uses;
	controller;
	signal;
	constructor(e, t, n) {
		if (this.component = e, this.uses = t, this.controller = new AbortController(), this.signal = this.controller.signal, n) if (n.aborted) this.controller.abort(n.reason);
		else {
			let e = () => {
				this.controller.abort(n.reason);
			};
			n.addEventListener("abort", e, { once: !0 }), this.signal.addEventListener("abort", () => {
				n.removeEventListener("abort", e);
			}, { once: !0 });
		}
	}
	build(e, t) {
		let { idMap: l, idReferenceMap: u, component: d, uses: f, signal: p } = this;
		if (e.t in f) {
			let t = f[e.t], n = new t({
				parent: d,
				attributes: e.a,
				childNodes: e.c,
				signal: p
			});
			return e.a.id && c(l, e.a.id, n), n.element;
		}
		let m = e.t;
		if (!a(m)) throw Error(`Invalid tag name: ${m}`);
		let h = t;
		e.t === "svg" ? h = "http://www.w3.org/2000/svg" : e.t === "math" && (h = "http://www.w3.org/1998/Math/MathML");
		let g = h ? document.createElementNS(h, m) : document.createElement(m);
		for (let [t, a] of Object.entries(e.a)) if (t === "id") g.id = s(), c(l, a, g);
		else if (i.has(t)) u.push({
			attrName: t,
			refId: a,
			element: g
		});
		else if (t.startsWith("on")) {
			let e = r.exec(a)?.[1];
			if (!e) throw Error(`SecurityError: Invalid event handler signature in attribute "${t}": "${a}"`);
			if (e === "constructor" || e === "__proto__") throw Error(`SecurityError: Access to "${e}" is forbidden.`);
			let i = d[e];
			if (typeof i == "function") {
				let e = t.slice(2).toLowerCase(), n = o(d, i);
				g.addEventListener(e, n, { signal: p });
			} else n(`missing-method:${d.constructor.name}:${e}`, `Method "${e}" not found on component for event "${t}"`);
		} else g.setAttribute(t, a);
		for (let t of e.c) if (typeof t == "string") g.appendChild(document.createTextNode(t));
		else {
			let n = e.t === "foreignobject" ? null : h;
			g.appendChild(this.build(t, n));
		}
		return g;
	}
	resolveIdReferences() {
		for (let { attrName: e, refId: t, element: n } of this.idReferenceMap) {
			let r = t.trim().split(/\s+/u).map((e) => {
				let t = this.idMap[e];
				return t instanceof Element ? t.id : e;
			}).join(" ");
			n.setAttribute(e, r);
		}
		this.idReferenceMap.length = 0;
	}
};
//#endregion
//#region src/parse.ts
function u(e, t) {
	if (e instanceof Element) return {
		t: e.tagName.toLowerCase(),
		a: Object.fromEntries(Array.from(e.attributes, (e) => [e.name, e.value])),
		c: Array.from(e.childNodes, (e) => u(e, t)).filter((e) => e != null)
	};
	if (e.nodeType === Node.TEXT_NODE) {
		let n = e.textContent ?? "";
		return !t.preserveWhitespace && !n.trim() && n.includes("\n") ? null : n;
	}
	return null;
}
function d(e, t = {}) {
	let n = document.createElement("template");
	if (n.innerHTML = e.trim(), n.content.children.length !== 1) throw Error("ParseError: The template must have exactly one root element.");
	return u(n.content.firstElementChild, t);
}
//#endregion
//#region src/TComponent.ts
var f = /* @__PURE__ */ new WeakMap(), p = class extends e {
	static uses = {};
	static template = "<div></div>";
	static parseOptions;
	static _parsed;
	context;
	element;
	constructor(e = {}) {
		super(e);
		let t = this.constructor.getParsed();
		this.context = new l(this, t.uses, e.signal), this.element = this.context.build(t.template), this.context.resolveIdReferences(), f.set(this.element, this);
	}
	destroy() {
		this.context.controller.abort(), this.element.remove();
	}
	static from(e) {
		if (e) {
			let t = f.get(e);
			if (t instanceof this) return t;
		}
	}
	get idMap() {
		return this.context.idMap;
	}
	static getParsed() {
		if (!Object.hasOwn(this, "_parsed") || !this._parsed) {
			let e = Object.hasOwn(this, "parseOptions") ? this.parseOptions : {};
			this._parsed = {
				template: d(this.template, e),
				uses: Object.fromEntries(Object.entries(this.uses).map(([e, t]) => [e.toLowerCase(), t]))
			};
		}
		return this._parsed;
	}
};
//#endregion
//#region src/utils/string.ts
function m(e) {
	return e.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").replace(/([A-Z])([A-Z][a-z])/gu, "$1-$2").toLowerCase();
}
function h(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) t[m(n)] = r;
	return t;
}
//#endregion
//#region src/utils/component.ts
function g(e, t, n) {
	if (n.attributes) {
		for (let [e, r] of Object.entries(n.attributes)) if (!(e === "id" || e.startsWith("on"))) if (e === "class") {
			let e = r.trim().split(/\s+/u).filter(Boolean);
			e.length && t.classList.add(...e);
		} else {
			let n = r;
			if (e === "style") {
				let e = t.getAttribute("style")?.trim() ?? "", i = r.trim();
				n = e && i ? e + (e.endsWith(";") ? " " : "; ") + i : e || i;
			}
			t.setAttribute(e, n);
		}
	}
	if (n.childNodes && n.childNodes.length > 0) {
		let r = e.parent instanceof p ? e.parent : e;
		for (let e of n.childNodes) t.appendChild(typeof e == "string" ? document.createTextNode(e) : r.context.build(e));
	}
}
//#endregion
//#region src/index.ts
var _ = p;
//#endregion
export { e as AbstractComponent, l as BuildContext, p as TComponent, g as applyParams, _ as default, h as kebabKeys, d as parseTemplate, m as toKebabCase };

//# sourceMappingURL=TComponent.mjs.map