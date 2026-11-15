export type Language = 'tr' | 'en';

export type ToolId =
  | 'merge'
  | 'split'
  | 'organize'
  | 'rotate'
  | 'compress'
  | 'convert'
  | 'pdf2img'
  | 'word'
  | 'watermark'
  | 'encrypt'
  | 'unlock'
  | 'repair';

export type ToolTab = 'home' | ToolId;

export type ToolCategory = 'all' | 'organize' | 'convert' | 'security';

export interface ToolCardMeta {
  title: string;
  desc: string;
  category: Exclude<ToolCategory, 'all'>;
}

export interface Translations {
  appName: string;
  nav: {
    home: string;
    merge: string;
    split: string;
    convert: string;
    compress: string;
  };
  home: {
    title: string;
    subtitle: string;
    backToAll: string;
    categories: Record<ToolCategory, string>;
    tools: Record<ToolId, ToolCardMeta>;
    openTool: string;
  };
  hero: Record<ToolId, { title: string; desc: string }>;
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
  organize: {
    dropTitle: string;
    dropHint: string;
    selectPdf: string;
    loadSample: string;
    gridTitle: string;
    moveLeft: string;
    moveRight: string;
    duplicatePage: string;
    deletePage: string;
    resetOrder: string;
    applyButton: string;
    resultTitle: string;
    minOnePageError: string;
  };
  rotate: {
    dropTitle: string;
    dropHint: string;
    selectPdf: string;
    loadSample: string;
    gridTitle: string;
    rotateAllLeft: string;
    rotateAllRight: string;
    rotateAll180: string;
    resetAll: string;
    rotateLeft: string;
    rotateRight: string;
    applyButton: string;
    resultTitle: string;
    angleLabel: string;
  };
  watermark: {
    dropTitle: string;
    dropHint: string;
    selectPdf: string;
    loadSample: string;
    settingsTitle: string;
    textLabel: string;
    defaultText: string;
    layoutLabel: string;
    layouts: {
      diagonal: string;
      tiled: string;
      footer: string;
    };
    opacityLabel: string;
    fontSizeLabel: string;
    colorLabel: string;
    colors: {
      slate: string;
      crimson: string;
      blue: string;
    };
    previewLabel: string;
    applyButton: string;
    resultTitle: string;
    emptyTextError: string;
  };
  pdf2img: {
    dropTitle: string;
    dropHint: string;
    selectPdf: string;
    loadSample: string;
    formatLabel: string;
    scaleLabel: string;
    scales: {
      '1': string;
      '2': string;
      '3': string;
    };
    convertButton: string;
    resultsTitle: string;
    downloadImage: string;
    downloadAll: string;
  };
  encrypt: {
    dropTitle: string;
    dropHint: string;
    selectPdf: string;
    loadSample: string;
    settingsTitle: string;
    userPasswordLabel: string;
    userPasswordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    ownerPasswordLabel: string;
    ownerPasswordPlaceholder: string;
    permissionsLabel: string;
    allowPrinting: string;
    allowCopying: string;
    allowModifying: string;
    encryptButton: string;
    resultTitle: string;
    resultNote: string;
    passwordRequiredError: string;
    passwordMismatchError: string;
    alreadyEncryptedError: string;
  };
  unlock: {
    dropTitle: string;
    dropHint: string;
    selectPdf: string;
    loadSample: string;
    sampleHint: string;
    statusLocked: string;
    statusUnlocked: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    unlockButton: string;
    resultTitle: string;
    wrongPasswordError: string;
    passwordNeededError: string;
    notEncryptedNote: string;
  };
  repair: {
    dropTitle: string;
    dropHint: string;
    selectPdf: string;
    loadSample: string;
    diagnosticsTitle: string;
    repairButton: string;
    resultTitle: string;
    statusHealthy: string;
    statusRecovered: string;
    headerNormalized: string;
    eofRestored: string;
    xrefRebuilt: string;
    rasterFallbackUsed: string;
    pagesRecoveredLabel: string;
    cannotRepairError: string;
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
      home: 'Tüm Araçlar',
      merge: 'Birleştir',
      split: 'Ayır',
      convert: 'Dönüştür',
      compress: 'Sıkıştır',
    },
    home: {
      title: 'Tüm PDF ve Belge Araçları Tek Yerde',
      subtitle:
        'Birleştirme, ayırma, döndürme, sıkıştırma, şifreleme, onarım ve dönüştürme araçlarının tamamı doğrudan tarayıcınızda çalışır.',
      backToAll: 'Tüm Araçlar',
      openTool: 'Aracı Aç',
      categories: {
        all: 'Tümü (12)',
        organize: 'Sayfa Düzenleme',
        convert: 'Dönüştürme & Word',
        security: 'Güvenlik & Onarım',
      },
      tools: {
        merge: {
          title: 'PDF Birleştir',
          desc: 'Birden fazla PDF dosyasını sıraya koyun ve tek tek sayfa numarası verin.',
          category: 'organize',
        },
        split: {
          title: 'PDF Ayır',
          desc: 'Sayfaları tek tek veya seçtiğiniz aralıklarla bağımsız PDF yapın.',
          category: 'organize',
        },
        organize: {
          title: 'Sayfa Sırala & Sil',
          desc: 'PDF içindeki sayfaların yerini değiştirin, kopyalayın veya silin.',
          category: 'organize',
        },
        rotate: {
          title: 'PDF Döndür',
          desc: 'Sayfaları tek tek veya topluca 90° sola, sağa ya da 180° döndürün.',
          category: 'organize',
        },
        compress: {
          title: 'PDF Sıkıştır',
          desc: 'Kalite seviyesini seçerek PDF dosya boyutunu hızla küçültün.',
          category: 'organize',
        },
        convert: {
          title: 'PDF Dönüştür',
          desc: 'Görsel, Word (.docx) ve Excel (.xlsx, .csv) dosyalarını PDF yapın.',
          category: 'convert',
        },
        pdf2img: {
          title: 'PDF’den Görsele',
          desc: 'PDF sayfalarını yüksek çözünürlüklü PNG veya JPG olarak dışa aktarın.',
          category: 'convert',
        },
        word: {
          title: 'Word Stüdyo',
          desc: 'Birden çok Word belgesini birleştirip düzenleyin, PDF/DOCX kaydedin.',
          category: 'convert',
        },
        watermark: {
          title: 'Filigran Ekle',
          desc: 'Tüm sayfalara şeffaf metin filigranı ve damga yerleştirin.',
          category: 'security',
        },
        encrypt: {
          title: 'PDF Şifrele',
          desc: 'Belgeye açılış parolası ve yazdırma/kopyalama izin kilidi ekleyin.',
          category: 'security',
        },
        unlock: {
          title: 'PDF Şifre Kaldır',
          desc: 'Parolasını bildiğiniz PDF’in şifre ve izin kilidini kalıcı olarak açın.',
          category: 'security',
        },
        repair: {
          title: 'PDF Onar',
          desc: 'Hasarlı XRef tablosu veya bozuk yapılı PDF dosyalarını kurtarın.',
          category: 'security',
        },
      },
    },
    hero: {
      merge: {
        title: 'PDF Dosyalarını Birleştir ve Numaralandır',
        desc: 'Birden fazla PDF dosyasını sıraya koyun, sayfa numarası konumunu ve biçimini seçerek tek dosyada birleştirin.',
      },
      split: {
        title: 'PDF Sayfalarını Bağımsız Dosyalara Ayır',
        desc: 'Tek bir sayfayı ya da seçtiğiniz sayfa aralıklarını saniyeler içinde bağımsız PDF dosyalarına dönüştürün.',
      },
      organize: {
        title: 'PDF Sayfalarını Sırala, Kopyala ve Sil',
        desc: 'Sayfaları görsel önizleme ile yeniden sıralayın, istemediklerinizi çıkarın ve temiz PDF olarak kaydedin.',
      },
      rotate: {
        title: 'PDF Sayfalarını Döndür',
        desc: 'Tek bir sayfayı veya tüm belgeyi 90° sola, sağa ya da 180° döndürerek kalıcı olarak kaydedin.',
      },
      compress: {
        title: 'PDF Dosya Boyutunu Hızla Küçült',
        desc: 'Kalite ve boyut dengesini seçerek PDF belgelerinizi kalite kaybı olmadan sıkıştırın.',
      },
      convert: {
        title: 'Görsel, Word ve Excel Dosyalarını PDF Yap',
        desc: 'PNG, JPG, WebP görselleri, Excel tablolarını (.xlsx, .csv) ve Word belgelerini saniyeler içinde PDF’e dönüştürün.',
      },
      pdf2img: {
        title: 'PDF Sayfalarını Görsele Dönüştür (PNG / JPG)',
        desc: 'PDF belgesindeki her sayfayı seçtiğiniz çözünürlükte net PNG veya JPG dosyalarına dönüştürün.',
      },
      word: {
        title: 'Word Dosyalarını Birleştir, Düzenle ve Kaydet',
        desc: 'Birden çok Word (.docx) belgesini tek editörde birleştirip düzenleyin; doğrudan PDF veya Word olarak kaydedin.',
      },
      watermark: {
        title: 'PDF Sayfalarına Metin Filigranı Ekle',
        desc: 'Belgelerinize saydamlık, açı, boyut ve yerleşim ayarıyla özel metin filigranı damgalayın.',
      },
      encrypt: {
        title: 'PDF Dosyasını Parola ile Şifrele',
        desc: 'PDF belgenizi 128-bit şifreleme ile koruyun; yazdırma, kopyalama ve düzenleme izinlerini belirleyin.',
      },
      unlock: {
        title: 'PDF Parolasını ve Kısıtlamalarını Kaldır',
        desc: 'Şifreli PDF dosyasının parolasını girerek kilidi kaldırın ve şifresiz kopyasını indirin.',
      },
      repair: {
        title: 'Bozuk veya Hasarlı PDF Dosyasını Onar',
        desc: 'Eksik son işaretçisi, bozuk XRef tablosu veya açılmayan yapıya sahip PDF’leri tarayıcı içinde kurtarın.',
      },
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
    organize: {
      dropTitle: 'Düzenlenecek PDF dosyasını buraya bırakın',
      dropHint: 'Sayfaların sırasını değiştirin, kopyalayın veya gereksiz sayfaları silin',
      selectPdf: 'PDF Seç',
      loadSample: '4 Sayfalık Örnek PDF Yükle',
      gridTitle: 'Sayfa Sırası ve Düzenleme',
      moveLeft: 'Sola taşı',
      moveRight: 'Sağa taşı',
      duplicatePage: 'Sayfayı çoğalt',
      deletePage: 'Sayfayı sil',
      resetOrder: 'Sırayı Sıfırla',
      applyButton: 'Yeni Sırayla Kaydet',
      resultTitle: 'Düzenlenen PDF Hazır',
      minOnePageError: 'Belgede en az 1 sayfa kalmalıdır.',
    },
    rotate: {
      dropTitle: 'Döndürülecek PDF dosyasını buraya bırakın',
      dropHint: 'Her sayfayı bağımsız döndürebilir veya tek tıkla tüm belgeye açı uygulayabilirsiniz',
      selectPdf: 'PDF Seç',
      loadSample: 'Örnek PDF Yükle',
      gridTitle: 'Sayfa Önizleme ve Döndürme',
      rotateAllLeft: 'Tümünü 90° Sola',
      rotateAllRight: 'Tümünü 90° Sağa',
      rotateAll180: 'Tümünü 180°',
      resetAll: 'Sıfırla',
      rotateLeft: '90° Sola Döndür',
      rotateRight: '90° Sağa Döndür',
      applyButton: 'Döndürülmüş PDF’i Kaydet',
      resultTitle: 'Döndürülmüş PDF Hazır',
      angleLabel: 'Açı',
    },
    watermark: {
      dropTitle: 'Filigran eklenecek PDF dosyasını bırakın',
      dropHint: 'Belgelerinize çapraz, döşemeli veya alt/üst bilgi filigranı ekleyin',
      selectPdf: 'PDF Seç',
      loadSample: 'Örnek PDF Yükle',
      settingsTitle: 'Filigran Ayarları',
      textLabel: 'Filigran Metni',
      defaultText: 'GİZLİ BELGE',
      layoutLabel: 'Yerleşim Düzeni',
      layouts: {
        diagonal: 'Orta Çapraz (-45°)',
        tiled: 'Sayfaya Döşeli (Grid)',
        footer: 'Üst / Alt Damga',
      },
      opacityLabel: 'Saydamlık',
      fontSizeLabel: 'Yazı Boyutu',
      colorLabel: 'Renk',
      colors: {
        slate: 'Koyu Gri',
        crimson: 'Kırmızı',
        blue: 'Lacivert',
      },
      previewLabel: 'Canlı Konum Önizleme',
      applyButton: 'Filigran Uygula',
      resultTitle: 'Filigranlı PDF Hazır',
      emptyTextError: 'Lütfen filigran metni girin.',
    },
    pdf2img: {
      dropTitle: 'Görsele çevrilecek PDF dosyasını bırakın',
      dropHint: 'Sayfaları yüksek kaliteli PNG veya JPG görsellere dönüştürün',
      selectPdf: 'PDF Seç',
      loadSample: 'Örnek PDF Yükle',
      formatLabel: 'Çıktı Formatı',
      scaleLabel: 'Çözünürlük Kalitesi',
      scales: {
        '1': 'Standart (1x)',
        '2': 'Yüksek (2x — Önerilen)',
        '3': 'Ultra Net (3x)',
      },
      convertButton: 'Görsellere Dönüştür',
      resultsTitle: 'Oluşturulan Sayfa Görselleri',
      downloadImage: 'Görseli İndir',
      downloadAll: 'Tümünü İndir',
    },
    encrypt: {
      dropTitle: 'Şifrelenecek PDF dosyasını buraya bırakın',
      dropHint: 'Açılış parolası ve belge izinlerini tarayıcınızda güvenle tanımlayın',
      selectPdf: 'PDF Seç',
      loadSample: 'Örnek PDF Yükle',
      settingsTitle: 'Parola ve İzin Ayarları',
      userPasswordLabel: 'Açılış Parolası (Zorunlu)',
      userPasswordPlaceholder: 'Belgeyi açmak için parola girin',
      confirmPasswordLabel: 'Parolayı Doğrula',
      confirmPasswordPlaceholder: 'Parolayı tekrar girin',
      ownerPasswordLabel: 'Yönetici Parolası (İsteğe Bağlı)',
      ownerPasswordPlaceholder: 'Boş bırakılırsa açılış parolası kullanılır',
      permissionsLabel: 'Belge İzinleri',
      allowPrinting: 'Yazdırmaya izin ver',
      allowCopying: 'Metin ve görsel kopyalamaya izin ver',
      allowModifying: 'Belge düzenlemeye izin ver',
      encryptButton: 'PDF’i Şifrele',
      resultTitle: 'Şifreli PDF Hazır',
      resultNote: 'Bu PDF artık açılışta belirlediğiniz parolayı isteyecektir.',
      passwordRequiredError: 'Lütfen bir açılış parolası belirleyin.',
      passwordMismatchError: 'Girdiğiniz parolalar birbiriyle eşleşmiyor.',
      alreadyEncryptedError: 'Bu PDF zaten şifreli. Önce PDF Şifre Kaldır aracını kullanın.',
    },
    unlock: {
      dropTitle: 'Kilidi açılacak şifreli PDF’i bırakın',
      dropHint: 'Parolasını bildiğiniz PDF dosyasından şifre ve kısıtlamaları kaldırın',
      selectPdf: 'Şifreli PDF Seç',
      loadSample: 'Örnek Şifreli PDF Yükle (Parola: 1234)',
      sampleHint: 'Test etmek için örnek kilitli PDF yükleyip parola alanına 1234 yazabilirsiniz.',
      statusLocked: 'Parola korumalı PDF algılandı',
      statusUnlocked: 'Bu PDF açık (kısıtlama temizlenebilir)',
      passwordLabel: 'PDF Parolası',
      passwordPlaceholder: 'Belgenin mevcut parolasını girin',
      unlockButton: 'Şifreyi Kaldır',
      resultTitle: 'Kilidi Açılmış PDF Hazır',
      wrongPasswordError: 'Girilen parola yanlış. Lütfen kontrol edip tekrar deneyin.',
      passwordNeededError: 'Bu PDF açılış parolası ile korunuyor. Lütfen parolayı girin.',
      notEncryptedNote: 'Dosyada açılış parolası yok; yine de temiz, kısıtlamasız kopya üretildi.',
    },
    repair: {
      dropTitle: 'Hasarlı veya açılmayan PDF dosyasını bırakın',
      dropHint: 'Bozuk XRef tablosu, eksik EOF veya hatalı başlık yapısını tarayıcıda kurtarın',
      selectPdf: 'PDF Seç',
      loadSample: 'Örnek Hasarlı PDF Yükle',
      diagnosticsTitle: 'Onarım Raporu',
      repairButton: 'PDF’i Onar ve Kurtar',
      resultTitle: 'Onarılmış PDF Hazır',
      statusHealthy: 'Yapısal doğrulama ve yeniden paketleme tamamlandı',
      statusRecovered: 'Hasar tespit edildi ve sayfalar başarıyla kurtarıldı',
      headerNormalized: 'Başlık (%PDF-) öncesi bozuk baytlar temizlendi',
      eofRestored: 'Eksik %%EOF sonlandırıcı işareti onarıldı',
      xrefRebuilt: 'XRef çapraz referans tablosu ve nesne akışı yeniden kuruldu',
      rasterFallbackUsed: 'Ağır yapısal hasar nedeniyle sayfalar yüksek çözünürlüklü görüntü kurtarma ile yeniden üretildi',
      pagesRecoveredLabel: 'Kurtarılan Sayfa',
      cannotRepairError: 'Dosya kurtarılamayacak kadar bozuk veya geçerli bir PDF verisi içermiyor.',
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
      home: 'All Tools',
      merge: 'Merge',
      split: 'Split',
      convert: 'Convert',
      compress: 'Compress',
    },
    home: {
      title: 'Every PDF & Document Tool in One Place',
      subtitle:
        'Merge, split, rotate, compress, encrypt, unlock, repair, and convert documents directly inside your browser.',
      backToAll: 'All Tools',
      openTool: 'Open Tool',
      categories: {
        all: 'All (12)',
        organize: 'Organize & Optimize',
        convert: 'Convert & Word',
        security: 'Security & Repair',
      },
      tools: {
        merge: {
          title: 'Merge PDF',
          desc: 'Arrange multiple PDFs in order and add individual page numbers.',
          category: 'organize',
        },
        split: {
          title: 'Split PDF',
          desc: 'Extract single pages or split custom ranges into separate PDFs.',
          category: 'organize',
        },
        organize: {
          title: 'Organize Pages',
          desc: 'Reorder, duplicate, or delete individual pages with thumbnails.',
          category: 'organize',
        },
        rotate: {
          title: 'Rotate PDF',
          desc: 'Rotate individual pages or the whole PDF 90° left, right, or 180°.',
          category: 'organize',
        },
        compress: {
          title: 'Compress PDF',
          desc: 'Shrink large PDF file sizes quickly with selectable quality presets.',
          category: 'organize',
        },
        convert: {
          title: 'Convert to PDF',
          desc: 'Turn images, Word (.docx), and Excel (.xlsx, .csv) into crisp PDFs.',
          category: 'convert',
        },
        pdf2img: {
          title: 'PDF to Images',
          desc: 'Export every PDF page as high-resolution PNG or JPG images.',
          category: 'convert',
        },
        word: {
          title: 'Word Studio',
          desc: 'Merge and live-edit Word documents, then export as PDF or DOCX.',
          category: 'convert',
        },
        watermark: {
          title: 'Watermark PDF',
          desc: 'Stamp diagonal, tiled, or footer text watermarks across pages.',
          category: 'security',
        },
        encrypt: {
          title: 'Encrypt PDF',
          desc: 'Add an open password and control print, copy, or edit permissions.',
          category: 'security',
        },
        unlock: {
          title: 'Unlock PDF',
          desc: 'Enter the password to remove protection and save an unlocked PDF.',
          category: 'security',
        },
        repair: {
          title: 'Repair PDF',
          desc: 'Recover PDFs with damaged XRef tables, headers, or EOF markers.',
          category: 'security',
        },
      },
    },
    hero: {
      merge: {
        title: 'Merge PDFs & Add Page Numbers',
        desc: 'Arrange multiple PDF files in order, choose page number placement and format, and merge into one clean document.',
      },
      split: {
        title: 'Split PDF into Independent Files',
        desc: 'Extract a single page or split multiple pages and custom ranges into separate standalone PDF files.',
      },
      organize: {
        title: 'Reorder, Duplicate & Delete PDF Pages',
        desc: 'Preview every page as a thumbnail, adjust the order, remove unwanted pages, and save a clean PDF.',
      },
      rotate: {
        title: 'Rotate PDF Pages',
        desc: 'Rotate individual pages or every page in your document by 90° left, 90° right, or 180°.',
      },
      compress: {
        title: 'Compress PDF File Size',
        desc: 'Shrink large PDF files quickly with selectable quality presets and exact before/after byte savings.',
      },
      convert: {
        title: 'Convert Images, Word & Excel to PDF',
        desc: 'Turn PNG, JPG, WebP images, Excel spreadsheets (.xlsx, .csv), and Word files into crisp PDFs in seconds.',
      },
      pdf2img: {
        title: 'Export PDF Pages as PNG or JPG Images',
        desc: 'Render every page of a PDF document into high-resolution PNG or JPG image files.',
      },
      word: {
        title: 'Merge, Edit & Save Word Documents',
        desc: 'Combine multiple Word (.docx) files into a live rich-text editor, edit freely, and export as PDF or Word.',
      },
      watermark: {
        title: 'Add Text Watermark to PDF',
        desc: 'Stamp customizable text watermarks across your PDF with live opacity, angle, size, and layout controls.',
      },
      encrypt: {
        title: 'Encrypt & Password-Protect PDF',
        desc: 'Secure your PDF with 128-bit encryption and configure printing, copying, and editing permissions.',
      },
      unlock: {
        title: 'Unlock Password-Protected PDF',
        desc: 'Supply the document password to permanently strip encryption and save an unrestricted copy.',
      },
      repair: {
        title: 'Repair Damaged or Corrupted PDF',
        desc: 'Fix missing EOF trailers, broken XRef tables, or malformed headers right inside your browser.',
      },
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
    organize: {
      dropTitle: 'Drop a PDF file to organize pages',
      dropHint: 'Reorder pages, duplicate important sheets, or remove unwanted pages',
      selectPdf: 'Select PDF',
      loadSample: 'Load 4-Page Sample PDF',
      gridTitle: 'Page Order & Actions',
      moveLeft: 'Move earlier',
      moveRight: 'Move later',
      duplicatePage: 'Duplicate page',
      deletePage: 'Delete page',
      resetOrder: 'Reset Order',
      applyButton: 'Save Organized PDF',
      resultTitle: 'Organized PDF Ready',
      minOnePageError: 'The document must keep at least 1 page.',
    },
    rotate: {
      dropTitle: 'Drop a PDF file to rotate',
      dropHint: 'Rotate individual pages or apply a global angle across the whole document',
      selectPdf: 'Select PDF',
      loadSample: 'Load Sample PDF',
      gridTitle: 'Page Thumbnails & Rotation',
      rotateAllLeft: 'All 90° Left',
      rotateAllRight: 'All 90° Right',
      rotateAll180: 'All 180°',
      resetAll: 'Reset',
      rotateLeft: 'Rotate 90° Left',
      rotateRight: 'Rotate 90° Right',
      applyButton: 'Save Rotated PDF',
      resultTitle: 'Rotated PDF Ready',
      angleLabel: 'Angle',
    },
    watermark: {
      dropTitle: 'Drop a PDF file to watermark',
      dropHint: 'Stamp diagonal, tiled, or header/footer text across every page',
      selectPdf: 'Select PDF',
      loadSample: 'Load Sample PDF',
      settingsTitle: 'Watermark Settings',
      textLabel: 'Watermark Text',
      defaultText: 'CONFIDENTIAL',
      layoutLabel: 'Layout',
      layouts: {
        diagonal: 'Center Diagonal (-45°)',
        tiled: 'Tiled Pattern (Grid)',
        footer: 'Header / Footer Stamp',
      },
      opacityLabel: 'Opacity',
      fontSizeLabel: 'Font Size',
      colorLabel: 'Color',
      colors: {
        slate: 'Slate Gray',
        crimson: 'Crimson Red',
        blue: 'Navy Blue',
      },
      previewLabel: 'Live Placement Preview',
      applyButton: 'Apply Watermark',
      resultTitle: 'Watermarked PDF Ready',
      emptyTextError: 'Please enter watermark text.',
    },
    pdf2img: {
      dropTitle: 'Drop a PDF file to convert to images',
      dropHint: 'Export every PDF page as crisp PNG or JPG image files',
      selectPdf: 'Select PDF',
      loadSample: 'Load Sample PDF',
      formatLabel: 'Image Format',
      scaleLabel: 'Resolution Quality',
      scales: {
        '1': 'Standard (1x)',
        '2': 'High (2x — Recommended)',
        '3': 'Ultra Crisp (3x)',
      },
      convertButton: 'Convert to Images',
      resultsTitle: 'Exported Page Images',
      downloadImage: 'Download Image',
      downloadAll: 'Download All',
    },
    encrypt: {
      dropTitle: 'Drop a PDF file to encrypt',
      dropHint: 'Set a document open password and granular permissions right in your browser',
      selectPdf: 'Select PDF',
      loadSample: 'Load Sample PDF',
      settingsTitle: 'Password & Permissions',
      userPasswordLabel: 'Open Password (Required)',
      userPasswordPlaceholder: 'Enter password required to open PDF',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Re-enter password',
      ownerPasswordLabel: 'Owner Password (Optional)',
      ownerPasswordPlaceholder: 'Defaults to open password if left blank',
      permissionsLabel: 'Document Permissions',
      allowPrinting: 'Allow printing',
      allowCopying: 'Allow copying text and images',
      allowModifying: 'Allow modifying document',
      encryptButton: 'Encrypt PDF',
      resultTitle: 'Encrypted PDF Ready',
      resultNote: 'This PDF now requires the password you set when opened.',
      passwordRequiredError: 'Please enter an open password.',
      passwordMismatchError: 'Passwords do not match.',
      alreadyEncryptedError: 'This PDF is already encrypted. Use Unlock PDF first.',
    },
    unlock: {
      dropTitle: 'Drop a password-protected PDF to unlock',
      dropHint: 'Enter the PDF password to permanently strip encryption and restrictions',
      selectPdf: 'Select Locked PDF',
      loadSample: 'Load Sample Locked PDF (Password: 1234)',
      sampleHint: 'Load the sample locked PDF and enter 1234 as the password to test.',
      statusLocked: 'Password-protected PDF detected',
      statusUnlocked: 'PDF is readable (can re-save unrestricted copy)',
      passwordLabel: 'Document Password',
      passwordPlaceholder: 'Enter current PDF password',
      unlockButton: 'Unlock PDF',
      resultTitle: 'Unlocked PDF Ready',
      wrongPasswordError: 'Incorrect password. Please double-check and try again.',
      passwordNeededError: 'This PDF requires a password to open. Please enter it.',
      notEncryptedNote: 'No open password was set; saved a clean, unrestricted copy.',
    },
    repair: {
      dropTitle: 'Drop a damaged or malformed PDF to repair',
      dropHint: 'Fix missing EOF trailers, broken XRef tables, or leading byte corruption',
      selectPdf: 'Select PDF',
      loadSample: 'Load Sample Corrupted PDF',
      diagnosticsTitle: 'Repair Diagnostics',
      repairButton: 'Repair & Recover PDF',
      resultTitle: 'Repaired PDF Ready',
      statusHealthy: 'Structural validation and clean repackaging complete',
      statusRecovered: 'Corruption detected and pages recovered successfully',
      headerNormalized: 'Stripped invalid leading bytes before %PDF- header',
      eofRestored: 'Restored missing %%EOF trailer marker',
      xrefRebuilt: 'Rebuilt XRef cross-reference table and object streams',
      rasterFallbackUsed: 'Severe corruption bypassed via high-DPI page reconstruction',
      pagesRecoveredLabel: 'Pages Recovered',
      cannotRepairError: 'The file is too severely corrupted or contains no valid PDF data.',
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
