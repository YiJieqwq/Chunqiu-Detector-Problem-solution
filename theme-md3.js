/* ===========================================================
   MD3 主题交互：主题切换（记忆） + 右侧「本页目录」
   =========================================================== */
(function () {
  var KEY = 'cq-theme';

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#141218' : '#FEF7FF');
    var btn = document.getElementById('md3-theme-toggle');
    if (btn) {
      btn.textContent = t === 'dark' ? '☀' : '☾';
      btn.title = t === 'dark' ? '切换到浅色 / Switch to light' : '切换到深色 / Switch to dark';
    }
  }
  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch (e) {}
    applyTheme(next);
  }
  // 初始（尽早，避免闪白）
  try {
    var saved = localStorage.getItem(KEY);
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (e) {}
  applyTheme(currentTheme());
  window.__md3ToggleTheme = toggleTheme;

  /* ---------------- 主题切换按钮 ---------------- */
  function injectToggle() {
    var nav = document.querySelector('.app-nav');
    if (!nav || document.getElementById('md3-theme-toggle')) return;
    var li = document.createElement('li');
    li.className = 'md3-nav-item';
    var btn = document.createElement('button');
    btn.id = 'md3-theme-toggle';
    btn.type = 'button';
    btn.className = 'md3-icon-btn';
    btn.addEventListener('click', toggleTheme);
    li.appendChild(btn);
    nav.appendChild(li);
    applyTheme(currentTheme());
  }

  /* ---------------- 右侧本页目录 ---------------- */
  function slugify(str) {
    // 与 Docsify 内部规则保持一致
    var re = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@\[\]^`{|}~]/g;
    return String(str).trim()
      .replace(/[A-Z]+/g, function (m) { return m.toLowerCase(); })
      .replace(/<[^>]+>/g, '').replace(re, '')
      .replace(/\s/g, '-').replace(/-+/g, '-').replace(/^(\d)/, '_$1');
  }
  function buildTOC() {
    var article = document.querySelector('.markdown-section');
    if (!article) return;
    var old = document.querySelector('.md3-toc');
    if (old) old.remove();

    var headings = [].slice.call(article.querySelectorAll('h2')).filter(function (h) {
      var t = (h.textContent || '').trim();
      return t && t !== '目录' && t !== 'Table of Contents' && t !== '引言';
    });
    if (headings.length < 2) return;

    var toc = document.createElement('nav');
    toc.className = 'md3-toc';
    var isZh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0
      || document.title.indexOf('中文') !== -1;
    var title = document.createElement('div');
    title.className = 'md3-toc-title';
    title.textContent = isZh ? '本页目录' : 'On this page';
    toc.appendChild(title);

    headings.forEach(function (h) {
      var id = h.id || slugify(h.textContent || '');
      if (!h.id) h.id = id;
      var a = document.createElement('a');
      a.href = '#/' + location.hash.replace(/^#\//, '').split('?')[0] + '?id=' + id;
      a.textContent = (h.textContent || '').trim();
      a.dataset.target = id;
      a.addEventListener('click', function (e) {
        // 交给 Docsify 处理路由，同时立即滚动，避免不跳
        setTimeout(function () {
          var el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      });
      toc.appendChild(a);
    });
    document.body.appendChild(toc);

    // 滚动高亮
    var links = [].slice.call(toc.querySelectorAll('a'));
    if (window.__md3Scroll) window.removeEventListener('scroll', window.__md3Scroll);
    window.__md3Scroll = function () {
      var pos = window.scrollY + 110, active = null;
      headings.forEach(function (h) {
        if (h.offsetTop <= pos) active = h.id;
      });
      links.forEach(function (a) {
        a.classList.toggle('active', a.dataset.target === active);
      });
    };
    window.addEventListener('scroll', window.__md3Scroll, { passive: true });
    window.__md3Scroll();
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectToggle(); buildTOC();
  });

  // 接入 Docsify 生命周期
  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(function (hook) {
    hook.doneEach(function () {
      injectToggle();
      buildTOC();
    });
  });
  setInterval(injectToggle, 500);
})();
