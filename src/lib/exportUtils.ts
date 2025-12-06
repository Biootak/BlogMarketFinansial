import type { ReportData } from '@/actions/reportActions';

/**
 * Export report data to Excel format
 */
export async function exportToExcel(
  data: ReportData,
  dateRange: { from: Date; to: Date },
): Promise<void> {
  // Lazy load xlsx only when needed
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  // KPIs Sheet
  const kpisData = [
    ['متریک', 'مقدار'],
    ['کل کاربران', data.kpis.totalUsers],
    ['رشد کاربران (%)', data.kpis.userGrowth],
    ['پست‌های منتشر شده', data.kpis.totalPosts.published],
    ['پست‌های پیش‌نویس', data.kpis.totalPosts.draft],
    ['پست‌های در انتظار', data.kpis.totalPosts.pending],
    ['بازدیدها', data.kpis.pageViews],
    ['نرخ تعامل (%)', data.kpis.engagementRate],
  ];
  const kpisSheet = XLSX.utils.aoa_to_sheet(kpisData);
  XLSX.utils.book_append_sheet(workbook, kpisSheet, 'KPIs');

  // Top Posts Sheet
  const postsData = [
    ['رتبه', 'عنوان', 'نویسنده', 'بازدید', 'لایک', 'نظر', 'ذخیره', 'تاریخ انتشار'],
    ...data.topPosts.map((post, index) => [
      index + 1,
      post.title,
      post.author.name || 'ناشناس',
      post.views,
      post.likes,
      post.comments,
      post.saves,
      post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('fa-IR') : '-',
    ]),
  ];
  const postsSheet = XLSX.utils.aoa_to_sheet(postsData);
  XLSX.utils.book_append_sheet(workbook, postsSheet, 'پست‌های برتر');

  // Top Authors Sheet
  const authorsData = [
    ['رتبه', 'نام', 'ایمیل', 'تعداد پست', 'کل بازدید', 'میانگین بازدید'],
    ...data.topAuthors.map((author, index) => [
      index + 1,
      author.name || 'ناشناس',
      author.email,
      author.postCount,
      author.totalViews,
      author.averageViews,
    ]),
  ];
  const authorsSheet = XLSX.utils.aoa_to_sheet(authorsData);
  XLSX.utils.book_append_sheet(workbook, authorsSheet, 'نویسندگان برتر');

  // Categories Sheet
  const categoriesData = [
    ['دسته‌بندی', 'تعداد پست', 'درصد'],
    ...data.categories.map((cat) => [cat.categoryName, cat.postCount, cat.percentage]),
  ];
  const categoriesSheet = XLSX.utils.aoa_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'دسته‌بندی‌ها');

  // Trends Sheet
  const trendsData = [
    ['تاریخ', 'بازدید', 'لایک', 'نظر', 'ذخیره'],
    ...data.trends.map((trend) => [
      new Date(trend.date).toLocaleDateString('fa-IR'),
      trend.views,
      trend.likes,
      trend.comments,
      trend.saves,
    ]),
  ];
  const trendsSheet = XLSX.utils.aoa_to_sheet(trendsData);
  XLSX.utils.book_append_sheet(workbook, trendsSheet, 'روندها');

  // Generate filename with date range
  const fromStr = dateRange.from.toISOString().split('T')[0];
  const toStr = dateRange.to.toISOString().split('T')[0];
  const filename = `report_${fromStr}_to_${toStr}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, filename);
}

/**
 * Export report data to CSV format
 */
export function exportToCSV(data: ReportData, dateRange: { from: Date; to: Date }): void {
  // Combine all data into one CSV
  let csv = '';

  // KPIs Section
  csv += 'متریک‌های کلیدی\n';
  csv += 'متریک,مقدار\n';
  csv += `کل کاربران,${data.kpis.totalUsers}\n`;
  csv += `رشد کاربران (%),${data.kpis.userGrowth}\n`;
  csv += `پست‌های منتشر شده,${data.kpis.totalPosts.published}\n`;
  csv += `پست‌های پیش‌نویس,${data.kpis.totalPosts.draft}\n`;
  csv += `پست‌های در انتظار,${data.kpis.totalPosts.pending}\n`;
  csv += `بازدیدها,${data.kpis.pageViews}\n`;
  csv += `نرخ تعامل (%),${data.kpis.engagementRate}\n`;
  csv += '\n';

  // Top Posts Section
  csv += 'پست‌های برتر\n';
  csv += 'رتبه,عنوان,نویسنده,بازدید,لایک,نظر,ذخیره,تاریخ انتشار\n';
  data.topPosts.forEach((post, index) => {
    const title = post.title.replace(/,/g, '،'); // Replace commas
    const author = (post.author.name || 'ناشناس').replace(/,/g, '،');
    const date = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('fa-IR') : '-';
    csv += `${index + 1},${title},${author},${post.views},${post.likes},${post.comments},${post.saves},${date}\n`;
  });
  csv += '\n';

  // Top Authors Section
  csv += 'نویسندگان برتر\n';
  csv += 'رتبه,نام,ایمیل,تعداد پست,کل بازدید,میانگین بازدید\n';
  data.topAuthors.forEach((author, index) => {
    const name = (author.name || 'ناشناس').replace(/,/g, '،');
    csv += `${index + 1},${name},${author.email},${author.postCount},${author.totalViews},${author.averageViews}\n`;
  });
  csv += '\n';

  // Categories Section
  csv += 'دسته‌بندی‌ها\n';
  csv += 'دسته‌بندی,تعداد پست,درصد\n';
  data.categories.forEach((cat) => {
    const name = cat.categoryName.replace(/,/g, '،');
    csv += `${name},${cat.postCount},${cat.percentage}\n`;
  });
  csv += '\n';

  // Trends Section
  csv += 'روندها\n';
  csv += 'تاریخ,بازدید,لایک,نظر,ذخیره\n';
  data.trends.forEach((trend) => {
    const date = new Date(trend.date).toLocaleDateString('fa-IR');
    csv += `${date},${trend.views},${trend.likes},${trend.comments},${trend.saves}\n`;
  });

  // Generate filename with date range
  const fromStr = dateRange.from.toISOString().split('T')[0];
  const toStr = dateRange.to.toISOString().split('T')[0];
  const filename = `report_${fromStr}_to_${toStr}.csv`;

  // Create blob and download
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
