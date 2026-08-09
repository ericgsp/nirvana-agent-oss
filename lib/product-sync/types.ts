export type DownloadedFile = {
  site: string;
  productType: string;
  zone: string;
  section: string | null;
  buffer: Buffer;
};

export type ParsedLot = {
  lotCode: string;
  available: boolean;
};

export type SyncResult = {
  filesDownloaded: number;
  productsUpserted: number;
  error?: string;
};
