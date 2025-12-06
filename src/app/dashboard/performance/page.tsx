/**
 * Performance Dashboard Page
 * داشبورد مدیریت عملکرد
 */

'use client';

import { useState } from 'react';

export default function PerformanceDashboardPage() {
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  const runAudit = async (type: string) => {
    setAuditRunning(true);
    try {
      const response = await fetch('/api/performance/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      // Poll for results
      const checkStatus = async () => {
        const statusResponse = await fetch(`/api/performance/audit?id=${data.auditId}`);
        const statusData = await statusResponse.json();

        if (statusData.audit.status === 'completed') {
          setAuditResult(statusData.audit);
          setAuditRunning(false);
        } else if (statusData.audit.status === 'failed') {
          setAuditRunning(false);
          alert('Audit failed');
        } else {
          setTimeout(checkStatus, 2000);
        }
      };

      checkStatus();
    } catch (error) {
      console.error('Error running audit:', error);
      setAuditRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">داشبورد عملکرد</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => runAudit('bundle')}
          disabled={auditRunning}
          className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          تحلیل Bundle
        </button>

        <button
          onClick={() => runAudit('database')}
          disabled={auditRunning}
          className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600 disabled:opacity-50"
        >
          تحلیل دیتابیس
        </button>

        <button
          onClick={() => runAudit('full')}
          disabled={auditRunning}
          className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 disabled:opacity-50"
        >
          تحلیل کامل
        </button>
      </div>

      {auditRunning && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          در حال اجرای تحلیل...
        </div>
      )}

      {auditResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">نتایج تحلیل</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-100 p-4 rounded">
              <div className="text-sm text-gray-600">کل مشکلات</div>
              <div className="text-2xl font-bold">{auditResult.summary?.totalFindings || 0}</div>
            </div>

            <div className="bg-red-100 p-4 rounded">
              <div className="text-sm text-gray-600">بحرانی</div>
              <div className="text-2xl font-bold text-red-600">
                {auditResult.summary?.criticalCount || 0}
              </div>
            </div>

            <div className="bg-orange-100 p-4 rounded">
              <div className="text-sm text-gray-600">مهم</div>
              <div className="text-2xl font-bold text-orange-600">
                {auditResult.findings?.filter((f: any) => f.severity === 'high').length || 0}
              </div>
            </div>

            <div className="bg-yellow-100 p-4 rounded">
              <div className="text-sm text-gray-600">متوسط</div>
              <div className="text-2xl font-bold text-yellow-600">
                {auditResult.findings?.filter((f: any) => f.severity === 'medium').length || 0}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold">مشکلات یافت شده</h3>
            {auditResult.findings?.findings?.map((finding: any, index: number) => (
              <div key={index} className="border-r-4 border-red-500 bg-gray-50 p-4 rounded">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold">{finding.title}</h4>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      finding.severity === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : finding.severity === 'high'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {finding.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{finding.description}</p>
                <p className="text-sm">
                  <strong>تأثیر:</strong> {finding.impact}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
