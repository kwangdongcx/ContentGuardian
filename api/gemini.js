// =============================================================
// KD Content Guardian — Gemini API 프록시 (Vercel Serverless Function)
// 파일 위치: 프로젝트의  api/gemini.js   (경로가 곧 호출 URL: /api/gemini)
//
// Cloudflare Worker는 한국 요청이 홍콩(HKG) POP로 라우팅돼 Gemini가 막는 경우가 있어,
// 미국 리전에서 도는 Vercel 함수로 프록시를 옮깁니다. 키는 환경변수(GEMINI_API_KEY)에만 둡니다.
//  ※ Node.js 서버리스 런타임 사용(Edge 런타임으로 바꾸지 마세요 — Edge는 지역이 달라질 수 있음).
// =============================================================

const GEMINI_MODEL = "gemini-3-flash-preview"; // 모델은 여기 한 곳에서 관리

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*"); // 운영 시 본인 도메인으로 제한 권장
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // req.body 는 Vercel이 JSON으로 자동 파싱(Content-Type: application/json).
    // 혹시 문자열로 올 경우 대비해 방어적으로 처리.
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      GEMINI_MODEL +
      ":generateContent?key=" +
      process.env.GEMINI_API_KEY;

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // 상태코드/본문 그대로 패스스루 (429 등도 그대로 전달 → 프런트가 정상 처리)
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
