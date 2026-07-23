import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const mysql = await import("mysql2/promise");
  try {
    const url = process.env.MYSQL_URL;
    if (!url) {
      return NextResponse.json({ error: "MYSQL_URL not set" }, { status: 500 });
    }
    
    const u = new URL(url);
    const conn = await mysql.createConnection({
      host: u.hostname,
      port: parseInt(u.port || "3306"),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
      connectTimeout: 10000,
      disableEval: true,
    });
    
    const [rows] = await conn.query(
      "SELECT COUNT(*) as c FROM articles WHERE site = ? AND author = ? AND is_online IN ('Y', '1')",
      ["lawnsguide", "anna-kowalski"]
    );
    
    await conn.end();
    
    return NextResponse.json({
      mysql_url: url ? "set" : "not set",
      articles_by_anna: (rows as any[])[0]?.c || 0,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
