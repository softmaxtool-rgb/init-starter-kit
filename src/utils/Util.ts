import DOMPurify from 'dompurify';
import dayjs from 'dayjs';

export const generateId = function (): number {
	return Math.floor(Math.random() * 100000 + Math.random() * 20000 + Math.random() * 5000);
};

export const genUidTime = function (): number {
	let ranId = Math.floor(Math.random() * 100000 + Math.random() * 20000 + Math.random() * 5000);
	let mst = dayjs().valueOf() + '' + ranId;
	return Number(mst.slice(0, 17));
};

export const genUUID = function () {
	return window.crypto.randomUUID();
};

// ลงทะเบียน resize listener แล้วคืน cleanup function ไว้ถอน (เรียกใน onUnmounted/unmounted เพื่อกัน leak)
// เดิมใช้ window.onresize chain ซ้อน handler เก่า+ใหม่ → ถอนไม่ได้ → handler ของ component ที่ unmount แล้วค้างใน memory
// addEventListener: แต่ละ listener อิสระ (ไม่ซ้อนกันทวีคูณ) + ถอนทีละตัวได้
// backward-compatible: caller เดิมที่ไม่เก็บ return ยังทำงานปกติ แค่ยังไม่ cleanup เท่านั้น
export const onWindowResizeHandler = function (handler: any): () => void {
	window.addEventListener('resize', handler);
	return () => window.removeEventListener('resize', handler);
};

export function responsivePopup(widthdefault: string) {
	if (window.innerWidth < 768) {
		// console.log('xs');
		return '96%';
	} else if (window.innerWidth >= 768 && window.innerWidth < 992) {
		// console.log('sm');
		return '95%';
	} else if (window.innerWidth >= 992) {
		// console.log('md');
		return widthdefault;
	}

	return widthdefault;
}

export function getQueryParam(variable: string): string {
	let query = window.location.search.substring(1);
	let vars = query.split('&');
	for (let i = 0; i < vars.length; i++) {
		const current = vars[i];
		if (!!current) {
			let pair = current.split('=');
			if (pair[0] == variable && !!pair[1]) {
				return pair[1];
			}
		}
	}
	return '';
}

export const deepClone = function (origin: any): any {
	if (origin === undefined) {
		return undefined;
	}

	return JSON.parse(JSON.stringify(origin));
};

export function isNull(value: any): boolean {
	return value === null || value === undefined;
}

export function isNotNull(value: any): boolean {
	return value !== null && value !== undefined;
}

export function isEmptyStr(str: any): boolean {
	return str === undefined || (!str && str !== 0 && str !== '0') || !/[^\s]/.test(str);
}

export function isEmptyObj(obj: any): boolean {
	return Object.keys(obj).length === 0;
}

export const overwriteObj = function (obj1: any, obj2: any): void {
	Object.keys(obj2).forEach((prop) => {
		obj1[prop] = obj2[prop];
	});
};

export const numberFormat = function (number: any, decPlaces = 0, style: any = 'currency', currency = 'THB') {
	const formatter = new Intl.NumberFormat('th-TH', {
		style: style,
		currency: currency,
		minimumFractionDigits: decPlaces,
	});
	return formatter.format(number);
};

export const getParentComponent = function (componentName: any, instance: any) {
	let parent: any = instance.currentInstance.parent.ctx.$parent;
	let name = parent.$options.name;

	while (parent && (!name || name !== componentName)) {
		parent = parent.$parent;
		if (parent) {
			name = parent.$options.name;
		}
	}
	if (!!parent) {
		return parent;
	}
	return;
};

export const optionExists = function (optionsObj: any, optionName: any) {
	if (!optionsObj) {
		return false;
	}

	return Object.keys(optionsObj).indexOf(optionName) > -1;
};

export const loadRemoteScript = function (srcPath: any, callback: any) {
	let sid = encodeURIComponent(srcPath);
	let oldScriptEle = document.getElementById(sid);

	if (!oldScriptEle) {
		let s: any = document.createElement('script');
		s.src = srcPath;
		s.id = sid;
		document.body.appendChild(s);

		s.onload = s.onreadystatechange = function (_: any, isAbort: any) {
			if (isAbort || !s.readyState || s.readyState === 'loaded' || s.readyState === 'complete') {
				s = s.onload = s.onreadystatechange = null;
				if (!isAbort) {
					callback();
				}
			}
		};
	}
};

export const object2Path = function (object: any) {
	let path: any = {};
	for (const key in object) {
		path[`{{${key}}}`] = object[key];
	}

	return path;
};

export const string2Json = (jsonStr: string, defaultNull: any = []) => {
	try {
		return JSON.parse(jsonStr);
	} catch (error: any) {
		return defaultNull;
	}
};

export const string2boolean = (value: string): boolean => {
	const truthy: string[] = ['true', 'True', '1'];

	return truthy.includes(value);
};

export function ucfirst(string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

export function lcfirst(string: string) {
	return string.charAt(0).toLowerCase() + string.slice(1);
}

export function inStrFormatted(items: Array<string>) {
	return `(${items.map((i) => JSON.stringify(i.toString())).join(', ')})`;
}

export function inIntFormatted(items: Array<string>) {
	return `(${items.join(', ')})`;
}

export function htmlEncode(html: string) {
	let encoded = html.replace(/\s+/g, ' ');

	// According to Taylor Hunt, lowercase gzips better ... my tiny test confirms this
	encoded = replaceAll(encoded, '%', '%25');
	encoded = replaceAll(encoded, '> <', '><'); // normalise spaces elements
	encoded = replaceAll(encoded, '; }', ';}'); // normalise spaces css
	encoded = replaceAll(encoded, '<', '%3c');
	encoded = replaceAll(encoded, '>', '%3e');
	encoded = replaceAll(encoded, '"', "'");
	encoded = replaceAll(encoded, '#', '%23'); // needed for ie and firefox
	encoded = replaceAll(encoded, '{', '%7b');
	encoded = replaceAll(encoded, '}', '%7d');
	encoded = replaceAll(encoded, '|', '%7c');
	encoded = replaceAll(encoded, '^', '%5e');
	encoded = replaceAll(encoded, '`', '%60');
	encoded = replaceAll(encoded, '@', '%40');

	return encoded;
}

function replaceAll(str: string, find: string, replace: string) {
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function escapeRegExp(str: string) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}

export function htmlRender(html: string) {
	return DOMPurify.sanitize(html, {}); //ALLOWED_TAGS: []
}

export function strtr(str: string, dic: any): string {
	const makeToken = (inx: number) => `{{###~${inx}~###}}`;

	const tokens = Object.keys(dic).map((key, inx) => ({
		key,
		val: dic[key],
		token: makeToken(inx),
	}));

	const tokenizedStr = tokens.reduce((carry, entry) => carry.replace(new RegExp(entry.key, 'g'), entry.token), str);

	return tokens.reduce((carry, entry) => carry.replace(new RegExp(entry.token, 'g'), entry.val), tokenizedStr);
}

export function hexToRgba(hex: string, alpha: number = 1): string {
	if (!hex) return '';
	if (alpha < 0 || alpha > 1) {
		alpha = 1;
	}

	hex = hex.trim().replace(/^#/, '');

	// Validate hex format
	if (!/^([0-9A-F]{3}){1,2}$/i.test(hex)) {
		return '';
	}

	// Parse the hex value
	let r: number, g: number, b: number;

	if (hex.length === 3 && !!hex[0] && !!hex[1] && !!hex[2]) {
		r = parseInt(hex[0] + hex[0], 16);
		g = parseInt(hex[1] + hex[1], 16);
		b = parseInt(hex[2] + hex[2], 16);
	} else {
		r = parseInt(hex.substring(0, 2), 16);
		g = parseInt(hex.substring(2, 4), 16);
		b = parseInt(hex.substring(4, 6), 16);
	}

	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
