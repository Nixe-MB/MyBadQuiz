/* MyBadQuiz – secret picture vault (Settings → click the title 5 times).
   Unlimited pictures stored on THIS device (IndexedDB). They become the images of your 😱 Jumpscare power-up in online games. */
window.Pics = (() => {
  let mem = []; const ok = !!window.indexedDB;
  const open = () => new Promise((res, rej) => { const r = indexedDB.open('mbq-pics', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id', autoIncrement: true }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const st = async mode => (await open()).transaction('p', mode).objectStore('p');
  const api = {
    async list() { if (!ok) return [...mem]; try { return await req((await st('readonly')).getAll()); } catch (e) { return []; } },
    async add(data) { if (!ok) { mem.push({ id: Date.now() + Math.random(), data }); return; } await req((await st('readwrite')).add({ data, t: Date.now() })); },
    async remove(id) { if (!ok) { mem = mem.filter(x => x.id !== id); return; } await req((await st('readwrite')).delete(id)); },
    async clear() { if (!ok) { mem = []; return; } await req((await st('readwrite')).clear()); },
    async count() { return (await api.list()).length; },
    async random() { const l = await api.list(); return l.length ? l[Math.random() * l.length | 0].data : null; },
    /* shrink to a payload that is fine to send to other players */
    shrink(data, max = 640, q = .72) { return new Promise(res => { const im = new Image(); const to = setTimeout(() => res(null), 2500); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); clearTimeout(to); res(c.toDataURL('image/jpeg', q)); }; im.onerror = () => { clearTimeout(to); res(null); }; im.src = data; }); },
    async randomForSend() { const d = await api.random(); return d ? api.shrink(d) : null; },
    toData(file, max = 960) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => api.shrink(r.result, max, .8).then(d => d ? res(d) : rej(new Error('bad image'))); r.onerror = () => rej(r.error); r.readAsDataURL(file); }); }
  };
  return api;
})();

QB.secretHtml = () => `<p class="sub">Pictures you add here are used by your <b>😱 Jumpscare</b> power-up in online games. They are stretched over the other players' whole screen. Add as many as you like. They stay on this device.</p>
<div class="acts" style="justify-content:flex-start"><button class="btn" id="sadd">➕ Add pictures</button><button class="btn ghost" id="stest">Test a jumpscare</button><button class="btn ghost" id="sclr">Delete all</button><input type="file" id="sfile" accept="image/*" multiple hidden></div>
<p class="sub" id="scnt">Loading…</p><div class="pgrid" id="spg"></div>
<p class="sub" style="font-size:.8rem">Only add pictures you are happy for your friends to see. With no pictures here, a random online image or a generated spooky face is used instead. Other players can turn jumpscares off or block pictures in their own settings.</p>`;
QB.secretBind = () => {
  const { $, toast } = QB;
  const fill = async () => {
    const l = await Pics.list(); const c = $('#scnt'), g = $('#spg'); if (!c || !g) return;
    c.textContent = l.length ? `${l.length} picture${l.length === 1 ? '' : 's'} in your vault. One is picked at random each time.` : 'No pictures yet.';
    g.innerHTML = l.map(x => `<div class="pth"><img src="${x.data}" alt=""><button data-pid="${x.id}" aria-label="Delete picture">✕</button></div>`).join('');
    g.querySelectorAll('[data-pid]').forEach(b => b.onclick = async () => { await Pics.remove(isNaN(+b.dataset.pid) ? b.dataset.pid : +b.dataset.pid); fill(); });
  };
  $('#sadd').onclick = () => $('#sfile').click();
  $('#sfile').onchange = async e => { let n = 0; for (const f of e.target.files) { try { await Pics.add(await Pics.toData(f)); n++; } catch (err) {} } toast(n ? `Added ${n} picture${n > 1 ? 's' : ''}` : 'Could not read those files.'); e.target.value = ''; fill(); };
  $('#stest').onclick = async () => { Chaos.jumpscare(await Pics.randomForSend()); };
  $('#sclr').onclick = async () => { if (confirm('Delete every picture in your vault?')) { await Pics.clear(); fill(); } };
  fill();
};
