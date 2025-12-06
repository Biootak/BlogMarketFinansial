/**
 * Performance Audit API
 * اجرای performance audit
 */

import prisma from '@/lib/db';
import { BundleAnalyzer } from '@/lib/performance/bundleAnalyzer';
import { databaseProfiler } from '@/lib/performance/databaseProfiler';
import { ReportGenerator, type AllAnalyses } from '@/lib/performance/reportGenerator';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'full' } = body;

    // ایجاد audit record
    const audit = await prisma.performanceAudit.create({
      data: {
        type,
        findings: {},
        status: 'running',
      },
    });

    // اجرای audit به صورت async
    runAudit(audit.id, type).catch(console.error);

    return NextResponse.json({ auditId: audit.id, status: 'running' });
  } catch (error) {
    console.error('Error starting audit:', error);
    return NextResponse.json({ error: 'Failed to start audit' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auditId = searchParams.get('id');

    if (auditId) {
      const audit = await prisma.performanceAudit.findUnique({
        where: { id: auditId },
      });

      return NextResponse.json({ audit });
    }

    // دریافت لیست auditها
    const audits = await prisma.performanceAudit.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ audits });
  } catch (error) {
    console.error('Error fetching audits:', error);
    return NextResponse.json({ error: 'Failed to fetch audits' }, { status: 500 });
  }
}

async function runAudit(auditId: string, type: string) {
  try {
    const analyses: AllAnalyses = {};

    // Bundle analysis
    if (type === 'full' || type === 'bundle') {
      const bundleAnalyzer = new BundleAnalyzer();
      analyses.bundle = await bundleAnalyzer.analyze();
    }

    // Database analysis
    if (type === 'full' || type === 'database') {
      analyses.database = databaseProfiler.analyze();
    }

    // تولید گزارش
    const reportGenerator = new ReportGenerator();
    const report = reportGenerator.generateReport(analyses);

    // به‌روزرسانی audit
    await prisma.performanceAudit.update({
      where: { id: auditId },
      data: {
        findings: JSON.parse(JSON.stringify(report)),
        status: 'completed',
        completedAt: new Date(),
        summary: {
          totalFindings: report.findings.length,
          criticalCount: report.summary.criticalCount,
        },
      },
    });
  } catch (error) {
    console.error('Audit failed:', error);

    await prisma.performanceAudit.update({
      where: { id: auditId },
      data: {
        status: 'failed',
        completedAt: new Date(),
      },
    });
  }
}
