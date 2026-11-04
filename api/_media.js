// In an itinerary HTML you can write just the file name:
//
//   <img src="stop-01.jpg">          ->  /media/north/stop-01.jpg
//   <audio src="stop-01-en.mp3">     ->  /media/north/stop-01-en.mp3
//
// The folder is the itinerary's own (north, rural, windmills). Addresses that
// already start with "/", "http:", "https:", "data:" or "#" are left untouched.
export function withMediaPaths(html, id) {
  return html.replace(
    /(\ssrc=)(["'])(?![a-z][a-z0-9+.-]*:|\/|#)([^"']+)\2/gi,
    (_match, attr, quote, file) =>
      `${attr}${quote}/media/${id}/${file.replace(/^\.\//, '')}${quote}`
  );
}
