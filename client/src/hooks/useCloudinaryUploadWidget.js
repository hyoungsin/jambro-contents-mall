import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * server/.env의 cloudinaryCloudName / cloudinaryUploadPreset → GET {apiBase}/config/cloudinary
 * Cloudinary 업로드 위젯 스크립트 로드 및 open()
 */
export function useCloudinaryUploadWidget(apiBase, { folder, onUploadSuccess, onUploadError }) {
  const widgetRef = useRef(null);
  const successRef = useRef(onUploadSuccess);
  const errorRef = useRef(onUploadError);
  successRef.current = onUploadSuccess;
  errorRef.current = onUploadError;

  const [cloudinaryReady, setCloudinaryReady] = useState(false);
  const [cloudinaryInitError, setCloudinaryInitError] = useState('');
  const [cloudinaryConfig, setCloudinaryConfig] = useState(null);
  const [cloudinaryConfigLoading, setCloudinaryConfigLoading] = useState(true);
  const [cloudinaryConfigError, setCloudinaryConfigError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCloudinaryConfigLoading(true);
      setCloudinaryConfigError('');
      try {
        const res = await fetch(`${apiBase}/config/cloudinary`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Cloudinary 설정을 불러오지 못했습니다.');
        }
        if (!cancelled && data?.cloudName && data?.uploadPreset) {
          setCloudinaryConfig({ cloudName: data.cloudName, uploadPreset: data.uploadPreset });
        }
      } catch (err) {
        if (!cancelled) {
          setCloudinaryConfigError(err?.message || 'Cloudinary 설정을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setCloudinaryConfigLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  useEffect(() => {
    widgetRef.current = null;
  }, [cloudinaryConfig]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;

    if (window.cloudinary && window.cloudinary.createUploadWidget) {
      setCloudinaryReady(true);
      return () => {
        cancelled = true;
      };
    }

    setCloudinaryInitError('');

    const existing = document.getElementById('cloudinary-widget-script');
    if (existing) {
      const start = Date.now();
      pollTimer = window.setInterval(() => {
        if (cancelled) return;
        if (window.cloudinary && window.cloudinary.createUploadWidget) {
          window.clearInterval(pollTimer);
          pollTimer = null;
          setCloudinaryReady(true);
        } else if (Date.now() - start > 8000) {
          window.clearInterval(pollTimer);
          pollTimer = null;
          setCloudinaryInitError(
            'Cloudinary 위젯 로드에 실패했습니다. 페이지 새로고침 후 다시 시도해 주세요.',
          );
        }
      }, 250);
      return () => {
        cancelled = true;
        if (pollTimer) window.clearInterval(pollTimer);
      };
    }

    const script = document.createElement('script');
    script.id = 'cloudinary-widget-script';
    script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
    script.async = true;
    script.onload = () => {
      if (window.cloudinary && window.cloudinary.createUploadWidget && !cancelled) {
        setCloudinaryReady(true);
      }
    };
    script.onerror = () => {
      if (!cancelled) {
        setCloudinaryInitError('Cloudinary 위젯 로드에 실패했습니다.');
      }
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, []);

  const openCloudinaryWidget = useCallback(() => {
    setCloudinaryInitError('');
    if (cloudinaryConfigLoading) {
      setCloudinaryInitError('Cloudinary 설정을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (cloudinaryConfigError || !cloudinaryConfig) {
      setCloudinaryInitError(
        cloudinaryConfigError ||
          'Cloudinary 설정이 없습니다. server/.env에 cloudinaryCloudName, cloudinaryUploadPreset을 설정하고 서버를 재시작해 주세요.',
      );
      return;
    }
    const { cloudName, uploadPreset } = cloudinaryConfig;

    if (!cloudinaryReady || !window.cloudinary || !window.cloudinary.createUploadWidget) {
      setCloudinaryInitError('Cloudinary 위젯이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    if (!widgetRef.current) {
      widgetRef.current = window.cloudinary.createUploadWidget(
        {
          cloudName,
          uploadPreset,
          folder,
          sources: ['local', 'url'],
          multiple: false,
          maxFiles: 1,
        },
        (uploadError, result) => {
          if (uploadError) {
            errorRef.current?.(
              uploadError?.message || 'Cloudinary 업로드 중 오류가 발생했습니다.',
            );
            return;
          }
          const info = result?.info;
          if (result?.event === 'success' && info?.secure_url) {
            successRef.current?.(info.secure_url);
          }
        },
      );
    }

    widgetRef.current.open();
  }, [
    cloudinaryConfig,
    cloudinaryConfigError,
    cloudinaryConfigLoading,
    cloudinaryReady,
    folder,
  ]);

  return {
    openCloudinaryWidget,
    cloudinaryConfigLoading,
    cloudinaryConfigError,
    cloudinaryInitError,
  };
}
