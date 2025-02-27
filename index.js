const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = process.env.PORT || 3000;

// Function to inject JavaScript into the response HTML
const injectJavaScript = (html) => {
  const script = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const inputBox = document.createElement('input');
        inputBox.type = 'text';
        inputBox.placeholder = 'Inject JS here...';
        inputBox.style.position = 'fixed';
        inputBox.style.bottom = '20px';
        inputBox.style.left = '50%';
        inputBox.style.transform = 'translateX(-50%)';
        inputBox.style.padding = '10px';
        inputBox.style.fontSize = '14px';
        inputBox.style.zIndex = '10000';
        
        // Inject the box into the body
        document.body.appendChild(inputBox);
        
        inputBox.addEventListener('change', function() {
          try {
            const userScript = inputBox.value;
            eval(userScript);
          } catch (e) {
            console.error('Error executing injected script:', e);
          }
        });
      });
    </script>
  `;
  // Inject the script at the end of the body tag
  return html.replace('</body>', `${script}</body>`);
};

// Proxy middleware
app.use('/', createProxyMiddleware({
  target: 'https://play.blooket.com/play/', // The target website to proxy
  changeOrigin: true,
  ws: true, // Support WebSocket connections
  pathRewrite: {
    '^/': '/', // Rewrite all incoming requests to blooket.com
  },
  onProxyRes: (proxyRes, req, res) => {
    let originalBody = '';
    
    proxyRes.on('data', (chunk) => {
      originalBody += chunk;
    });

    proxyRes.on('end', () => {
      if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
        // Inject JavaScript if the response is HTML
        const modifiedBody = injectJavaScript(originalBody);
        res.setHeader('Content-Length', Buffer.byteLength(modifiedBody));
        res.end(modifiedBody);
      } else {
        // If not HTML, just send the original response
        res.end(originalBody);
      }
    });
  }
}));

app.listen(port, () => {
  console.log(`Proxy server running on http://localhost:${port}`);
});
