const fs = require('fs');
const path = require('path');
// console.log(path.join(__dirname, '../functions.ejs'));
let str = fs.readFileSync(path.join(__dirname, '../functions.ejs'), 'utf8');

str = JSON.stringify(str);
// console.log(str + '\n');
/*
let _str = '';
for (let i = 0, len = str.length; i < len; i++) {
	
	if (str.slice(i, '<%'.length + i) == '<%') {
		i += '<%'.length;
	}
	if (str.slice(i, '%>'.length + i) == '%>') {
		i += '%>'.length;
	} else {
		_str += str[i];
	}
}
*/
// console.log(_str);
let n = 0;
let lineno = 1;
while ( ~ ( n = str.indexOf('\\n', n) ) ) {
	console.log(!(~n));
	n++;
	lineno++;
}

console.log(n);
console.log(lineno);