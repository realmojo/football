"use client";

import { useEffect, useRef, useState } from "react";

// 팀 로고. 이미지가 없거나 불러오지 못하면 팀 약자 배지로 대체한다.
export function Crest({ src, tla, size = 20 }: { src?: string | null; tla?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // 하이드레이션 전에 이미 로드에 실패한 이미지는 onError 가 호출되지 않으므로 직접 확인한다.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) {
    return (
      <span className="crest-fallback" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
        {tla?.slice(0, 3) ?? "?"}
      </span>
    );
  }
  return (
    <img
      ref={ref}
      src={src}
      alt=""
      width={size}
      height={size}
      className="crest"
      onError={() => setFailed(true)}
    />
  );
}
