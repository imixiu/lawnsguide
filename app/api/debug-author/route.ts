import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") || "anna-kowalski";
    
    // 直接导入 db 模块
    const db = await import("@/lib/db");
    
    // 调用页面使用的函数
    const author = await db.getAuthorBySlug(slug);
    const articles = await db.getArticlesByAuthor(slug);
    
    // 输出完整的调试信息
    return NextResponse.json({
      slug,
      author_found: !!author,
      author_name: author?.name,
      articles_count: articles.length,
      articles_sample: articles.slice(0, 5).map(a => ({
        id: a.id,
        short_title: a.short_title,
        author: a.author,
        is_online: a.is_online
      })),
      mysql_url: process.env.MYSQL_URL ? "set (length: " + process.env.MYSQL_URL.length + ")" : "not set",
      db_functions: Object.keys(db)
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
