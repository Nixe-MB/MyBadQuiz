/* MyBadQuiz – start-up. Loaded last, after every module has registered itself on QB. */
QB.go('subjects');
if (QB.paintPf) QB.paintPf();
/* offline support + installable app (only over http/https) */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
