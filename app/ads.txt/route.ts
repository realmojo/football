import { ADSENSE_CLIENT } from "@/lib/site";

// 애드센스 게시자 ID 가 설정되면 ads.txt 를 제공한다.
export function GET() {
  const pub = ADSENSE_CLIENT.replace(/^ca-/, "");
  if (!pub) return new Response("", { status: 404 });
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
