// =============================================================
// KD Content Guardian — Gemini 프록시 (진단 강화판)
// 파일 위치: api/gemini.js
//   - GEMINI_API_KEY 미설정 시 그 사실을 명확히 반환
//   - 예외 발생 시 진짜 메시지를 응답과 Vercel 로그에 노출
// =============================================================

const GEMINI_MODEL = "gemini-3-flash-preview";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY 환경변수가 이 프로젝트(content-guardian)에 설정되지 않았습니다. Settings → Environment Variables에 등록 후 Redeploy 하세요."
    });
  }

  try {
    const payload = typeof req.body === "string"
      ? JSON.parse(req.body || "{}")
      : (req.body || {});

    if (typeof fetch !== "function") {
      throw new Error("이 런타임에 fetch가 없습니다. Vercel 프로젝트 Settings → Node.js Version을 20 이상으로 설정하세요.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${KEY}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (e) {
    console.error("PROXY ERROR:", e && e.stack ? e.stack : e); // Vercel Logs에 표시
    return res.status(500).json({
      error: "프록시 오류: " + (e && e.message ? e.message : String(e))
    });
  }
}
