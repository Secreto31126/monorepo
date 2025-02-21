/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const n = globalThis,
	c = n.trustedTypes,
	h = c ? c.createPolicy("lit-html", { createHTML: (t) => t }) : void 0,
	f = "$lit$",
	v = `lit$${Math.random().toFixed(9).slice(2)}$`,
	m = "?" + v,
	_ = `<${m}>`,
	w = document,
	lt = () => w.createComment(""),
	st = (t) => null === t || ("object" != typeof t && "function" != typeof t),
	g = Array.isArray,
	$ = (t) => g(t) || "function" == typeof t?.[Symbol.iterator],
	x = "[ \t\n\f\r]",
	T = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,
	E = /-->/g,
	k = />/g,
	O = RegExp(`>|${x}(?:([^\\s"'>=/]+)(${x}*=${x}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"),
	S = /'/g,
	j = /"/g,
	M = /^(?:script|style|textarea|title)$/i,
	P =
		(t) =>
		(i, ...s) => ({ _$litType$: t, strings: i, values: s }),
	ke = P(1),
	Oe = P(2),
	Se = P(3),
	R = Symbol.for("lit-noChange"),
	D = Symbol.for("lit-nothing"),
	V = new WeakMap(),
	I = w.createTreeWalker(w, 129)
function N(t, i) {
	if (!g(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array")
	return void 0 !== h ? h.createHTML(i) : i
}
const U = (t, i) => {
	const s = t.length - 1,
		e = []
	let h,
		o = 2 === i ? "<svg>" : 3 === i ? "<math>" : "",
		n = T
	for (let i = 0; i < s; i++) {
		const s = t[i]
		let r,
			l,
			c = -1,
			a = 0
		for (; a < s.length && ((n.lastIndex = a), (l = n.exec(s)), null !== l); )
			(a = n.lastIndex),
				n === T
					? "!--" === l[1]
						? (n = E)
						: void 0 !== l[1]
							? (n = k)
							: void 0 !== l[2]
								? (M.test(l[2]) && (h = RegExp("</" + l[2], "g")), (n = O))
								: void 0 !== l[3] && (n = O)
					: n === O
						? ">" === l[0]
							? ((n = h ?? T), (c = -1))
							: void 0 === l[1]
								? (c = -2)
								: ((c = n.lastIndex - l[2].length),
									(r = l[1]),
									(n = void 0 === l[3] ? O : '"' === l[3] ? j : S))
						: n === j || n === S
							? (n = O)
							: n === E || n === k
								? (n = T)
								: ((n = O), (h = void 0))
		const u = n === O && t[i + 1].startsWith("/>") ? " " : ""
		o +=
			n === T
				? s + _
				: c >= 0
					? (e.push(r), s.slice(0, c) + f + s.slice(c) + v + u)
					: s + v + (-2 === c ? i : u)
	}
	return [N(t, o + (t[s] || "<?>") + (2 === i ? "</svg>" : 3 === i ? "</math>" : "")), e]
}
class B {
	constructor({ strings: t, _$litType$: i }, s) {
		let e
		this.parts = []
		let h = 0,
			o = 0
		const n = t.length - 1,
			r = this.parts,
			[l, a] = U(t, i)
		if (
			((this.el = B.createElement(l, s)), (I.currentNode = this.el.content), 2 === i || 3 === i)
		) {
			const t = this.el.content.firstChild
			t.replaceWith(...t.childNodes)
		}
		for (; null !== (e = I.nextNode()) && r.length < n; ) {
			if (1 === e.nodeType) {
				if (e.hasAttributes())
					for (const t of e.getAttributeNames())
						if (t.endsWith(f)) {
							const i = a[o++],
								s = e.getAttribute(t).split(v),
								n = /([.?@])?(.*)/.exec(i)
							r.push({
								type: 1,
								index: h,
								name: n[2],
								strings: s,
								ctor: "." === n[1] ? Y : "?" === n[1] ? Z : "@" === n[1] ? q : G,
							}),
								e.removeAttribute(t)
						} else t.startsWith(v) && (r.push({ type: 6, index: h }), e.removeAttribute(t))
				if (M.test(e.tagName)) {
					const t = e.textContent.split(v),
						i = t.length - 1
					if (i > 0) {
						e.textContent = c ? c.emptyScript : ""
						for (let s = 0; s < i; s++)
							e.append(t[s], lt()), I.nextNode(), r.push({ type: 2, index: ++h })
						e.append(t[i], lt())
					}
				}
			} else if (8 === e.nodeType)
				if (e.data === m) r.push({ type: 2, index: h })
				else {
					let t = -1
					for (; -1 !== (t = e.data.indexOf(v, t + 1)); )
						r.push({ type: 7, index: h }), (t += v.length - 1)
				}
			h++
		}
	}
	static createElement(t, i) {
		const s = w.createElement("template")
		return (s.innerHTML = t), s
	}
}
function z(t, i, s = t, e) {
	if (i === R) return i
	let h = void 0 !== e ? s.o?.[e] : s.l
	const o = st(i) ? void 0 : i._$litDirective$
	return (
		h?.constructor !== o &&
			(h?._$AO?.(!1),
			void 0 === o ? (h = void 0) : ((h = new o(t)), h._$AT(t, s, e)),
			void 0 !== e ? ((s.o ??= [])[e] = h) : (s.l = h)),
		void 0 !== h && (i = z(t, h._$AS(t, i.values), h, e)),
		i
	)
}
class F {
	constructor(t, i) {
		;(this._$AV = []), (this._$AN = void 0), (this._$AD = t), (this._$AM = i)
	}
	get parentNode() {
		return this._$AM.parentNode
	}
	get _$AU() {
		return this._$AM._$AU
	}
	u(t) {
		const {
				el: { content: i },
				parts: s,
			} = this._$AD,
			e = (t?.creationScope ?? w).importNode(i, !0)
		I.currentNode = e
		let h = I.nextNode(),
			o = 0,
			n = 0,
			r = s[0]
		for (; void 0 !== r; ) {
			if (o === r.index) {
				let i
				2 === r.type
					? (i = new et(h, h.nextSibling, this, t))
					: 1 === r.type
						? (i = new r.ctor(h, r.name, r.strings, this, t))
						: 6 === r.type && (i = new K(h, this, t)),
					this._$AV.push(i),
					(r = s[++n])
			}
			o !== r?.index && ((h = I.nextNode()), o++)
		}
		return (I.currentNode = w), e
	}
	p(t) {
		let i = 0
		for (const s of this._$AV)
			void 0 !== s &&
				(void 0 !== s.strings ? (s._$AI(t, s, i), (i += s.strings.length - 2)) : s._$AI(t[i])),
				i++
	}
}
class et {
	get _$AU() {
		return this._$AM?._$AU ?? this.v
	}
	constructor(t, i, s, e) {
		;(this.type = 2),
			(this._$AH = D),
			(this._$AN = void 0),
			(this._$AA = t),
			(this._$AB = i),
			(this._$AM = s),
			(this.options = e),
			(this.v = e?.isConnected ?? !0)
	}
	get parentNode() {
		let t = this._$AA.parentNode
		const i = this._$AM
		return void 0 !== i && 11 === t?.nodeType && (t = i.parentNode), t
	}
	get startNode() {
		return this._$AA
	}
	get endNode() {
		return this._$AB
	}
	_$AI(t, i = this) {
		;(t = z(this, t, i)),
			st(t)
				? t === D || null == t || "" === t
					? (this._$AH !== D && this._$AR(), (this._$AH = D))
					: t !== this._$AH && t !== R && this._(t)
				: void 0 !== t._$litType$
					? this.$(t)
					: void 0 !== t.nodeType
						? this.T(t)
						: $(t)
							? this.k(t)
							: this._(t)
	}
	O(t) {
		return this._$AA.parentNode.insertBefore(t, this._$AB)
	}
	T(t) {
		this._$AH !== t && (this._$AR(), (this._$AH = this.O(t)))
	}
	_(t) {
		this._$AH !== D && st(this._$AH)
			? (this._$AA.nextSibling.data = t)
			: this.T(w.createTextNode(t)),
			(this._$AH = t)
	}
	$(t) {
		const { values: i, _$litType$: s } = t,
			e =
				"number" == typeof s
					? this._$AC(t)
					: (void 0 === s.el && (s.el = B.createElement(N(s.h, s.h[0]), this.options)), s)
		if (this._$AH?._$AD === e) this._$AH.p(i)
		else {
			const t = new F(e, this),
				s = t.u(this.options)
			t.p(i), this.T(s), (this._$AH = t)
		}
	}
	_$AC(t) {
		let i = V.get(t.strings)
		return void 0 === i && V.set(t.strings, (i = new B(t))), i
	}
	k(t) {
		g(this._$AH) || ((this._$AH = []), this._$AR())
		const i = this._$AH
		let s,
			e = 0
		for (const h of t)
			e === i.length
				? i.push((s = new et(this.O(lt()), this.O(lt()), this, this.options)))
				: (s = i[e]),
				s._$AI(h),
				e++
		e < i.length && (this._$AR(s && s._$AB.nextSibling, e), (i.length = e))
	}
	_$AR(t = this._$AA.nextSibling, i) {
		for (this._$AP?.(!1, !0, i); t && t !== this._$AB; ) {
			const i = t.nextSibling
			t.remove(), (t = i)
		}
	}
	setConnected(t) {
		void 0 === this._$AM && ((this.v = t), this._$AP?.(t))
	}
}
class G {
	get tagName() {
		return this.element.tagName
	}
	get _$AU() {
		return this._$AM._$AU
	}
	constructor(t, i, s, e, h) {
		;(this.type = 1),
			(this._$AH = D),
			(this._$AN = void 0),
			(this.element = t),
			(this.name = i),
			(this._$AM = e),
			(this.options = h),
			s.length > 2 || "" !== s[0] || "" !== s[1]
				? ((this._$AH = Array(s.length - 1).fill(new String())), (this.strings = s))
				: (this._$AH = D)
	}
	_$AI(t, i = this, s, e) {
		const h = this.strings
		let o = !1
		if (void 0 === h)
			(t = z(this, t, i, 0)), (o = !st(t) || (t !== this._$AH && t !== R)), o && (this._$AH = t)
		else {
			const e = t
			let n, r
			for (t = h[0], n = 0; n < h.length - 1; n++)
				(r = z(this, e[s + n], i, n)),
					r === R && (r = this._$AH[n]),
					(o ||= !st(r) || r !== this._$AH[n]),
					r === D ? (t = D) : t !== D && (t += (r ?? "") + h[n + 1]),
					(this._$AH[n] = r)
		}
		o && !e && this.j(t)
	}
	j(t) {
		t === D
			? this.element.removeAttribute(this.name)
			: this.element.setAttribute(this.name, t ?? "")
	}
}
class Y extends G {
	constructor() {
		super(...arguments), (this.type = 3)
	}
	j(t) {
		this.element[this.name] = t === D ? void 0 : t
	}
}
class Z extends G {
	constructor() {
		super(...arguments), (this.type = 4)
	}
	j(t) {
		this.element.toggleAttribute(this.name, !!t && t !== D)
	}
}
class q extends G {
	constructor(t, i, s, e, h) {
		super(t, i, s, e, h), (this.type = 5)
	}
	_$AI(t, i = this) {
		if ((t = z(this, t, i, 0) ?? D) === R) return
		const s = this._$AH,
			e =
				(t === D && s !== D) ||
				t.capture !== s.capture ||
				t.once !== s.once ||
				t.passive !== s.passive,
			h = t !== D && (s === D || e)
		e && this.element.removeEventListener(this.name, this, s),
			h && this.element.addEventListener(this.name, this, t),
			(this._$AH = t)
	}
	handleEvent(t) {
		"function" == typeof this._$AH
			? this._$AH.call(this.options?.host ?? this.element, t)
			: this._$AH.handleEvent(t)
	}
}
class K {
	constructor(t, i, s) {
		;(this.element = t), (this.type = 6), (this._$AN = void 0), (this._$AM = i), (this.options = s)
	}
	get _$AU() {
		return this._$AM._$AU
	}
	_$AI(t) {
		z(this, t)
	}
}
const si = { M: f, P: v, A: m, C: 1, L: U, R: F, D: $, V: z, I: et, H: G, N: Z, U: q, B: Y, F: K },
	Re = n.litHtmlPolyfillSupport
Re?.(B, et), (n.litHtmlVersions ??= []).push("3.2.0")
const Q = (t, i, s) => {
	const e = s?.renderBefore ?? i
	let h = e._$litPart$
	if (void 0 === h) {
		const t = s?.renderBefore ?? null
		e._$litPart$ = h = new et(i.insertBefore(lt(), t), t, void 0, s ?? {})
	}
	return h._$AI(t), h
}
export { si as _$LH, ke as html, Se as mathml, R as noChange, D as nothing, Q as render, Oe as svg }
//# sourceMappingURL=lit-html.js.map
