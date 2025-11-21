// functions/[slug]/index.js

// 辅助函数：SHA256
async function sha256(str) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 辅助函数：获取 Cookie
function getCookie(request, name) {
  const cookieString = request.headers.get('Cookie');
  if (!cookieString) return null;
  const cookies = cookieString.split(';');
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value;
  }
  return null;
}

// --- 1. 登录页面 HTML ---
const loginHtml = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>访问验证</title>
    <style>
        :root {
            --error-color: #f87171; 
            --success-color: #4ade80;
            transition: background-color 0.3s, color 0.3s;
        }
        [data-theme="light"] {
            --accent-color: #ca8a04; /* 日间模式：更深的琥珀色，提高对比度 */
            --accent-hover: #a16207;
            --bg-color: #f3f4f6;
            --container-bg: #ffffff;
            --input-bg: #f9fafb;
            --border-color: #e5e7eb;
            --text-color: #1f2937;
            --subtle-text: #6b7280;
            --particle-color: rgba(0, 0, 0, 0.08);
        }
        [data-theme="dark"] {
            --accent-color: #facc15; /* 夜间模式：保持原有的亮黄色 */
            --accent-hover: #eab308;
            --bg-color: #111827;
            --container-bg: #1f2937;
            --input-bg: #374151;
            --border-color: #4b5563;
            --text-color: #f3f4f6;
            --subtle-text: #9ca3af;
            --particle-color: rgba(255, 255, 255, 0.08);
        }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            background-color: var(--bg-color); 
            color: var(--text-color); 
            margin: 0; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            padding: 1rem; 
            box-sizing: border-box; 
            overflow: hidden;
        }
        #particle-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; }
        .container { 
            width: 100%; max-width: 400px; 
            background-color: var(--container-bg); 
            border-radius: .75rem; 
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, .25); 
            padding: 2rem; position: relative; z-index: 1; text-align: center;
        }
        h1 { margin-bottom: 1.5rem; font-size: 1.8rem; }
        input { 
            width: 100%; padding: .75rem 1rem; margin-bottom: 1rem;
            background-color: var(--bg-color); border: 1px solid var(--border-color); 
            border-radius: .5rem; color: var(--text-color); font-size: 1rem; box-sizing: border-box;
            transition: border-color .2s, box-shadow .2s; 
        }
        input:focus { outline: none; border-color: var(--accent-color); box-shadow: 0 0 0 3px rgba(var(--accent-color), .3); }
        button { 
            width: 100%; padding: .75rem 1.5rem; background-color: var(--accent-color); 
            color: #fff; border: none; border-radius: .5rem; font-weight: 600; font-size: 1rem; 
            cursor: pointer; transition: background-color .2s; 
        }
        [data-theme="light"] button { color: #fff; } /* 日间模式按钮文字白色 */
        [data-theme="dark"] button { color: #000; } /* 夜间模式按钮文字黑色 */
        button:hover { background-color: var(--accent-hover); }
        button:disabled { opacity: 0.7; cursor: not-allowed; }
        .error { 
            color: var(--error-color); margin-top: 1rem; font-size: 0.9rem; display: none; 
            background-color: rgba(248, 113, 113, .1); padding: 0.5rem; border-radius: 0.5rem; 
            border: 1px solid var(--error-color);
        }
        .top-bar { position: fixed; top: 1rem; right: 1rem; display: flex; gap: 0.5rem; align-items: center; z-index: 10; }
        .icon-btn {
            background: var(--container-bg); border: 1px solid var(--border-color); color: var(--text-color);
            width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            cursor: pointer; text-decoration: none; transition: background-color 0.2s, transform 0.2s; padding: 0;
        }
        .icon-btn:hover { background-color: var(--input-bg); transform: scale(1.05); }
        .icon-btn svg { width: 20px; height: 20px; fill: currentColor; }
        .icon-btn svg[stroke] { fill: none; }
    </style>
</head>
<body>
<canvas id="particle-canvas"></canvas>
<div class="top-bar">
    <a href="https://github.com/Jacky088/Edgeone-ShortURL" target="_blank" class="icon-btn" title="Jacky088/Edgeone-ShortURL">
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
    </a>
    <button id="theme-toggle" class="icon-btn" title="切换模式">
        <svg id="icon-sun" style="display: none;" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"></path></svg>
        <svg id="icon-moon" style="display: none;" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"></path></svg>
    </button>
</div>
<div class="container">
    <h1>请输入访问口令</h1>
    <form id="login-form">
        <input type="password" id="password" placeholder="输入口令..." required>
        <button type="submit" id="btn">验证</button>
    </form>
    <div class="error" id="error-msg">口令错误</div>
</div>
<script>
    const themeToggleBtn = document.getElementById('theme-toggle'); const iconSun = document.getElementById('icon-sun'); const iconMoon = document.getElementById('icon-moon'); const htmlEl = document.documentElement;
    const storedTheme = localStorage.getItem('theme'); if (storedTheme) setTheme(storedTheme); else setTheme('light');
    function setTheme(theme) { htmlEl.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); if (theme === 'dark') { iconSun.style.display = 'block'; iconMoon.style.display = 'none'; } else { iconSun.style.display = 'none'; iconMoon.style.display = 'block'; } if (window.initParticles) window.initParticles(); }
    themeToggleBtn.addEventListener('click', () => { const currentTheme = htmlEl.getAttribute('data-theme'); setTheme(currentTheme === 'dark' ? 'light' : 'dark'); });
    const canvas = document.getElementById('particle-canvas'); const ctx = canvas.getContext('2d'); let particles = [], animationId;
    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', () => { resizeCanvas(); window.initParticles(); });
    class Particle { constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5; this.size = Math.random() * 2 + 1; } update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > canvas.width) this.vx *= -1; if (this.y < 0 || this.y > canvas.height) this.vy *= -1; } draw(color) { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); } }
    window.initParticles = function() { if (animationId) cancelAnimationFrame(animationId); particles = []; resizeCanvas(); const particleCount = Math.min(100, (canvas.width * canvas.height) / 15000); for (let i = 0; i < particleCount; i++) { particles.push(new Particle()); } animate(); }
    function animate() { const style = getComputedStyle(document.documentElement); const color = style.getPropertyValue('--particle-color').trim(); ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach((p, index) => { p.update(); p.draw(color); for (let j = index + 1; j < particles.length; j++) { const p2 = particles[j]; const dx = p.x - p2.x; const dy = p.y - p2.y; const distance = Math.sqrt(dx*dx + dy*dy); if (distance < 100) { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 0.5; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); } } }); animationId = requestAnimationFrame(animate); }
    window.initParticles();
    const form = document.getElementById('login-form'); const btn = document.getElementById('btn'); const errMsg = document.getElementById('error-msg');
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); btn.disabled = true; btn.innerText = '验证中...'; const password = document.getElementById('password').value;
        try {
            const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
            if (res.ok) { window.location.reload(); } else { errMsg.style.display = 'block'; errMsg.textContent = '口令错误'; btn.disabled = false; btn.innerText = '验证'; }
        } catch (err) { errMsg.style.display = 'block'; errMsg.textContent = '网络错误'; btn.disabled = false; btn.innerText = '验证'; }
    });
</script>
</body>
</html>`;

// --- 2. 主生成器 HTML ---
const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>短链接生成器</title>
    <meta name="description" content="短链接生成您提供短网址在线生成，短链接生成，支持连接缩短，免费提供API接口。" />
    <style>
        :root { --error-color: #f87171; --success-color: #4ade80; transition: background-color 0.3s, color 0.3s; }
        [data-theme="light"] {
            --accent-color: #ca8a04; /* 日间模式：更深的琥珀色 */
            --accent-hover: #a16207;
            --bg-color: #f3f4f6; --container-bg: #ffffff; --input-bg: #f9fafb; --border-color: #e5e7eb; --text-color: #1f2937; --subtle-text: #6b7280; --particle-color: rgba(0, 0, 0, 0.08);
        }
        [data-theme="dark"] {
            --accent-color: #facc15; /* 夜间模式：保持原有的亮黄色 */
            --accent-hover: #eab308;
            --bg-color: #111827; --container-bg: #1f2937; --input-bg: #374151; --border-color: #4b5563; --text-color: #f3f4f6; --subtle-text: #9ca3af; --particle-color: rgba(255, 255, 255, 0.08);
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: var(--bg-color); color: var(--text-color); margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 1rem; box-sizing: border-box; overflow: hidden; }
        #particle-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; }
        .container { width: 100%; max-width: 600px; background-color: var(--container-bg); border-radius: .75rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, .25); padding: 2rem; position: relative; z-index: 1; }
        h1 { text-align: center; margin-bottom: 2rem; font-size: 2.25rem; }
        form { background-color: var(--input-bg); padding: 1rem; border-radius: .5rem; margin-bottom: 1rem; border: 1px solid var(--border-color); }
        .form-main { display: flex; gap: .5rem; }
        #url-input { flex-grow: 1; padding: .75rem 1rem; background-color: var(--bg-color); border: 1px solid var(--border-color); border-radius: .5rem; color: var(--text-color); font-size: 1rem; transition: border-color .2s, box-shadow .2s; }
        #url-input:focus { outline: none; border-color: var(--accent-color); box-shadow: 0 0 0 3px rgba(var(--accent-color), .3); }
        .advanced-options { margin-top: 1rem; }
        .advanced-options label { display: flex; align-items: center; gap: .5rem; color: var(--subtle-text); }
        #slug-input { padding: .5rem; background-color: var(--bg-color); border: 1px solid var(--border-color); border-radius: .5rem; color: var(--text-color); }
        button { padding: .75rem 1.5rem; background-color: var(--accent-color); color: #fff; border: none; border-radius: .5rem; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background-color .2s; }
        [data-theme="light"] button { color: #fff; }
        [data-theme="dark"] button { color: #000; }
        button:hover { background-color: var(--accent-hover); }
        button:disabled { background-color: var(--subtle-text); cursor: not-allowed; opacity: 0.7; }
        #error-message, #success-message { text-align: center; margin-bottom: 1rem; padding: .75rem; border-radius: .5rem; display: none; transition: opacity .3s ease-in-out; }
        #error-message { color: var(--error-color); background-color: rgba(248, 113, 113, .1); border: 1px solid var(--error-color); }
        #success-message { color: var(--success-color); background-color: rgba(74, 222, 128, .1); border: 1px solid var(--success-color); }
        #success-message a { font-weight: 600; color: var(--accent-color); text-decoration: none; }
        #success-message .copy-btn { margin-left: 1rem; background-color: var(--input-bg); color: var(--text-color); padding: .25rem .75rem; font-size: .8rem; border-radius: .5rem; border: 1px solid var(--border-color); cursor: pointer; }
        #success-message .copy-btn:hover { background-color: var(--border-color); }
        .top-bar { position: fixed; top: 1rem; right: 1rem; display: flex; gap: 0.5rem; align-items: center; z-index: 10; }
        .icon-btn { background: var(--container-bg); border: 1px solid var(--border-color); color: var(--text-color); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; transition: background-color 0.2s, transform 0.2s; padding: 0; }
        .icon-btn:hover { background-color: var(--input-bg); transform: scale(1.05); }
        .icon-btn svg { width: 20px; height: 20px; fill: currentColor; }
    </style>
</head>
<body>
<canvas id="particle-canvas"></canvas>
<div class="top-bar">
    <a href="https://github.com/Jacky088/Edgeone-ShortURL" target="_blank" class="icon-btn" title="Jacky088/Edgeone-ShortURL">
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
    </a>
    <button id="theme-toggle" class="icon-btn" title="切换模式">
        <svg id="icon-sun" style="display: none;" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"></path></svg>
        <svg id="icon-moon" style="display: none;" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"></path></svg>
    </button>
</div>
<div class="container">
    <h1>短链接生成器</h1>
    <form id="link-form">
        <div class="form-main">
            <input type="url" id="url-input" placeholder="请输入长链接" required>
            <button type="submit" id="submit-btn">生成</button>
        </div>
        <div class="advanced-options">
            <label>自定义短链接 (可选): <input type="text" id="slug-input" placeholder="例如: my-link"></label>
        </div>
    </form>
    <div id="error-message"></div>
    <div id="success-message"></div>
</div>
<script>
    const themeToggleBtn = document.getElementById('theme-toggle'); const iconSun = document.getElementById('icon-sun'); const iconMoon = document.getElementById('icon-moon'); const htmlEl = document.documentElement;
    const storedTheme = localStorage.getItem('theme'); if (storedTheme) setTheme(storedTheme); else setTheme('light');
    function setTheme(theme) { htmlEl.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); if (theme === 'dark') { iconSun.style.display = 'block'; iconMoon.style.display = 'none'; } else { iconSun.style.display = 'none'; iconMoon.style.display = 'block'; } if (window.initParticles) window.initParticles(); }
    themeToggleBtn.addEventListener('click', () => { const currentTheme = htmlEl.getAttribute('data-theme'); setTheme(currentTheme === 'dark' ? 'light' : 'dark'); });
    const canvas = document.getElementById('particle-canvas'); const ctx = canvas.getContext('2d'); let particles = [], animationId;
    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', () => { resizeCanvas(); window.initParticles(); });
    class Particle { constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5; this.size = Math.random() * 2 + 1; } update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > canvas.width) this.vx *= -1; if (this.y < 0 || this.y > canvas.height) this.vy *= -1; } draw(color) { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); } }
    window.initParticles = function() { if (animationId) cancelAnimationFrame(animationId); particles = []; resizeCanvas(); const particleCount = Math.min(100, (canvas.width * canvas.height) / 15000); for (let i = 0; i < particleCount; i++) { particles.push(new Particle()); } animate(); }
    function animate() { const style = getComputedStyle(document.documentElement); const color = style.getPropertyValue('--particle-color').trim(); ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach((p, index) => { p.update(); p.draw(color); for (let j = index + 1; j < particles.length; j++) { const p2 = particles[j]; const dx = p.x - p2.x; const dy = p.y - p2.y; const distance = Math.sqrt(dx*dx + dy*dy); if (distance < 100) { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 0.5; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); } } }); animationId = requestAnimationFrame(animate); }
    window.initParticles();
    const form = document.getElementById('link-form'); const urlInput = document.getElementById('url-input'); const slugInput = document.getElementById('slug-input'); const submitBtn = document.getElementById('submit-btn'); const errorMessage = document.getElementById('error-message'); const successMessage = document.getElementById('success-message');
    async function createLink(e) { e.preventDefault(); const originalUrl = urlInput.value; if (!originalUrl) return; const customSlug = slugInput.value.trim(); setLoading(true); errorMessage.style.display = 'none'; successMessage.style.display = 'none'; try { const payload = { url: originalUrl }; if (customSlug) payload.slug = customSlug; const res = await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (res.status === 401) { window.location.reload(); return; } if (!res.ok) { const { error } = await res.json(); throw new Error(error || '创建链接失败。'); } const newLink = await res.json(); urlInput.value = ''; slugInput.value = ''; showSuccess(newLink); } catch (err) { showError(err.message); } finally { setLoading(false); } }
    function showSuccess(newLink) { const shortUrl = \`\${window.location.origin}/\${newLink.slug}\`; successMessage.innerHTML = \`<span>成功！链接为: <a href="\${shortUrl}" target="_blank">\${shortUrl.replace(/^https?:\\/\\//, '')}</a></span><button class="copy-btn" data-url="\${shortUrl}">复制</button>\`; successMessage.style.display = 'block'; }
    function setLoading(isLoading) { submitBtn.disabled = isLoading; submitBtn.textContent = isLoading ? '生成中...' : '生成'; }
    function showError(message) { errorMessage.textContent =  message; errorMessage.style.display = 'block'; }
    document.addEventListener('click', (e) => { if (e.target.classList.contains('copy-btn')) { navigator.clipboard.writeText(e.target.dataset.url).then(() => { e.target.textContent = '已复制!'; setTimeout(() => { e.target.textContent = '复制'; }, 1500); }); } });
    form.addEventListener('submit', createLink);
</script>
</body>
</html>`;

// --- 3. 管理后台 HTML ---
const adminHtml = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理后台 - 短链接</title>
    <style>
        :root { --error-color: #f87171; --success-color: #4ade80; transition: background-color 0.3s, color 0.3s; }
        [data-theme="light"] {
            --accent-color: #ca8a04; /* 日间模式：更深的琥珀色 */
            --accent-hover: #a16207;
            --bg-color: #f3f4f6; --container-bg: #ffffff; --input-bg: #f9fafb; --border-color: #e5e7eb; --text-color: #1f2937; --subtle-text: #6b7280; --particle-color: rgba(0, 0, 0, 0.08);
        }
        [data-theme="dark"] {
            --accent-color: #facc15; /* 夜间模式：保持原有的亮黄色 */
            --accent-hover: #eab308;
            --bg-color: #111827; --container-bg: #1f2937; --input-bg: #374151; --border-color: #4b5563; --text-color: #f3f4f6; --subtle-text: #9ca3af; --particle-color: rgba(255, 255, 255, 0.08);
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: var(--bg-color); color: var(--text-color); margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 1rem; box-sizing: border-box; overflow-x: hidden; }
        #particle-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; }
        .container { width: 100%; max-width: 900px; background-color: var(--container-bg); border-radius: .75rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, .25); padding: 2rem; position: relative; z-index: 1; }
        h1 { text-align: center; margin-bottom: 1.5rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { padding: .75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-color); }
        .delete-btn { background-color: var(--error-color); color: #fff; border: none; padding: .25rem .75rem; border-radius: .5rem; cursor: pointer; transition: background-color .2s; }
        .delete-btn:hover { background-color: #ef4444; }
        a { color: var(--accent-color); text-decoration: none; }
        a:hover { text-decoration: underline; }
        .top-bar { position: fixed; top: 1rem; right: 1rem; display: flex; gap: 0.5rem; align-items: center; z-index: 10; }
        .icon-btn { background: var(--container-bg); border: 1px solid var(--border-color); color: var(--text-color); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; transition: background-color 0.2s, transform 0.2s; padding: 0; }
        .icon-btn:hover { background-color: var(--input-bg); transform: scale(1.05); }
        .icon-btn svg { width: 20px; height: 20px; fill: currentColor; }
        @media (max-width: 600px) { th:nth-child(2), td:nth-child(2) { display: none; } }
    </style>
</head>
<body>
<canvas id="particle-canvas"></canvas>
<div class="top-bar">
    <a href="https://github.com/Jacky088/Edgeone-ShortURL" target="_blank" class="icon-btn" title="Jacky088/Edgeone-ShortURL">
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
    </a>
    <button id="theme-toggle" class="icon-btn" title="切换模式">
        <svg id="icon-sun" style="display: none;" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"></path></svg>
        <svg id="icon-moon" style="display: none;" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"></path></svg>
    </button>
</div>
<div class="container">
    <h1>管理后台</h1>
    <p>链接总数: <span id="link-count">...</span></p>
    <table>
        <thead>
            <tr>
                <th>短链接</th>
                <th>原始链接</th>
                <th>访问次数</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody id="links-table-body"></tbody>
    </table>
</div>
<script>
    const themeToggleBtn = document.getElementById('theme-toggle'); const iconSun = document.getElementById('icon-sun'); const iconMoon = document.getElementById('icon-moon'); const htmlEl = document.documentElement;
    const storedTheme = localStorage.getItem('theme'); if (storedTheme) setTheme(storedTheme); else setTheme('light');
    function setTheme(theme) { htmlEl.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); if (theme === 'dark') { iconSun.style.display = 'block'; iconMoon.style.display = 'none'; } else { iconSun.style.display = 'none'; iconMoon.style.display = 'block'; } if (window.initParticles) window.initParticles(); }
    themeToggleBtn.addEventListener('click', () => { const currentTheme = htmlEl.getAttribute('data-theme'); setTheme(currentTheme === 'dark' ? 'light' : 'dark'); });
    const canvas = document.getElementById('particle-canvas'); const ctx = canvas.getContext('2d'); let particles = [], animationId;
    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', () => { resizeCanvas(); window.initParticles(); });
    class Particle { constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5; this.size = Math.random() * 2 + 1; } update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > canvas.width) this.vx *= -1; if (this.y < 0 || this.y > canvas.height) this.vy *= -1; } draw(color) { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); } }
    window.initParticles = function() { if (animationId) cancelAnimationFrame(animationId); particles = []; resizeCanvas(); const particleCount = Math.min(100, (canvas.width * canvas.height) / 15000); for (let i = 0; i < particleCount; i++) { particles.push(new Particle()); } animate(); }
    function animate() { const style = getComputedStyle(document.documentElement); const color = style.getPropertyValue('--particle-color').trim(); ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach((p, index) => { p.update(); p.draw(color); for (let j = index + 1; j < particles.length; j++) { const p2 = particles[j]; const dx = p.x - p2.x; const dy = p.y - p2.y; const distance = Math.sqrt(dx*dx + dy*dy); if (distance < 100) { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 0.5; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); } } }); animationId = requestAnimationFrame(animate); }
    window.initParticles();
    const linksTableBody = document.getElementById('links-table-body'); const linkCount = document.getElementById('link-count'); const adminSlug = window.location.pathname.split('/').pop(); const authHeaders = { 'Content-Type': 'application/json', 'X-Admin-Slug': adminSlug };
    async function getLinks() { try { const res = await fetch('/api/links', { headers: authHeaders }); if (!res.ok) { if (res.status === 401) { document.body.innerHTML = '<h1 style="text-align:center">未授权访问</h1>'; } throw new Error('获取链接列表失败。'); } const links = await res.json(); linkCount.textContent = links.length; renderLinks(links); } catch(err) { console.error(err); } }
    function renderLinks(links) { linksTableBody.innerHTML = ''; links.sort((a, b) => b.visits - a.visits); for (const link of links) { const shortUrl = \`\${window.location.origin}/\${link.slug}\`; const row = document.createElement('tr'); row.dataset.slug = link.slug; row.innerHTML = \`<td><a href="\${shortUrl}" target="_blank">\${shortUrl.replace(/^https?:\\/\\//, '')}</a></td><td><a href="\${link.original}" target="_blank" title="\${link.original}">\${link.original.substring(0, 50) + (link.original.length > 50 ? '...' : '')}</a></td><td>\${link.visits}</td><td><button class="delete-btn" data-slug="\${link.slug}">删除</button></td>\`; linksTableBody.appendChild(row); } }
    async function deleteLink(slug) { if (!confirm(\`您确定要删除短链接 "\${slug}" 吗？\`)) return; try { const res = await fetch('/api/delete', { method: 'POST', headers: authHeaders, body: JSON.stringify({ slug }), }); if (!res.ok) throw new Error('删除失败。'); document.querySelector(\`tr[data-slug="\${slug}"]\`).remove(); linkCount.textContent = parseInt(linkCount.textContent) - 1; } catch (err) { alert(err.message); } }
    linksTableBody.addEventListener('click', (e) => { if (e.target.classList.contains('delete-btn')) { deleteLink(e.target.dataset.slug); } });
    getLinks();
</script>
</body>
</html>
`;

// --- 4. 主处理函数 ---
export async function onRequest({ request, params, env }) {
  const { slug } = params;
  const adminPath = env.ADMIN_PATH;
  const envPassword = env.PASSWORD;

  // --- 安全获取 KV ---
  let DB;
  if (env && env.my_kv) {
    DB = env.my_kv;
  } else if (typeof my_kv !== 'undefined') {
    DB = my_kv;
  }
  if (!DB && slug && slug !== 'favicon.ico') {
      return new Response('Error: KV Binding "my_kv" not found. Please check EdgeOne settings.', { status: 500 });
  }

  // --- 鉴权状态检查 ---
  let isAuthorized = true; 
  if (envPassword) {
    const sessionHash = getCookie(request, 'auth_session');
    const validHash = await sha256(envPassword);
    if (!sessionHash || sessionHash !== validHash) {
        isAuthorized = false;
    }
  }

  // A. 处理 Admin 路由 (受口令保护)
  if (adminPath && slug === adminPath) {
    if (!isAuthorized) {
        return new Response(loginHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 });
    }
    return new Response(adminHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // B. 处理短链接跳转 (公开访问)
  if (slug && slug !== 'favicon.ico') {
    try {
      const cleanSlug = slug.trim().replace(/\/+$/, '');
      const linkStr = await DB.get(cleanSlug);
      
      if (linkStr) {
        const linkData = JSON.parse(linkStr);
        const newVisits = (linkData.visits || 0) + 1;
        linkData.visits = newVisits;
        
        // 使用 await 确保写入完成
        await DB.put(cleanSlug, JSON.stringify(linkData)); 
        return Response.redirect(linkData.original, 302);
      } else {
        return new Response('404 Not Found - 该短链接不存在', { status: 404 });
      }
    } catch (err) {
      console.error(`KV Error: ${err.message}`);
      return new Response(`Internal Server Error: ${err.message}`, { status: 500 });
    }
  }

  // C. 处理主页 (生成器) - 需要鉴权
  if (!isAuthorized) {
      return new Response(loginHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 });
  }

  return new Response(indexHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    status: 200
  });
}
