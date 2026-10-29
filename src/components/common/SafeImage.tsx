import React, { useEffect, useState } from 'react';
import { normalizeImageUrl } from '../../lib/media';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallbackSrc?: string | null;
  fallbackSrcs?: Array<string | null | undefined>;
}

export const SafeImage: React.FC<SafeImageProps> = ({ src, fallbackSrc, fallbackSrcs, onError, ...props }) => {
  const sources = [...new Set(
    [src, fallbackSrc, ...(fallbackSrcs ?? [])]
      .map(normalizeImageUrl)
      .filter((source): source is string => source !== null)
  )];
  const sourceKey = sources.join('\n');
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sourceKey]);

  const currentSource = sources[sourceIndex] ?? null;
  if (!currentSource) {
    return null;
  }

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setSourceIndex((index) => Math.min(index + 1, sources.length));
    if (onError) {
      onError(event);
    }
  };

  return <img {...props} src={currentSource} onError={handleError} />;
};
