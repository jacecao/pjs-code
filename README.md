# ejs-code

>正在阅读中............................

**探秘ejs模板（read code about ejs-module）**   

一直以来好奇模板究竟是如何化腐朽为神奇的呢？从PHP开发中就不难看出后端页面的渲染将是所有后端开发必将面临的一个问题，在Node.JS中我们也要面对这样的问题，所以模板插件就成了后端开发必备。

>为什么挑选ejs模板作为探秘对象呢？首先个人比较喜欢ejs这样的模板风格（基本与HTML一样嘛），其次个人感觉其源码相对来说相对容易解析。

>究竟如何探秘ejs模板呢？我的初衷是希望了解模板的工作原理，然后解析代码设计的巧妙之处。
我希望能够尽力对源码的每个功能做一个注释，嗯，基本想法就是这样的。

***

* ### **画龙点睛之笔**

1. 通过（圆括号）完成优雅运算      

parse.js是整个ejs最基础也是最核心的模块，那么这个模块里面涉及一个ejs语句拼接错误调试的配置项目，详见compile.js第32行和parse.js第93行代码（关于compileDebug），这个错误调试是如何实现的呢？一共有3个步骤来完成这个错误调试     
>1. 如果开启调试配置，那么创建一个当前模板的解析栈_stack对象,这个对象有三个属性，lineno当前正在解析模板第几行       、input记录着当前模板里原始的字符串（即模板内容）、filename这个不言而喻了。   
2. 每当解析一行模板字符串，就更改当前解析栈中lineno属性的值。      
3. 一旦解析出错，跑出异常，这个异常就会告诉你出错来自哪个模板文件的第几行，而这些信息都记录在解析栈里。      

关于记录解析行号，这里有一个非常优雅的记录方式，这个在parse.js第114行中体现处理的，在处理<%= %>这种情况时，需要通过escap方法来过滤解析字符串，escape方法只有一个字符串参数，那实际解析后escape方法是这样运行的`escape((lineno = 1, str))`,对大部分前端来讲这escape(())是什么鬼？    
其实仔细一看escape确实接受的是一个参数，这个参数是`(lineno = 1, str)`, 这就是巧妙的运用了圆括号运算规则来实现行号的改变和传参，此处一举多得。

这个圆括号运算实际执行的是，当前环境中直接向缓存写入数据，我们可以打开浏览器控制台试一试这段代码`‘hello’, 23`,你会发现最终显示的是23而不是`hello`, 意思就是当前你在该环境里的缓存中的`xx00`(假设是这个编号)写入了`hello`后由改成数字23了，那如果输入变量有什么结果呢？     
```javascript
let a = null;
a=3, 'hello'
a

// 这里执行后你会发现a=3, 注意->并打印出’hello‘
// 那么我们如何得到hello呢？
// 再执行下面这个操作

let b = (a=4,  'hello');
// b = 'hello'
// 这里我们就能看出括号执行代码的魅力
// 在括号内运算，如果有函数表达式，那么将执行表达式运算，如果没有只是单存给出数据，那么这个数据将直接写入缓存，而此刻如果有一个变量来保存这个缓存中的数据，那么’最终‘这个缓存保存的数据将赋值给执行变量（也就是这里的b）。
```      
通过上面的列子我们就能理解escape((lineno=1, str)), 其实这里执行了两步    
1. lingno = 1 , 改变行号
2. 缓存的str作为参数传入escape()    
你看这是不是有点画龙点睛的意思啊

***

* ### **小心坑**

1. NodeJS中readFileSync方法。

一般我们比较常用的是利用其返回的缓存该文件内容的二进制对象，然后直接将该二进制对象传给下一个需要处理的模块中，而这里我们则需要直接获取到是文件内容（以字符串形式），所以我们做处理。这里有2种处理方式：     
> （1）fs.readFileSync(filename).toString();  
> 通过buffer对象的toString()放法将二进制对象转化为字符串    
> （2）fs.readFileSync(filename, 'utf8');
> 通过配置文件，直接将二进制对象按指定编码格式返回字符串，这个模块文件里就是使用此方式

2. JSON.stringify()方法需要注意的

如果我们将包含一些特殊符号的字符串通过JSON.stringify()方法转换后，虽然在控制台打印出来的效果是一样的，但其实本质是不一样的，JSON.stringify()会将特殊符号进行转义，一旦转义后，我们使用indeOf()方法就可能出现问题。      
> ```
> let str = 'hello
> world';
> ```     
> 原始字符串`str.indexOf('\n')`与`JSON.stringify(str).index('\n')`这里得到的数据是不一样的，这个在ejs的parse函数中特别重要，如果弄不清当前传入的字符串本质那么最终得到的JS字符串就有很大的差别。
> 此刻容易犯一个糊涂，当我们寻找字符串里的换行符时，最终得到的却是空白，这一度让我怀疑这是怎么回事呢？难道无法获取换行符，哈哈，其实如果没有JSON.stringify()来转换字符串那么我们获取字符串内换行符,只能得到一个空白，因为换行符在实际显示中确实是空白不可见的

3. 块级作用域与let & const
 
在ES5中规范中认为函数只能在顶层作用域和函数作用域之中声明，不能在块级作用域声明。      
注意：需要知道块级作用域指的是什么作用域，这里也说明了抛开函数中`{}`外，其他任何`{}`都是块级作用域。

其实在大部分我们写代码中也是遵守这个约定的，没看见谁在if或for循环里声明函数吧。     
但是浏览器为了兼容旧版本代码，默认可以在块级作用域中声明函数，也可以块级之外使用，这就导致我们渐渐模糊掉这个约定（养成不好的吸管）。

而在ES6中，约定可以在块级作用域中声明函数，但声明的函数只能在块级作用域内有效，在块级作用域之外是无法获得

但是为了兼容旧代码，ES6还是默认在块级作用域内的声明的函数以var声明变量来执行，也就是不存在变量提升，

const与let命令只在声明所在的块级作用域内有效，且不存在变量提升。
这而是与var最大的不同

```javascript
let str = "const escape = a || 'null'; \n console.log(escape);";

try {
  const fn = new Function('escape, hello', str);
} catch (err) {
  console.log(err);
}

console.log(`${fn}`);

```

上面的代码存在两个问题：     
1. fn => undifined
2. 会抛出异常

出现这个两个问题的原因：     
1. 就是我们容易认为const与var等价的，所以认为应该能得到fn
2. 在ES6中如果在函数体内部通过const/let声明一个跟参数相同的变量，会报错的（在函数体内默认参数为块级作用域，而const/let是不允许多次声明同一变量）。


