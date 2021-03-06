require('./Valine.scss');
import snarkdown from 'snarkdown';
var crypto = require('blueimp-md5');

// Gravatar by Deserts
var GRAVATAR_BASE_URL = 'https://gravatar.cat.net/avatar/';

const path = location.pathname;

const defaultComment = {
    ip: '',
    comment: '',
    rid: '',
    at:'',
    nick: '小可爱',
    mail: '',
    link: '',
    ua: navigator.userAgent,
    url: path,
    pin: 0,
    like: 0
};

const toString = {}.toString;
const store = localStorage;

class Valine {
    /**
     * Valine constructor function
     * @param {Object} option
     * @constructor
     */
    constructor(option) {
        let _root = this;
        // version
        _root.version = '1.1.4';
        getIp();
        // Valine init
        !!option && _root.init(option);
    }

    /**
     * Valine Init
     * @param {Object} option
     */
    init(option) {
        let _root = this;
        let av = option.av || _root.v;
        try {
            let el = toString.call(option.el) === "[object HTMLDivElement]" ? option.el : document.querySelectorAll(option.el)[0];
            if (toString.call(el) != '[object HTMLDivElement]') {
                throw `The target element was not found.`;
            }
            _root.el = el;
            _root.el.classList.add('valine');
            let placeholder = option.placeholder || 'ヾﾉ≧∀≦)o来啊，快活啊!';
            let eleHTML = `<div class="vwrap">
                                <div class="textarea-wrapper">
                                    <textarea class="veditor" placeholder="${placeholder}"></textarea>
                                </div>
                                <section class="auth-section">
                                    <div class="input-wrapper"><input type="text" name="author" class="vnick" placeholder="名字" value=""></div>
                                    <div class="input-wrapper"><input type="email" name="email" class="vmail" placeholder="E-mail" value=""></div>
                                    <div class="input-wrapper"><input type="text" name="website" class="vlink" placeholder="网站 (可选)" value=""></div>
                                    <div class="post-action"><button type="button" class="vsubmit">提交</button></div>
                                </section>
                                <div style="display:none;" class="vmark"></div>
                           </div>
                           <div class="info">
                                <div class="col">共 <span class="count"></span> 条评论</div>
                                <div class="col power float-right">
                                    <svg aria-hidden="true" height="16" version="1.1" viewBox="0 0 16 16" width="16"><path fill-rule="evenodd" d="M14.85 3H1.15C.52 3 0 3.52 0 4.15v7.69C0 12.48.52 13 1.15 13h13.69c.64 0 1.15-.52 1.15-1.15v-7.7C16 3.52 15.48 3 14.85 3zM9 11H7V8L5.5 9.92 4 8v3H2V5h2l1.5 2L7 5h2v6zm2.99.5L9.5 8H11V5h2v3h1.5l-2.51 3.5z"></path></svg>
                                    <span>Markdown is supported</span>
                                </div>
                           </div>
                           <ul class="vlist"><li class="vloading"></li><li class="vempty"></li></ul>`;
            _root.el.innerHTML = eleHTML;
            // Empty Data
            let vempty = _root.el.querySelector('.vempty');
            _root.nodata = {
                show(txt) {
                    vempty.innerHTML = txt || `还没有评论哦，快来抢沙发吧!`;
                    vempty.setAttribute('style', 'display:block;');
                },
                hide() {
                    vempty.setAttribute('style', 'display:none;');
                }
            }
            _root.nodata.show();

            av.init({
                appId: option.app_id || option.appId,
                appKey: option.app_key || option.appKey
            });
            _root.v = av;

        } catch (ex) {
            let issue = 'https://github.com/xCss/Valine/issues';
            if (_root.el) _root.nodata.show(`<pre style="color:red;text-align:left;">${ex}<br>Valine:<b>${_root.version}</b><br>反馈：${issue}</pre>`);
            else console && console.log(`%c${ex}\n%cValine%c${_root.version} ${issue}`, 'color:red;', 'background:#000;padding:5px;line-height:30px;color:#fff;', 'background:#456;line-height:30px;padding:5px;color:#fff;');
            return;
        }

        // loading
        let _spinner = `<div class="spinner"><div class="r1"></div><div class="r2"></div><div class="r3"></div><div class="r4"></div><div class="r5"></div></div>`;
        let vloading = _root.el.querySelector('.vloading');
        vloading.innerHTML = _spinner;
        // loading control
        _root.loading = {
            show() {
                vloading.setAttribute('style', 'display:block;');
                _root.nodata.hide();
            },
            hide() {
                vloading.setAttribute('style', 'display:none;');
                _root.el.querySelectorAll('.vcard').length === 0 && _root.nodata.show();
            }
        };


        let _mark = _root.el.querySelector('.vmark');
        // alert
        _root.alert = {
            /**
             * {
             *  type:0/1,
             *  text:'',
             *  ctxt:'',
             *  otxt:'',
             *  cb:fn
             * }
             *
             * @param {Object} o
             */
            show(o) {
                _mark.innerHTML = `<div class="valert txt-center"><div class="vtext">${o.text}</div><div class="vbtns"></div></div>`;
                let _vbtns = _mark.querySelector('.vbtns');
                let _cBtn = `<button class="vcancel vbtn">${ o && o.ctxt || '我再看看' }</button>`;
                let _oBtn = `<button class="vsure vbtn">${ o && o.otxt || '继续提交' }</button>`;
                _vbtns.innerHTML = `${_cBtn}${o.type && _oBtn}`;
                _mark.querySelector('.vcancel').addEventListener('click', function (e) {
                    _root.alert.hide();
                });
                _mark.setAttribute('style', 'display:block;');
                if (o && o.type) {
                    let _ok = _mark.querySelector('.vsure');
                    Event.on('click', _ok, (e) => {
                        _root.alert.hide();
                        o.cb && o.cb();
                    });
                }
            },
            hide() {
                _mark.setAttribute('style', 'display:none;');
            }
        }

        _root.loading.show();
        // Build Query
        let query = new _root.v.Query('Comment');
        query.select(['nick', 'comment', 'link', 'rid', 'isSpam', 'emailHash', 'like', 'pin']);
        query.equalTo('url', path);
        query.descending('createdAt');
        query.limit('1000');
        query.find().then(rets => {
            // let _temp = [];
            let len = rets.length;
            _root.el.querySelector('.count').innerHTML = `${len}`;
            if (len) {
                for (let i = len - 1; i > -1; i--) {
                    let commentItem = rets[i];
                    if (commentItem.get('isSpam')) {
                        continue;
                    }
                    let _vcard = document.createElement('li');
                    _vcard.setAttribute('class', 'vcard');
                    _vcard.setAttribute('id', commentItem.id);
                    let gravatar_url = GRAVATAR_BASE_URL + commentItem.get('emailHash') + '?size=96';
                    // language=HTML
                    _vcard.innerHTML = `<img class="vavatar" src="${gravatar_url}"/>
                                        <div class="text-wrapper">
                                            <div class="vhead" >
                                                <a href="${commentItem.get('link') || 'javascript:void(0);'}" target="_blank" rel="nofollow" > ${commentItem.get("nick")}</a>
                                                <span class="spacer">•</span><span class="vtime">${dateFormat(commentItem.get("createdAt"))}</span>
                                            </div>
                                            <div class="vcomment">${commentItem.get('comment')}</div>
                                            <a rid='${commentItem.id}' at='@${commentItem.get('nick')}' class="vat">回复</a>
                                        </div>`;

                    let _vlist = _root.el.querySelector('.vlist');
                    let _vlis = _vlist.querySelectorAll('li');
                    let _vat = _vcard.querySelector('.vat');
                    let _as = _vcard.querySelectorAll('a');
                    for (let k in _as) {
                        if (_as.hasOwnProperty(k)) {
                            let item = _as[k];
                            if (item.getAttribute('class') != 'at') {
                                item.setAttribute('target', '_blank');
                                item.setAttribute('rel', 'nofollow');
                            }
                        }
                    }
                    _root.bindAt(_vat);
                    _vlist.insertBefore(_vcard, _vlis[1]);
                }
            }
            _root.loading.hide();
        }).catch(ex => {
            //err(ex)
            _root.loading.hide();
        })

        // Bind Event
        _root.bind();
    }

    /**
     * Bind Event
     */
    bind() {
        let _root = this;

        let mapping = {
            veditor: "comment",
            vnick: "nick",
            vlink: "link",
            vmail: 'mail'
        };
        let inputs = {};
        for (let i in mapping) {
            if (mapping.hasOwnProperty(i)) {
                let _v = mapping[i];
                let _el = _root.el.querySelector(`.${i}`);
                inputs[_v] = _el;
                Event.on('input', _el, (e) => {
                    defaultComment[_v] = HtmlUtil.encode(_el.value.replace(/(^\s*)|(\s*$)/g, ""));
                });
            }
        }

        // cache
        let getCache = () => {
            let s = store && store.getItem('ValineCache');
            if (!!s) {
                s = JSON.parse(s);
                let m = ['nick', 'link', 'mail'];
                for (let i in m) {
                    let k = m[i];
                    _root.el.querySelector(`.v${k}`).value = s[k];
                    defaultComment[k] = s[k];
                }
            }
        }
        getCache();

        // reset form
        _root.reset = () => {
            for (let i in mapping) {
                if (mapping.hasOwnProperty(i)) {
                    let _v = mapping[i];
                    let _el = _root.el.querySelector(`.${i}`);
                    _el.value = "";
                    defaultComment[_v] = "";
                }
            }
            defaultComment['rid'] = '';
            defaultComment['nick'] = '小可爱';
            getCache();
        }

        // submit
        let submitBtn = _root.el.querySelector('.vsubmit');
        let submitEvt = (e) => {
            if (submitBtn.getAttribute('disabled')) {
                _root.alert.show({
                    type: 0,
                    text: '再等等，评论正在提交中ヾ(๑╹◡╹)ﾉ"',
                    ctxt: '好的'
                })
                return;
            }
            if (defaultComment.comment == '') {
                inputs['comment'].focus();
                return;
            }
            if (defaultComment.nick == '') {
                defaultComment['nick'] = '小调皮';
            }

            defaultComment.comment = snarkdown(defaultComment.comment);
            let idx = defaultComment.comment.indexOf(defaultComment.at);
            if (idx > -1 && defaultComment.at != '') {
                let at = `<a class="at" href='#${defaultComment.rid}'>${defaultComment.at}</a>`;
                defaultComment.comment = defaultComment.comment.replace(defaultComment.at, at);
            }
            // veirfy
            let mailRet = check.mail(defaultComment.mail);
            let linkRet = check.link(defaultComment.link);
            if (!mailRet.k && defaultComment.link.length !== 0 && !linkRet.k) {
                defaultComment['mail'] = '';
                defaultComment['link'] = '';
                _root.alert.show({
                    type: 1,
                    text: '您的网址和邮箱格式不正确, 是否继续提交?',
                    cb() {
                        commitEvt();
                    }
                })
            } else if (!mailRet.k) {
                defaultComment['mail'] = '';
                defaultComment['link'] = linkRet.v;
                _root.alert.show({
                    type: 1,
                    text: '您的邮箱格式不正确, 是否继续提交?',
                    cb() {
                        commitEvt();
                    }
                })
            } else if (defaultComment.link.length !== 0 && !linkRet.k) {
                defaultComment['link'] = '';
                defaultComment['mail'] = mailRet.v;
                _root.alert.show({
                    type: 1,
                    text: '您的网址格式不正确, 是否继续提交?',
                    cb() {
                        commitEvt();
                    }
                })
            } else {
                defaultComment['mail'] = mailRet.v;
                defaultComment['link'] = linkRet.v;
                commitEvt();
            }
        }

        // setting access
        let getAcl = () => {
            let acl = new _root.v.ACL();
            acl.setPublicReadAccess(true);
            acl.setPublicWriteAccess(false);
            return acl;
        }

        let commitEvt = () => {
            submitBtn.setAttribute('disabled', true);
            _root.loading.show();
            // 声明类型
            let Ct = _root.v.Object.extend('Comment');
            // 新建对象
            let comment = new Ct();
            for (let i in defaultComment) {
                if (defaultComment.hasOwnProperty(i)) {
                    if (i === 'at')
                        continue;
                    let _v = defaultComment[i];
                    comment.set(i, _v);
                }
            }
            comment.set('emailHash', crypto(defaultComment.mail.toLowerCase().trim()));
            comment.setACL(getAcl());
            comment.save().then((commentItem) => {
                store && store.setItem('ValineCache', JSON.stringify({
                    nick: defaultComment['nick'],
                    link: defaultComment['link'],
                    mail: defaultComment['mail']
                }));
                let _count = _root.el.querySelector('.count');
                _count.innerText = Number(_count.innerText) + 1;
                let _vcard = document.createElement('li');
                _vcard.setAttribute('class', 'vcard');
                _vcard.setAttribute('id', commentItem.id);
                let gravatar_url = GRAVATAR_BASE_URL + commentItem.get('emailHash') + '?size=96';
                // language=HTML
                _vcard.innerHTML = `<img class="vavatar" src="${gravatar_url}"/>
                                    <div class="text-wrapper">
                                    <div class="vhead" >
                                    <a href="${commentItem.get('link') || 'javascript:void(0);'}" target="_blank" rel="nofollow" >${commentItem.get('nick')}</a>
                                    <span class="spacer">•</span><span class="vtime">${dateFormat(commentItem.get("createdAt"))}</span>
                                    </div>
                                    <div class="vcomment">${commentItem.get('comment')}</div>
                                    <a rid='${commentItem.id}' at='@${commentItem.get('nick')}' class="vat">回复</a>
                                    </div>`;

                let _vlist = _root.el.querySelector('.vlist');
                let _vlis = _vlist.querySelectorAll('li');
                let _as = _vcard.querySelectorAll('a');
                for (let k in _as) {
                    if (_as.hasOwnProperty(k)) {
                        let item = _as[k];
                        if (item.getAttribute('class') !== 'at') {
                            item.setAttribute('target', '_blank');
                            item.setAttribute('rel', 'nofollow');
                        }
                    }
                }
                let _vat = _vcard.querySelector('.vat');
                _root.bindAt(_vat);
                _vlist.insertBefore(_vcard, _vlis[1]);

                submitBtn.removeAttribute('disabled');
                _root.loading.hide();
                _root.reset();
            }).catch(ex => {
                _root.loading.hide();
            })
        }

        // at event
        _root.bindAt = (el) => {
            Event.on('click', el, (e) => {
                let at = el.getAttribute('at');
                let rid = el.getAttribute('rid');
                defaultComment['rid'] = rid;
                defaultComment['at'] = at;
                inputs['comment'].value = `${at} ，` + inputs['comment'].value;
                inputs['comment'].focus();
            })
        }

        Event.off('click', submitBtn, submitEvt);
        Event.on('click', submitBtn, submitEvt);
    }
}

const Event = {
    on(type, el, handler, capture) {
        if (el.addEventListener) el.addEventListener(type, handler, capture || false);
        else if (el.attachEvent) el.attachEvent(`on${type}`, handler);
        else el[`on${type}`] = handler;
    },
    off(type, el, handler, capture) {
        if (el.removeEventListener) el.removeEventListener(type, handler, capture || false);
        else if (el.detachEvent) el.detachEvent(`on${type}`, handler);
        else el[`on${type}`] = null;
    }
}

const check = {
    mail(m) {
        return {
            k: /[\w-\.]+@([\w-]+\.)+[a-z]{2,3}/.test(m),
            v: m
        };
    },
    link(l) {
        if (l.length > 0) {
            l = /^(http|https)/.test(l) ? l : `http://${l}`;
        }
        return {
            k: /(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/.test(l),
            v: l
        };
    }
}

const HtmlUtil = {

    // /**
    //  *
    //  * 将str中的链接转换成a标签形式
    //  * @param {String} str
    //  * @returns
    //  */
    // transUrl(str) {
    //     let reg = /(http:\/\/|https:\/\/)((\w|=|\?|\.|\/|&|-)+)/g;
    //     return str.replace(reg, '<a target="_blank" href="$1$2">$1$2</a>');
    // },
    /**
     * HTML转码
     * @param {String} str
     * @return {String} result
     */
    encode(str) {
        return !!str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;").replace(/\'/g, "&#39;").replace(/\"/g, "&quot;") : '';
    },
    /**
     * HTML解码
     * @param {String} str
     * @return {String} result
     */
    decode(str) {
        return !!str ? str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#39;/g, "\'").replace(/&quot;/g, "\"") : '';
    }
};

const dateFormat = (date) => {
    var vDay = padWithZeros(date.getDate(), 2);
    var vMonth = padWithZeros(date.getMonth() + 1, 2);
    var vYear = padWithZeros(date.getFullYear(), 2);
    // var vHour = padWithZeros(date.getHours(), 2);
    // var vMinute = padWithZeros(date.getMinutes(), 2);
    // var vSecond = padWithZeros(date.getSeconds(), 2);
    return `${vYear}-${vMonth}-${vDay}`;
    // return `${vYear}-${vMonth}-${vDay} ${vHour}:${vMinute}:${vSecond}`;
}

const padWithZeros = (vNumber, width) => {
    var numAsString = vNumber.toString();
    while (numAsString.length < width) {
        numAsString = '0' + numAsString;
    }
    return numAsString;
}

const loadJS = function (url, success) {
    var domScript = document.createElement('script');
    domScript.src = url;
    success = success || function () {
    };
    domScript.onload = domScript.onreadystatechange = function () {
        if (!this.readyState || 'loaded' === this.readyState || 'complete' === this.readyState) {
            success();
            this.onload = this.onreadystatechange = null;
            // this.parentNode.removeChild(this);
        }
    };
    document.getElementsByTagName('head')[0].appendChild(domScript);
};

const getIp = function(){
    $.getJSON("https://api.ip.sb/jsonip?callback=?",
        function(json) {
            defaultComment['ip'] = json.ip;
        }
    );
};
module.exports = Valine;
