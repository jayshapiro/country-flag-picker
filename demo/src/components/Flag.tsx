// Lightweight flag component: <Flag code="KE" />.
// Serves each flag as its own SVG file from /flags/<code>.svg (copy reference/flags/ into the
// app's public/ folder). The browser fetches a flag only when it is on screen and caches it, so
// the page's JavaScript carries no flag data. The median flag is ~0.6 KB.
// (The react-world-flags package inlines every flag, ~3.7 MB, into the JavaScript bundle.)
import type { ImgHTMLAttributes } from "react";

type FlagProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { code: string };

export default function Flag({ code, alt = "", ...props }: FlagProps) {
  return <img src={`/flags/${code.toLowerCase()}.svg`} alt={alt} loading="lazy" decoding="async" {...props} />;
}
