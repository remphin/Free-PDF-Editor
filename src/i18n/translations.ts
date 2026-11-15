export type Language = 'tr' | 'en';

export type ToolTab = 'merge' | 'split' | 'word' | 'convert' | 'compress';

export interface Translations {
  appName: string;
  nav: {
    merge: string;
    split: string;
    word: string;
    convert: string;
    compress: string;
  };
  hero: {
    mergeTitle: string;
    mergeDesc: string;
    splitTitle: string;
    splitDesc: string;
    wordTitle: string;
    wordDesc: string;
    convertTitle: string;
    convertDesc: string;
    compressTitle: string;
    compressDesc: string;
  };
  common: {
    dropTitle: string;
    dropHint: string;
    selectFiles: string;
    loadSample: string;
    clearAll: string;
    moveUp: string;
    moveDown: string;
    remove: string;
    downloadPdf: string;
    previewPdf: string;
    hidePreview: string;
    processing: string;
    pages: string;
    page: string;
    filesCount: string;
    totalSize: string;
    ready: string;
    emptyQueueTitle: string;
    emptyQueueDesc: string;
    errorInvalidFile: string;
    errorGeneric: string;
    privacyTitle: string;
    privacyNote: string;
  };
  merge: {
    fileQueueTitle: string;
    addMorePdfs: string;
    numberingSectionTitle: string;
    enableNumbering: string;
    positionLabel: string;
    positions: {
      'bottom-left': string;
      'bottom-center': string;
      'bottom-right': string;
      'top-left': string;
      'top-center': string;
      'top-right': string;
    };
    formatLabel: string;
    formats: {
      'number-only': string;
      'x-of-y': string;
      'page-x': string;
      'page-x-of-y': string;
      'custom': string;
    };
    customPrefixLabel: string;
    customPrefixPlaceholder: string;
    startNumberLabel: string;
    fontSizeLabel: string;
    skipFirstPage: string;
    mergeButton: string;
    resultTitle: string;
    resultSummary: string;
    sampleBtn: string;
  };
  split: {
    dropTitle: string;
    dropHint: string;
    selectPdf: string;
    loadSample: string;
    pagesGridTitle: string;
    selectAll: string;
    deselectAll: string;
    selectedCount: string;
    settingsTitle: string;
    modeLabel: string;
    modes: {
      'all-individual': { title: string; desc: string };
      'selected-individual': { title: string; desc: string };
      'extract-single': { title: string; desc: string };
      'custom-ranges': { title: string; desc: string };
    };
    rangeInputLabel: string;
    rangeInputPlaceholder: string;
    rangeInputHint: string;
    splitButton: string;
    resultsTitle: string;
    downloadAll: string;
    noSelectionError: string;
    invalidRangeError: string;
  };
  word: {
    queueTitle: string;
    addWordFiles: string;
    loadSamples: string;
    pageBreakBetween: string;
    mergeToEditor: string;
    editorTitle: string;
    editorPlaceholder: string;
    saveAsPdf: string;
    saveAsDocx: string;
    includePageNumbers: string;
    toolbar: {
      undo: string;
      redo: string;
      h1: string;
      h2: string;
      paragraph: string;
      bold: string;
      italic: string;
      underline: string;
      bulletList: string;
      orderedList: string;
      alignLeft: string;
      alignCenter: string;
      alignRight: string;
      pageBreak: string;
      clearFormat: string;
    };
    pageBreakLabel: string;
    exportSuccessPdf: string;
    exportSuccessDocx: string;
    docNameLabel: string;
    defaultDocName: string;
  };
  convert: {
    dropTitle: string;
    dropHint: string;
    supportedFormats: string;
    loadSamples: string;
    queueTitle: string;
    settingsTitle: string;
    pageSizeLabel: string;
    pageSizes: {
      a4: string;
      letter: string;
      fit: string;
    };
    orientationLabel: string;
    orientations: {
      portrait: string;
      landscape: string;
    };
    combineAllLabel: string;
    addPageNumbersLabel: string;
    convertButton: string;
    previewItem: string;
    sheetCount: string;
    typeLabels: {
      image: string;
      word: string;
      excel: string;
    };
    resultTitle: string;
  };
  compress: {
    dropTitle: string;
    dropHint: string;
    loadSample: string;
    levelLabel: string;
    levels: {
      low: { title: string; desc: string };
      balanced: { title: string; desc: string };
      maximum: { title: string; desc: string };
    };
    compressAll: string;
    table: {
      file: string;
      pages: string;
      original: string;
      compressed: string;
      savings: string;
      action: string;
    };
    download: string;
    alreadyOptimal: string;
    pending: string;
    compressing: string;
    done: string;
    downloadAll: string;
  };
}

export const translations: Record<Language, Translations> = {
  tr: {
    appName: 'PDF Labs',
    nav: {
      merge: 'PDF Birleştir',
      split: 'PDF Ayır',
      word: 'Word Stüdyo',
      convert: 'PDF Dönüştür',
      compress: 'PDF Sıkıştır',
    },
    hero: {
      mergeTitle: 'PDF Dosyalarını Birleştir ve Numaralandır',
      mergeDesc: 'Birden fazla PDF dosyasını sıraya koyun, sayfa numarası konumunu ve biçimini seçerek tek dosyada birleştirin.',
      splitTitle: 'PDF Sayfalarını Bağımsız Dosyalara Ayır',
      splitDesc: 'Tek bir sayfayı ya da seçtiğiniz sayfa aralıklarını saniyeler içinde bağımsız PDF dosyalarına dönüştürün.',
      wordTitle: 'Word Dosyalarını Birleştir, Düzenle ve Kaydet',
      wordDesc: 'Birden çok Word (.docx) belgesini tek editörde birleştirip düzenleyin; doğrudan PDF veya Word olarak kaydedin.',
      convertTitle: 'Görsel, Word ve Excel Dosyalarını PDF Yap',
      convertDesc: 'PNG, JPG, WebP görselleri, Excel tablolarını (.xlsx, .csv) ve Word belgelerini saniyeler içinde PDF’e dönüştürün.',
      compressTitle: 'PDF Dosya Boyutunu Hızla Küçült',
      compressDesc: 'Kalite ve boyut dengesini seçerek PDF belgelerinizi kalite kaybı olmadan sıkıştırın.',
    },
    common: {
      dropTitle: 'Dosyaları buraya sürükleyip bırakın',
      dropHint: 'veya bilgisayarınızdan dosya seçin — tüm işlemler tarayıcınızda anında gerçekleşir',
      selectFiles: 'Dosya Seç',
      loadSample: 'Örnek Dosya Yükle',
      clearAll: 'Listeyi Temizle',
      moveUp: 'Yukarı taşı',
      moveDown: 'Aşağı taşı',
      remove: 'Kaldır',
      downloadPdf: 'PDF İndir',
      previewPdf: 'Önizle',
      hidePreview: 'Önizlemeyi Gizle',
      processing: 'İşleniyor...',
      pages: 'sayfa',
      page: 'sayfa',
      filesCount: 'dosya',
      totalSize: 'Toplam Boyut',
      ready: 'Hazır',
      emptyQueueTitle: 'Henüz dosya eklenmedi',
      emptyQueueDesc: 'Başlamak için yukarıdaki alana dosya bırakın veya örnek dosyalarla hemen test edin.',
      errorInvalidFile: 'Desteklenmeyen dosya formatı atlandı.',
      errorGeneric: 'İşlem sırasında bir hata oluştu. Lütfen dosyayı kontrol edip tekrar deneyin.',
      privacyTitle: 'Dosyalarınız Güvende — %100 Tarayıcı İçi İşlem',
      privacyNote:
        'Yüklediğiniz PDF, Word, Excel ve görsel dosyaları hiçbir sunucuya yüklenmez veya kaydedilmez. Tüm işlemler doğrudan kendi tarayıcınızda gerçekleşir; dosyalarınız cihazınızdan dışarı çıkmaz.',
    },
    merge: {
      fileQueueTitle: 'Birleştirilecek PDF Sırası',
      addMorePdfs: 'PDF Ekle',
      numberingSectionTitle: 'Sayfa Numaralandırma',
      enableNumbering: 'Sayfa numarası ekle',
      positionLabel: 'Konum',
      positions: {
        'bottom-left': 'Alt Sol',
        'bottom-center': 'Alt Orta',
        'bottom-right': 'Alt Sağ',
        'top-left': 'Üst Sol',
        'top-center': 'Üst Orta',
        'top-right': 'Üst Sağ',
      },
      formatLabel: 'Numara Biçimi',
      formats: {
        'number-only': 'Sadece Rakam (1, 2, 3)',
        'x-of-y': '1 / 12',
        'page-x': 'Sayfa 1',
        'page-x-of-y': 'Sayfa 1 / 12',
        'custom': 'Özel Önek',
      },
      customPrefixLabel: 'Özel Önek Metni',
      customPrefixPlaceholder: 'Örn. Ek',
      startNumberLabel: 'Başlangıç Numarası',
      fontSizeLabel: 'Yazı Boyutu (pt)',
      skipFirstPage: 'İlk sayfayı (kapak) numaralandırma',
      mergeButton: 'PDF’leri Birleştir',
      resultTitle: 'Birleştirilmiş PDF Hazır',
      resultSummary: 'Toplam sayfa ve çıktı boyutu',
      sampleBtn: 'Örnek PDF’ler Yükle',
    },
    split: {
      dropTitle: 'Ayrılacak PDF dosyasını buraya bırakın',
      dropHint: 'Sayfaları tek tek bağımsız PDF yapın veya dilediğiniz sayfa aralıklarını ayırın',
      selectPdf: 'PDF Seç',
      loadSample: '4 Sayfalık Örnek PDF Yükle',
      pagesGridTitle: 'PDF Sayfaları',
      selectAll: 'Tümünü Seç',
      deselectAll: 'Seçimi Temizle',
      selectedCount: 'sayfa seçili',
      settingsTitle: 'Ayırma Seçenekleri',
      modeLabel: 'Ayırma Modu',
      modes: {
        'all-individual': {
          title: 'Tüm Sayfaları Bağımsız PDF Yap',
          desc: 'Belgedeki her sayfayı ayrı bir PDF dosyası olarak çıkarır.',
        },
        'selected-individual': {
          title: 'Seçili Sayfaları Ayrı PDF Yap',
          desc: 'Yalnızca işaretlediğiniz her sayfayı ayrı birer PDF dosyasına dönüştürür.',
        },
        'extract-single': {
          title: 'Seçili Sayfaları Tek PDF Yap',
          desc: 'İşaretlediğiniz sayfaları tek bir bağımsız PDF dosyası olarak kaydeder.',
        },
        'custom-ranges': {
          title: 'Sayfa Aralıklarına Göre Böl',
          desc: 'Virgülle ayrılan her aralık için (örn. 1-2, 3-4) bağımsız PDF üretir.',
        },
      },
      rangeInputLabel: 'Sayfa Numaraları / Aralıklar',
      rangeInputPlaceholder: 'Örn. 1, 3-4',
      rangeInputHint: 'Virgülle ayırarak sayfa veya aralık yazın (ör. 1-2, 4).',
      splitButton: 'PDF’i Ayır',
      resultsTitle: 'Bağımsız PDF Dosyaları Hazır',
      downloadAll: 'Tümünü İndir',
      noSelectionError: 'Lütfen en az bir sayfa seçin.',
      invalidRangeError: 'Lütfen geçerli sayfa numaraları veya aralıkları girin.',
    },
    word: {
      queueTitle: 'Word Belgeleri (.docx)',
      addWordFiles: 'Word Ekle (.docx)',
      loadSamples: 'Örnek Word Belgeleri Yükle',
      pageBreakBetween: 'Belgeler arasına sayfa sonu ekle',
      mergeToEditor: 'Editörde Birleştir',
      editorTitle: 'Belge Düzenleyici',
      editorPlaceholder: 'Buraya yazmaya başlayın veya soldan Word (.docx) dosyaları ekleyin...',
      saveAsPdf: 'PDF Olarak Kaydet',
      saveAsDocx: 'Word (.docx) İndir',
      includePageNumbers: 'PDF çıktısına sayfa numarası ekle',
      toolbar: {
        undo: 'Geri Al',
        redo: 'Yinele',
        h1: 'Başlık 1',
        h2: 'Başlık 2',
        paragraph: 'Normal Metin',
        bold: 'Kalın',
        italic: 'İtalik',
        underline: 'Altı Çizili',
        bulletList: 'Madde İşareti',
        orderedList: 'Numaralı Liste',
        alignLeft: 'Sola Hizala',
        alignCenter: 'Ortala',
        alignRight: 'Sağa Hizala',
        pageBreak: 'Sayfa Sonu',
        clearFormat: 'Biçimi Temizle',
      },
      pageBreakLabel: 'Sayfa Sonu',
      exportSuccessPdf: 'Düzenlenen belge PDF olarak oluşturuldu.',
      exportSuccessDocx: 'Düzenlenen belge Word (.docx) olarak indirildi.',
      docNameLabel: 'Çıktı Dosya Adı',
      defaultDocName: 'Birlestirilmis_Belge',
    },
    convert: {
      dropTitle: 'Görsel, Word veya Excel dosyalarını bırakın',
      dropHint: 'PNG, JPG, WebP, SVG, DOCX, XLSX, XLS ve CSV dosyalarını tek seferde PDF’e çevirin',
      supportedFormats: 'Desteklenenler: JPG, PNG, WebP, GIF, BMP, SVG, DOCX, XLSX, XLS, CSV',
      loadSamples: 'Örnek Dosyalar Yükle (Excel + Görsel + Word)',
      queueTitle: 'Dönüştürülecek Dosyalar',
      settingsTitle: 'PDF Çıktı Ayarları',
      pageSizeLabel: 'Sayfa Boyutu',
      pageSizes: {
        a4: 'A4 (210 × 297 mm)',
        letter: 'Letter (8.5 × 11 in)',
        fit: 'Görsele Sığdır',
      },
      orientationLabel: 'Yönelim',
      orientations: {
        portrait: 'Dikey',
        landscape: 'Yatay',
      },
      combineAllLabel: 'Tüm dosyaları tek bir PDF’te birleştir',
      addPageNumbersLabel: 'Sayfa numarası ekle',
      convertButton: 'PDF’e Dönüştür',
      previewItem: 'Önizleme',
      sheetCount: 'sayfa tablo',
      typeLabels: {
        image: 'Görsel',
        word: 'Word Belgesi',
        excel: 'Excel Tablosu',
      },
      resultTitle: 'Dönüştürülen PDF Hazır',
    },
    compress: {
      dropTitle: 'Sıkıştırılacak PDF dosyalarını bırakın',
      dropHint: 'Birden fazla PDF dosyasını seçip dosya boyutunu hızla küçültebilirsiniz',
      loadSample: 'Örnek Ağır PDF Yükle',
      levelLabel: 'Sıkıştırma Seviyesi',
      levels: {
        low: {
          title: 'Düşük Sıkıştırma (Yüksek Kalite)',
          desc: 'Maksimum netlik ve keskin metinler, hafif boyut düşüşü.',
        },
        balanced: {
          title: 'Dengeli (Önerilen)',
          desc: 'Net okunabilirlik ile güçlü boyut küçültme dengesi.',
        },
        maximum: {
          title: 'Maksimum Sıkıştırma',
          desc: 'E-posta ve hızlı yükleme için en küçük dosya boyutu.',
        },
      },
      compressAll: 'PDF’leri Sıkıştır',
      table: {
        file: 'Dosya Adı',
        pages: 'Sayfa',
        original: 'Orijinal Boyut',
        compressed: 'Yeni Boyut',
        savings: 'Kazanç',
        action: 'İşlem',
      },
      download: 'İndir',
      alreadyOptimal: 'Zaten minimum boyutta',
      pending: 'Bekliyor',
      compressing: 'Sıkıştırılıyor...',
      done: 'Tamamlandı',
      downloadAll: 'Tümünü İndir',
    },
  },
  en: {
    appName: 'PDF Labs',
    nav: {
      merge: 'Merge PDF',
      split: 'Split PDF',
      word: 'Word Studio',
      convert: 'Convert to PDF',
      compress: 'Compress PDF',
    },
    hero: {
      mergeTitle: 'Merge PDFs & Add Page Numbers',
      mergeDesc: 'Arrange multiple PDF files in order, choose page number placement and format, and merge into one clean document.',
      splitTitle: 'Split PDF into Independent Files',
      splitDesc: 'Extract a single page or split multiple pages and custom ranges into separate standalone PDF files.',
      wordTitle: 'Merge, Edit & Save Word Documents',
      wordDesc: 'Combine multiple Word (.docx) files into a live rich-text editor, edit freely, and export as PDF or Word.',
      convertTitle: 'Convert Images, Word & Excel to PDF',
      convertDesc: 'Turn PNG, JPG, WebP images, Excel spreadsheets (.xlsx, .csv), and Word files into crisp PDFs in seconds.',
      compressTitle: 'Compress PDF File Size',
      compressDesc: 'Shrink large PDF files quickly with selectable quality presets and exact before/after byte savings.',
    },
    common: {
      dropTitle: 'Drag & drop files here',
      dropHint: 'or choose files from your device — everything runs locally in your browser',
      selectFiles: 'Select Files',
      loadSample: 'Load Sample Files',
      clearAll: 'Clear Queue',
      moveUp: 'Move up',
      moveDown: 'Move down',
      remove: 'Remove',
      downloadPdf: 'Download PDF',
      previewPdf: 'Preview',
      hidePreview: 'Hide Preview',
      processing: 'Processing...',
      pages: 'pages',
      page: 'page',
      filesCount: 'files',
      totalSize: 'Total Size',
      ready: 'Ready',
      emptyQueueTitle: 'No files added yet',
      emptyQueueDesc: 'Drop files into the upload zone above or load deterministic sample files to try it out.',
      errorInvalidFile: 'Unsupported file format skipped.',
      errorGeneric: 'An error occurred while processing. Please verify the file and try again.',
      privacyTitle: 'Your Files Stay Private — 100% In-Browser Processing',
      privacyNote:
        'Your PDF, Word, Excel, and image files are never uploaded to or stored on any server. All processing happens locally inside your browser so your documents never leave your device.',
    },
    merge: {
      fileQueueTitle: 'PDF Merge Queue',
      addMorePdfs: 'Add PDFs',
      numberingSectionTitle: 'Page Numbering',
      enableNumbering: 'Add page numbers',
      positionLabel: 'Position',
      positions: {
        'bottom-left': 'Bottom Left',
        'bottom-center': 'Bottom Center',
        'bottom-right': 'Bottom Right',
        'top-left': 'Top Left',
        'top-center': 'Top Center',
        'top-right': 'Top Right',
      },
      formatLabel: 'Number Format',
      formats: {
        'number-only': 'Number Only (1, 2, 3)',
        'x-of-y': '1 / 12',
        'page-x': 'Page 1',
        'page-x-of-y': 'Page 1 of 12',
        'custom': 'Custom Prefix',
      },
      customPrefixLabel: 'Custom Prefix Text',
      customPrefixPlaceholder: 'e.g. Appendix',
      startNumberLabel: 'Start Number',
      fontSizeLabel: 'Font Size (pt)',
      skipFirstPage: 'Skip first page (cover)',
      mergeButton: 'Merge PDFs',
      resultTitle: 'Merged PDF Ready',
      resultSummary: 'Total pages and output file size',
      sampleBtn: 'Load Sample PDFs',
    },
    split: {
      dropTitle: 'Drop a PDF file to split',
      dropHint: 'Convert every page into an independent PDF or extract specific pages and ranges',
      selectPdf: 'Select PDF',
      loadSample: 'Load 4-Page Sample PDF',
      pagesGridTitle: 'PDF Pages',
      selectAll: 'Select All',
      deselectAll: 'Clear Selection',
      selectedCount: 'pages selected',
      settingsTitle: 'Split Options',
      modeLabel: 'Split Mode',
      modes: {
        'all-individual': {
          title: 'Every Page as Separate PDF',
          desc: 'Splits every page in the document into its own independent PDF file.',
        },
        'selected-individual': {
          title: 'Selected Pages as Separate PDFs',
          desc: 'Turns each checked page into a separate standalone PDF file.',
        },
        'extract-single': {
          title: 'Extract Selected into One PDF',
          desc: 'Combines only your selected pages into one standalone PDF file.',
        },
        'custom-ranges': {
          title: 'Split by Custom Ranges',
          desc: 'Creates one independent PDF per comma-separated range (e.g. 1-2, 3-4).',
        },
      },
      rangeInputLabel: 'Page Numbers / Ranges',
      rangeInputPlaceholder: 'e.g. 1, 3-4',
      rangeInputHint: 'Separate pages or ranges with commas (e.g. 1-2, 4).',
      splitButton: 'Split PDF',
      resultsTitle: 'Independent PDF Files Ready',
      downloadAll: 'Download All',
      noSelectionError: 'Please select at least one page.',
      invalidRangeError: 'Please enter valid page numbers or ranges.',
    },
    word: {
      queueTitle: 'Word Documents (.docx)',
      addWordFiles: 'Add Word (.docx)',
      loadSamples: 'Load Sample Word Docs',
      pageBreakBetween: 'Insert page break between documents',
      mergeToEditor: 'Merge into Editor',
      editorTitle: 'Document Editor',
      editorPlaceholder: 'Start typing here or add Word (.docx) files on the left...',
      saveAsPdf: 'Save as PDF',
      saveAsDocx: 'Download Word (.docx)',
      includePageNumbers: 'Add page numbers to PDF export',
      toolbar: {
        undo: 'Undo',
        redo: 'Redo',
        h1: 'Heading 1',
        h2: 'Heading 2',
        paragraph: 'Normal Text',
        bold: 'Bold',
        italic: 'Italic',
        underline: 'Underline',
        bulletList: 'Bullet List',
        orderedList: 'Numbered List',
        alignLeft: 'Align Left',
        alignCenter: 'Align Center',
        alignRight: 'Align Right',
        pageBreak: 'Page Break',
        clearFormat: 'Clear Formatting',
      },
      pageBreakLabel: 'Page Break',
      exportSuccessPdf: 'Edited document exported as PDF.',
      exportSuccessDocx: 'Edited document downloaded as Word (.docx).',
      docNameLabel: 'Output Filename',
      defaultDocName: 'Merged_Document',
    },
    convert: {
      dropTitle: 'Drop Images, Word, or Excel files here',
      dropHint: 'Convert PNG, JPG, WebP, SVG, DOCX, XLSX, XLS, and CSV into clean PDFs',
      supportedFormats: 'Supported: JPG, PNG, WebP, GIF, BMP, SVG, DOCX, XLSX, XLS, CSV',
      loadSamples: 'Load Sample Files (Excel + Image + Word)',
      queueTitle: 'Conversion Queue',
      settingsTitle: 'PDF Output Settings',
      pageSizeLabel: 'Page Size',
      pageSizes: {
        a4: 'A4 (210 × 297 mm)',
        letter: 'Letter (8.5 × 11 in)',
        fit: 'Fit to Image',
      },
      orientationLabel: 'Orientation',
      orientations: {
        portrait: 'Portrait',
        landscape: 'Landscape',
      },
      combineAllLabel: 'Combine all files into a single PDF',
      addPageNumbersLabel: 'Add page numbers',
      convertButton: 'Convert to PDF',
      previewItem: 'Preview',
      sheetCount: 'sheets',
      typeLabels: {
        image: 'Image',
        word: 'Word Document',
        excel: 'Excel Sheet',
      },
      resultTitle: 'Converted PDF Ready',
    },
    compress: {
      dropTitle: 'Drop PDF files to compress',
      dropHint: 'Select one or multiple PDFs to reduce file size quickly',
      loadSample: 'Load Sample Heavy PDF',
      levelLabel: 'Compression Level',
      levels: {
        low: {
          title: 'Low Compression (High Quality)',
          desc: 'Preserves sharpest detail and crisp typography with mild reduction.',
        },
        balanced: {
          title: 'Balanced (Recommended)',
          desc: 'Optimal balance between crisp readability and strong file reduction.',
        },
        maximum: {
          title: 'Maximum Compression',
          desc: 'Smallest possible file size for email attachments and fast uploads.',
        },
      },
      compressAll: 'Compress PDFs',
      table: {
        file: 'Filename',
        pages: 'Pages',
        original: 'Original Size',
        compressed: 'Compressed Size',
        savings: 'Saved',
        action: 'Action',
      },
      download: 'Download',
      alreadyOptimal: 'Already optimal',
      pending: 'Pending',
      compressing: 'Compressing...',
      done: 'Done',
      downloadAll: 'Download All',
    },
  },
};
