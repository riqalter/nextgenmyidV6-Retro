import { createServer } from 'vite';
import handler from '../.local-api/api/contact.js';

const server = await createServer({
	server: { host: '127.0.0.1' },
	plugins: [{
		name: 'local-contact-function',
		configureServer(vite) {
			vite.middlewares.use('/api/contact', (req, res) => {
				handler(req, res).catch(() => {
					res.statusCode = 500;
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify({ error: 'The contact service is unavailable.' }));
				});
			});
		}
	}]
});
await server.listen();
server.printUrls();
