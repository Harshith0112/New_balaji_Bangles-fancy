import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSiteCatalog } from '../store/siteDataSlice';

function getSocketOrigin() {
  const api = import.meta.env.VITE_API_URL;
  if (api && /^https?:\/\//.test(api)) {
    try {
      return new URL(api).origin;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** First load: fetch catalog into Redux. Socket: silent refetch on admin changes (no full-page flash). */
export default function SiteDataSync() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.siteData.status);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchSiteCatalog());
    }
  }, [dispatch, status]);

  useEffect(() => {
    const origin = getSocketOrigin();
    const socket = io(origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    const onUpdate = () => {
      dispatch(fetchSiteCatalog({ silent: true }));
    };
    socket.on('site-data-updated', onUpdate);
    return () => {
      socket.off('site-data-updated', onUpdate);
      socket.disconnect();
    };
  }, [dispatch]);

  return null;
}
