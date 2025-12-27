// TODO: Host these files ourselves instead of relying on external URLs for better reliability

export interface SampleDataFileConfig {
  name: string;
  fileUrl: string;
  fileName: string;
  metadata: Record<string, string | number | boolean>;
}

export interface SampleDataConfig {
  id: string;
  files: SampleDataFileConfig[];
}

export const SAMPLE_DATA_CONFIGS: Record<string, SampleDataConfig> = {
  "product-manuals": {
    id: "product-manuals",
    files: [
      {
        name: "Panasonic Oven 1 Manual",
        fileUrl:
          "https://help.na.panasonic.com/wp-content/uploads/2023/02/NNCD87_F0003CD70CP_ENG.pdf",
        fileName: "panasonic-oven-1.pdf",
        metadata: {
          product: "Panasonic Oven 1",
          year: 2020,
          category: "oven",
        },
      },
      {
        name: "LG Washing Machine Manual",
        fileUrl:
          "https://www.lg.com/cac/support/products/documents/77%20KROWM000135645.pdf",
        fileName: "lg-washing-machine.pdf",
        metadata: {
          product: "LG Washing Machine",
          year: 2022,
          category: "washing machine",
        },
      },
      {
        name: "Panasonic Oven 2 Manual",
        fileUrl:
          "https://fs.panasonic.com/pdf/user_manual/Convection/NE-C1275/A00033C5ABP_140922.pdf",
        fileName: "panasonic-oven-2.pdf",
        metadata: {
          product: "Panasonic Oven 2",
          year: 2023,
          category: "oven",
        },
      },
    ],
  },
};

export function getSampleDataConfig(
  typeId: string,
): SampleDataConfig | undefined {
  return SAMPLE_DATA_CONFIGS[typeId];
}
