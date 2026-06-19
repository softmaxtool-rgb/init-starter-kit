declare global {
	interface String {
		strtr: Function;
	}
}

String.prototype.strtr = function (dic: any) {
	const str = this.toString(),
		makeToken = (inx: any) => `{{###~${inx}~###}}`,
		tokens = Object.keys(dic).map((key, inx) => ({
			key,
			val: dic[key],
			token: makeToken(inx),
		})),
		tokenizedStr = tokens.reduce((carry, entry) => carry.replace(entry.key, entry.token), str);

	return tokens.reduce((carry, entry) => carry.replace(entry.token, entry.val), tokenizedStr);
};

export {};
