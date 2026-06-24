export function getBranchUrl(branchId: string): string {
  const urlMap: Record<string, string | undefined> = {
    bekasi: process.env.BRANCH_BEKASI_URL,
    jakarta: process.env.BRANCH_JAKARTA_URL,
    bandung: process.env.BRANCH_BANDUNG_URL,
    semarang: process.env.BRANCH_SEMARANG_URL,
    surabaya: process.env.BRANCH_SURABAYA_URL,
  };

  const url = urlMap[branchId.toLowerCase()];

  if (!url) {
    throw new Error(`Branch URL not found for branch: "${branchId}". Check .env configuration.`);
  }

  return url;
}

export function getAllBranchUrls(): Record<string, string> {
  const branches = ['bekasi', 'jakarta', 'bandung', 'semarang', 'surabaya'];
  const result: Record<string, string> = {};

  for (const branch of branches) {
    try {
      result[branch] = getBranchUrl(branch);
    } catch {
      // Skip cabang yang tidak dikonfigurasi
    }
  }

  return result;
}
