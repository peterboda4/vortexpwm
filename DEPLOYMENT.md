# Deployment Checklist

## Pre-Deployment

- [x] Build the production file: `npm run build`
- [x] Verify `dist/index.html` exists (~273 KB)
- [x] Test locally: `open dist/index.html` (via localhost or file://)

## FTP Upload

### Files to Upload
- **Only file needed:** `dist/index.html`
- No other files required (fully self-contained)

### Server Requirements
- **MUST serve over HTTPS** (not HTTP)
- AudioWorklet API requires secure context
- HTTP or file:// protocol will fail with "Initialization Failed"

### Recommended Hosting Options
If your FTP server doesn't support HTTPS:

1. **GitHub Pages** (Free HTTPS)
   - Create repo, push `dist/index.html`
   - Enable GitHub Pages in settings
   - Automatic HTTPS

2. **Netlify** (Free HTTPS)
   - Drag & drop `dist/index.html`
   - Automatic HTTPS and CDN

3. **Vercel** (Free HTTPS)
   - Deploy from Git or upload directly
   - Automatic HTTPS

4. **Cloudflare Pages** (Free HTTPS)
   - Connect Git repo or upload
   - Automatic HTTPS and global CDN

## Post-Deployment Testing

1. Open deployed URL in browser
2. Verify URL starts with `https://` (NOT `http://`)
3. Click "Start Audio" button
4. Test synth with on-screen keyboard
5. Check browser console for errors

## Troubleshooting

### "Initialization Failed" Error

**Check console for:**
```
[Build] ERROR: Not in secure context
```

**Solutions:**
- Ensure URL is `https://` not `http://`
- If using custom domain, verify SSL certificate is valid
- Try in different browser (Chrome, Firefox, Safari all support AudioWorklet)
- Open DevTools → Console for detailed error messages

### "Cannot read properties of undefined (reading 'addModule')"

**Cause:** Not in secure context (HTTP or file://)

**Solution:** Must use HTTPS or localhost

### Audio Not Playing

1. Check browser permissions (some browsers block audio until user interaction)
2. Ensure "Start Audio" button was clicked
3. Check system audio settings
4. Try different browser

## Browser Compatibility

**Supported:**
- Chrome 66+
- Firefox 76+
- Safari 14.1+
- Edge 79+

**Required APIs:**
- Web Audio API
- AudioWorklet
- Web MIDI API (optional, for MIDI controllers)
- ES6 Modules
- Async/Await

## Performance Notes

- 8-voice polyphony
- 11 effects (can be disabled for better performance)
- Runs in AudioWorklet thread (separate from main thread)
- Target latency: ~20-30ms (depends on browser/OS)
- CPU usage: ~5-15% on modern hardware

## File Size

- Production build: ~273 KB
- Gzip compressed: ~90 KB (if server supports)
- No external dependencies
- No CDN required
