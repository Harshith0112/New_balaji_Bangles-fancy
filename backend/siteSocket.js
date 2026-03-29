import { Server } from 'socket.io';

let io = null;

/**
 * Attach Socket.IO to the same HTTP server as Express.
 * @param {import('http').Server} httpServer
 * @param {{ corsOrigin?: string | string[] }} opts
 */
export function initSiteSocket(httpServer, opts = {}) {
  const origin = opts.corsOrigin ?? true;
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      credentials: true,
    },
  });
  return io;
}

/** Notify all connected storefront clients that public catalog data may have changed. */
export function emitSiteDataUpdated() {
  try {
    io?.emit('site-data-updated');
  } catch (err) {
    console.error('emitSiteDataUpdated:', err);
  }
}
