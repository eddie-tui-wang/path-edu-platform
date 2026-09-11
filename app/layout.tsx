import type { Metadata } from "next";
import "./migrated.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "病理教学平台",
  description: "独立病理教学项目：账号与权限管理，病例、学生考试与教师教学演示。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
