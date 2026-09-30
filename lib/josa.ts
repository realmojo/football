// 앞말의 받침에 맞춰 조사를 고른다. 한글이 아니면(영어 이름 등) 괄호 표기로 둘 다 보여준다.
export function josa(word: string, pair: "이/가" | "은/는" | "을/를" | "와/과" | "으로/로") {
  const [withBatchim, without] = pair.split("/");
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return `${word}${pair === "으로/로" ? "(으)로" : `${withBatchim}(${without})`}`;
  const batchim = (code - 0xac00) % 28;
  // "로"는 ㄹ 받침 뒤에서도 "로"를 쓴다.
  if (pair === "으로/로") return word + (batchim === 0 || batchim === 8 ? "로" : "으로");
  return word + (batchim ? withBatchim : without);
}
