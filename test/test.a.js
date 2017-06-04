// 解析の最小単位は行
var a = "hoge[link1][link2]hoga";
var b = "daiki [link] [link] iizuka";
var n = "I am [daiiz https://scrapbox.io/daiiz/]!";
var m = "I am [daiiz https://scrapbox.io/daiiz/daiiz#eeee]!"
var s = "I am [daiiz https://scrapbox.io/daiiz/daiiz#5844e99dadf4e700000995de]! [daiiz]"
var c = "[* bold]";
var d = "[/ italic]";
var cd = "[*/ italic-bold]";
var s3 = "[a b c] & [/a b c]";
var icon = "[daiiz.icon] [/daiiz/daiiz.icon*3]";
var il = "foo!! [https://gyazo.com/bbbfc7fc6c0b473d10b60c86fd09da81 http://Image]"
var e = "[* [/ iizuka] foo]";

var bb = "[[bold]]";
var cc = "[* [daiiz.icon]]";
//var e = "`code`";
var f = "[/** [/ [* d] [f] ]]";
var g = "[/** [/ [* d]] aaa]";
var h = "[a] [b] [* c[d]]"


console.info('test.a!');
//var project = window.encodeURIComponent(window.location.href.match(/scrapbox.io\/([^\/.]*)/)[1]);
var project = 'daiiz';

var BRACKET_OPEN = '[';
var DOUBLE_BRACKET_OPEN = '[[';
var BRACKET_CLOSE = ']';
var DOUBLE_BRACKET_CLOSE = ']]';
var INLINE_CODE = '`';
var openCodeBlock = false;

var decorate = function (str, strOpenMark, depth) {
  var html = '';
  var tagOpen = [];
  var tagClose = [];
  if (strOpenMark === BRACKET_OPEN) {
    // リンク，装飾
    var body = str.replace(/^\[/, '').replace(/\]$/, '');
    var words = body.split(' ');
    if (words.length >= 2) {
      var pear = makePear(words);
      var p0 = pear[0];
      var p1 = pear[1];
      if (p0.startsWith('http')) {
        // リンク(別名記法)
        body = p1;
        var href = p0;
        tagOpen.push(`<a href="${encodeHref(href)}" class="daiiz-ref-link">`);
        tagClose.push('</a>');
      }else {
        var f = true;

        // 太字, 斜体
        if (p0.indexOf('*') >= 0) {
          body = p1;
          tagOpen.push('<b>');
          tagClose.push('</b>');
          f = false;
        }
        if (p0.indexOf('/') >= 0) {
          body = p1;
          tagOpen.push('<i>');
          tagClose.push('</i>');
          f = false;
        }

        if (f) {
          // 半角空白を含むタイトルのページ
          body = words.join(' ');
          var href = (body[0] === '/') ? body : `/${project}/${body}`;
          tagOpen.push(`<a href="${encodeHref(href)}" class="page-link">`);
          tagClose.push('</a>');
        }
      }
      var img = makeImageTag(body);
      if (img[1]) body = img[0];
    }else {
      // リンク, 画像
      tagOpen.push('<a>');
      tagClose.push('</a>');
      var img = makeImageTag(body);
      if (img[1]) {
        tagOpen = [];
        tagClose = [];
        body = img[0];
      }
    }
  }

  return `${tagOpen.join('')}${body}${tagClose.reverse().join('')}`;
};

var makePear = function (words) {
  var w0 = words[0];
  var wL = words[words.length - 1];
  var pear = [];
  if (wL.startsWith('http')) {
    pear.push(wL);
    pear.push(words.slice(0, words.length - 1).join(' '));
  }else {
    pear.push(w0);
    pear.push(words.slice(1, words.length).join(' '));
  }

  if (pear[0].startsWith('http') && pear[1].startsWith('http')) {
    var a = (pear[0].endsWith('.jpg') || pear[0].endsWith('.png') || pear[0].endsWith('.gif'));
    var b = (pear[0].startsWith('https://gyazo.com/') || pear[0].startsWith('http://gyazo.com/'));
    if (a || b) {
      pear.reverse();
    }
  }
  return pear;
}

var encodeHref = function (url) {
  var toks = url.split('/');
  var pageName = toks.pop();
  var pageRowNum = pageName.match(/#.{24}$/); // 行リンク対応
  if (pageRowNum) {
    var n = pageRowNum[0];
    pageName = window.encodeURIComponent(pageName.split(n)[0]) + n;
  }else {
    pageName = window.encodeURIComponent(pageName);
  }
  return toks.join('/') + (url[0] === '/' || url.startsWith('http') ? '/' : '') + pageName;
};

// 画像になる可能性があるものに対処
var makeImageTag = function (keyword) {
  keyword = keyword.trim();
  var img = '';
  var isImg = true;
  if (keyword.match(/\.icon\**\d*$/gi)) {
    var iconName = keyword.split('.icon')[0];
    if (iconName.charAt(0) !== '/') {
      iconName = '/' + project + '/' + iconName;
    }
    var toks = keyword.split('*');
    var times = 1;
    if (toks.length === 2) times = +toks[1];
    for (var i = 0; i < times; i++) {
      img += `<img class="daiiz-tiny-icon" src="https://scrapbox.io/api/pages${iconName}/icon">`;
    }
  }else if (keyword.endsWith('.jpg') || keyword.endsWith('.png') || keyword.endsWith('.gif')) {
    img = `<img class="daiiz-small-img" src="${keyword}">`;
  }else if (keyword.startsWith('https://gyazo.com/') || keyword.startsWith('http://gyazo.com/')) {
    img = `<img class="daiiz-small-img" src="${keyword}/raw">`;
  }else {
    img = keyword;
    isImg = false;
  }
  return [img, isImg];
};


/** 括弧解析 */
var dicts = [];
var parse = function (fullStr, startIdx, depth, seekEnd) {
  var l = fullStr.length;
  var startIdxkeep = startIdx;
  while (startIdx < l) {
    var subStr = fullStr.substring(startIdx, l);
    //console.info(depth, subStr);

    if (subStr.startsWith(BRACKET_OPEN)) {
      var token = parse(fullStr, startIdx + 1, depth + 1, BRACKET_CLOSE);
      //console.info('>', token[0], token[1], fullStr.substring(token[0], token[1]));

      // 記法記号を含む抽出文字列
      var str = BRACKET_OPEN + fullStr.substring(token[0], token[1]) + BRACKET_CLOSE;
      var res = decorate(str, BRACKET_OPEN, depth);
      //res = res.replace(str, html);
      var trans = {};
      trans[str] = res;
      dicts.push(trans);
      console.log(depth, str);
      startIdx = token[1];
    }

    if (subStr.startsWith(seekEnd)) {
      return [startIdxkeep, startIdx];
    }

    startIdx++;
  }

  // 置換する順番に格納されている
  dicts.push(fullStr);
  dicts.reverse();

  var result = fullStr;
  for (var i = 1; i < dicts.length; i++) {
    var key = Object.keys(dicts[i])[0];
    result = result.replace(key, dicts[i][key]);
  }
  console.info(dicts);

  return result;
};


var parseRow = function (row) {
  dicts = [];
  var res = parse(row, 0, 0, null);
  console.info(res);
};

parseRow(il);
