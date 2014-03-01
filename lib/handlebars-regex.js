module.exports = function handlebars_regex (handlebars) {
  handlebars = handlebars || require('handlebars');
  var wrapped = !!handlebars.handlebars,
    hbs = wrapped ? handlebars.handlebars : handlebars,
    list = [],
    lexer = hbs.Parser.lexer,
    original_lex = lexer.lex,
    prefix = "{{|{{{",
    parsedPrefix = false;

  hbs.registerRegex = function (regex, fn, inverse) {
    if (inverse) { fn.not = inverse; }
    regex = {
      original: regex,
      before: new RegExp('^(' + prefix + ')' + regex.source.replace(/^\^/, ''), regex.ignoreCase ? 'i' : ''),
      after: new RegExp(regex.source, regex.ignoreCase ? 'i' : '')
    };
    list.push({ regex: regex, fn: fn });
  };
  if (wrapped) { handlebars.registerRegex = hbs.registerRegex; }

  function helperWrapper(fn) {
    var outer_args = Array.prototype.slice.call(arguments, 1);
    return function () {
      var args = Array.prototype.concat.call(outer_args, Array.prototype.slice.call(arguments, 0));
      return fn.apply(this, args);
    }
  }

  lexer.lex = function lex() {
    var i, l, regex, match, token;
    for (i = 0, l = list.length; i < l; i = i + 1) {
      regex = !parsedPrefix ? list[i].regex.before : list[i].regex.after;
      match = this._input.match(regex);
      if (match) {
        if (!parsedPrefix) {
          parsedPrefix = true;
          token = this.next.call(this);
          return typeof token !== 'undefined' ? token : this.lex();
        }
        parsedPrefix = false;
        hbs.registerHelper(match[0], helperWrapper(list[i].fn, [].concat(match)));
        this.conditions.mu.rules.unshift(this.rules.push(regex) - 1);
        token = this.next.call(this) || 35; // 35 is the token for a known block helper
        this.conditions.mu.rules.shift();
        this.rules.pop();
        return typeof token !== 'undefined' ? token : this.lex();
      }
    }
    return original_lex.call(this);
  };

  return handlebars;
}