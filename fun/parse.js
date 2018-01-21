/*
** ejs模块的核心就是构建JS代码字符串
** 通过一段一段的字符串结合来构成一个可执行的JS文件
**
** parse.js 分析字符串模块
** 并拼接成可执行的JS代码字符串
 */

const _private = {
	open: '<%', //默认需要通过JS处理的起始标记符
	close: '%>', //默认JS处理结束标记符号
	compileDebug: true, //默认开启代码解析
	_with: true // 是否需要使用with(){}来执行代码
};

const read = require('fs').readFileSync;

const path = require('path');
// 获取包含文件的地址
const resolveInclude = function (name, filename) {
	// 组合文件路径
	let _path = path.join(path.dirname(filename), name);
	// 获取文件后缀
	let ext = path.extname(name);
	// 如果没有后缀名，那么加上后缀名
	if (!ext) {
		_path += '.ejs';
	}
	return _path;
}

const parse = function(str, options = _private) {
	const open = options.open;
	const close = options.close;
	// 当前模板文件名
	const filename = options.filename;

	let buf = ""; // 储存JS代码字符串

	buf += 'const _buf = [];';

	// 这里将开启with语句执行代码
	// with语句不常用，主要功能就是设定指定的作用域
	// width(指定作用域对象){执行代码（都将以指定的对象作为本地初始对象）}
	if (options._with !== false) {
		// 这里locals究竟是什么呢？ 请看des.md
		buf += '\nwith (locals || {}) { (function () {';
	}

	buf += "\n _buf.push(\'";
	// 这里需要注意，lineno代码当前代码行
	// 这也是代码解析核心的思想
	// 在构建JScode代码时，并不断的记录代码行数
	let lineno = 1;

	// ??
	let consumeEOL = false;

	// 字符串解析开始啦
	// 需要注意的是这里解析字符串的方式
	// <% xxx %> 按照这样的开/闭合标签来逐个构建JS代码字符串
	for (let i = 0; i < str.length; i++) {
		let stri = str[i];
		// 检查字符串片段是否包含‘<%’字符串
		if (str.slice(i, open.length + i) == open) {
			// 如果当前字符串片段中包含指定字符串
			// 那将下次截取起始位置跳过‘<%’字符串
			i += open.length;

			let prefix, postfix;
			// 这里如果开启代码解析
			// 那么将创建一个‘栈’对象
			// 该对象记录当前代码行号和代码字符串
			let line = (compileDebug ? '_stack.lineno=' : '') + lineno;

			switch (str[i]) {
				// ‘<% =’ 这样的模式
				// 意思是需要向模板输出转译后的值
				// 所以这里使用了escape这个函数
				// escape主要实现转译
				case '=':
					prefix = `', escape(( ${line} , `;
					postfix = ")), '";
					// 注意操作完毕后，需要跳过‘=’字符
					// 所以这里++i
					++ i;
					break;
				// 输出未转译的值
				case '-':
					prefix = `', ( ${line} , `;
					postfix = "), '";
					++ i;
					break;
				default:
					prefix = `'); ${line};`;
					postfix = "; buf.push('";	
			}

			// 检查模板字符串中是否包含闭合标签‘%>’
			// 注意这里的执行逻辑
			// 这里是处理完开始标签‘<%’后紧接着就需要查找对应的闭合标签
			// 而这里寻找的起始位置就是跳过前面特殊字符后的索引
			// 这里很关键
			let end = str.indexOf(close, i);

			if (end < 0) {
				// 为什么这里仅仅跑出错误而不终止程序呢？
				// 这是因为作者在compile.js这个文件中有错误捕获
				// 也就是给出了一个统一的错误处理方式
				// 而没有这里直接return
				throw new Error(`could not find matching close tag" ${close}".`);
			}
			// 截取<% js code %>
			// 截取字符串中JS代码部分
			let js = str.substring(i, end);
			let start = i;
			// 用户储存当前模板文件中包含的（其他模板文件的解析字符串）
			let include = null;
			// js代码字符串的字符索引记录
			let n = 0;

			// ........
			if (js[js.length - 1] == '-') {
				js = js.substring(0, js.length - 2);
				consumeEOL = true;
			}

			// trim() 删除字符串两端的空白字符
			// 处理包含模块：
			// <% include('template-file', data) %>
			// <% include template-file %>
			if (js.trim().indexOf('include') == 0) {
				// 获取include后面的文件路径
				let name = js.trim().slice(7).trim();
				// 如果在配置对象中没有给filename值
				// 那么include功能无法实现
				if (!filename) {
					throw new Error("filename option is required for includes");
				}
				// 获取包含文件的路径
				let path = resolveInclude(name, filename);
				// 读取包含文件
				include = read(path, 'utf8');
				// 处理包含文件（其实这里就是一个回调）
				include = parse(include, {
					filename: path,
					_with: false,
					open: open,
					close: close,
					compileDebug: compileDebug
				});

				buf += `' (function () { ${include} })() '`;
				// 清空js变量
				js = '';
			}
			// 这里是一个取反运算符
			// 这是一个非常巧妙的运用
			// indexOf 在匹配字符串后会返回大于等于0的数 否则返回-1
			// 这里通过取反就解决了布尔运算
			// 当然返回-1时，取反运算结果就为0 -> false, 其他情况都返回 true
			while (~ (n = indexOf("\\n", n)) ) {
				n ++;
				lineno ++;
			}



		}

	}


}


module.exports = parse;