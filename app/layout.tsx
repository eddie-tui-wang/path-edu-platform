import type { Metadata } from "next";
import "./migrated.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "病理教学平台 · 独立迁移版",
  description: "独立病理教学项目：病例数据库、学生考试与教师教学分析。当前为迁移预览，非已上线教学MVP。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
