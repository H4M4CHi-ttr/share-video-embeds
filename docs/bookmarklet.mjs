function openVideo(appUrl, guidance) {
  const youtube = /^(?:(?:www|m|music)\.)?youtube\.com$/iu.test(location.hostname);
  const shortLink = /^(?:www\.)?youtu\.be$/iu.test(location.hostname);
  if (!youtube && !shortLink) {
    window.alert(guidance);
    return;
  }
  const title = document.title.replace(/\s+-\s+YouTube(?: Music)?\s*$/iu, '').trim();
  const share = new URLSearchParams({ text: location.href, title });
  window.open(appUrl + '#' + share, '_blank', 'noopener,noreferrer');
}

export function createBookmarklet(appUrl, guidance) {
  const source = 'void((' + openVideo.toString() + ')(' + JSON.stringify(appUrl) + ',' + JSON.stringify(guidance) + '))';
  return 'javascript:' + encodeURIComponent(source);
}
