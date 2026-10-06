import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  PenTool,
  Pointer,
  Trash2,
  Upload,
  Maximize2,
  X,
  FileText,
  Loader2,
  Monitor,
  FolderUp,
  Sparkles,
  HelpCircle,
  Video as VideoIcon
} from 'lucide-react';
import { socket } from '../services/socket';
import { loadPptxFile, loadPdfFile } from '../utils/pptxLoader';
import { useLanguage } from '../i18n/LanguageContext';

export function PresentationView({
  presentation,
  isPresenter,
  onStopPresentation,
  onSlideChange,
  onStartScreenShare,
}) {
  const { t, language } = useLanguage();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(presentation?.currentSlide || 0);
  const [toolMode, setToolMode] = useState('laser'); // 'laser' | 'pen' | 'none'
  const [penColor, setPenColor] = useState('#EF4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const [remoteLaser, setRemoteLaser] = useState({ x: 0, y: 0, active: false });
  const [slides, setSlides] = useState(presentation?.slides || []);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const currentPathRef = useRef([]);
  const fileInputRef = useRef(null);

  // Sync slides and index from server
  useEffect(() => {
    if (presentation?.slides) {
      setSlides(presentation.slides);
    }
    if (presentation && presentation.currentSlide !== undefined) {
      setCurrentSlideIndex(presentation.currentSlide);
    }
  }, [presentation?.slides, presentation?.currentSlide]);

  // Socket listeners for laser pointer and drawing pen
  useEffect(() => {
    const handleLaserUpdate = ({ x, y, active }) => {
      setRemoteLaser({ x, y, active });
    };

    const handleStrokeReceived = ({ slideIndex, stroke }) => {
      if (slideIndex === currentSlideIndex) {
        drawStrokeOnCanvas(stroke);
      }
    };

    const handleDrawingsCleared = ({ slideIndex }) => {
      if (slideIndex === undefined || slideIndex === currentSlideIndex) {
        clearCanvas();
      }
    };

    socket.on('presentation-laser-updated', handleLaserUpdate);
    socket.on('presentation-stroke-received', handleStrokeReceived);
    socket.on('presentation-drawings-cleared', handleDrawingsCleared);

    return () => {
      socket.off('presentation-laser-updated', handleLaserUpdate);
      socket.off('presentation-stroke-received', handleStrokeReceived);
      socket.off('presentation-drawings-cleared', handleDrawingsCleared);
    };
  }, [currentSlideIndex]);

  // Redraw canvas on slide change
  useEffect(() => {
    clearCanvas();
  }, [currentSlideIndex]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const drawStrokeOnCanvas = (stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { points, color, size } = stroke;
    if (!points || points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = size || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const width = canvas.width;
    const height = canvas.height;

    ctx.moveTo(points[0].x * width, points[0].y * height);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * width, points[i].y * height);
    }
    ctx.stroke();
  };

  // Laser Pointer & Pen Mouse Events
  const handleMouseMove = (e) => {
    if (!isPresenter || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (toolMode === 'laser') {
      socket.emit('presentation-laser-move', { x, y, active: true });
    }

    if (toolMode === 'pen' && isDrawing) {
      const normPoint = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
      currentPathRef.current.push(normPoint);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const prev = currentPathRef.current[currentPathRef.current.length - 2];
        if (prev) {
          ctx.strokeStyle = penColor;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
          ctx.lineTo(normPoint.x * canvas.width, normPoint.y * canvas.height);
          ctx.stroke();
        }
      }
    }
  };

  const handleMouseLeave = () => {
    if (isPresenter && toolMode === 'laser') {
      socket.emit('presentation-laser-move', { x: 0, y: 0, active: false });
    }
    if (isDrawing) {
      endDrawing();
    }
  };

  const startDrawing = (e) => {
    if (!isPresenter || toolMode !== 'pen' || !containerRef.current) return;
    setIsDrawing(true);
    const rect = containerRef.current.getBoundingClientRect();
    const normPoint = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    currentPathRef.current = [normPoint];
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPathRef.current.length > 1) {
      const stroke = {
        points: currentPathRef.current,
        color: penColor,
        size: 3,
      };
      socket.emit('presentation-draw-stroke', { slideIndex: currentSlideIndex, stroke });
    }
    currentPathRef.current = [];
  };

  // Slide navigation
  const prevSlide = () => {
    if (!isPresenter || currentSlideIndex <= 0) return;
    const newIdx = currentSlideIndex - 1;
    setCurrentSlideIndex(newIdx);
    onSlideChange(newIdx);
    clearCanvas();
  };

  const nextSlide = () => {
    if (!isPresenter || currentSlideIndex >= slides.length - 1) return;
    const newIdx = currentSlideIndex + 1;
    setCurrentSlideIndex(newIdx);
    onSlideChange(newIdx);
    clearCanvas();
  };

  const clearCurrentDrawings = () => {
    clearCanvas();
    socket.emit('presentation-clear-drawings', { slideIndex: currentSlideIndex });
  };

  // Helper to read file as Data URL
  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // File Upload Handler (PDF, PPTX, Images, Video)
  const handleUploadFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsLoadingFile(true);
    setLoadingText(language === 'ru' ? 'Обработка файлов...' : 'Файллар қайта ишланмоқда...');

    try {
      const allSlides = [];

      for (let f = 0; f < files.length; f++) {
        const file = files[f];
        const fileName = file.name.toLowerCase();
        const isPdf = fileName.endsWith('.pdf');
        const isPptx = fileName.endsWith('.pptx') || fileName.endsWith('.ppt');
        const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.webm') || fileName.endsWith('.mov') || fileName.endsWith('.mkv') || fileName.endsWith('.avi');
        const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(fileName);

        if (isPdf) {
          setLoadingText(language === 'ru' ? `Рендеринг PDF: ${file.name}...` : `PDF слайдлар юкланмоқда: ${file.name}...`);
          const pdfSlides = await loadPdfFile(file);
          allSlides.push(...pdfSlides);
        } else if (isPptx) {
          setLoadingText(language === 'ru' ? `Чтение PowerPoint: ${file.name}...` : `PowerPoint ўқилмоқда: ${file.name}...`);
          const pptxSlides = await loadPptxFile(file);
          allSlides.push(...pptxSlides);
        } else if (isVideo) {
          setLoadingText(language === 'ru' ? `Загрузка видео: ${file.name}...` : `Видео юкланмоқда: ${file.name}...`);
          const videoData = await readFileAsDataURL(file);
          allSlides.push({
            id: `video-${Date.now()}-${f}`,
            slideIndex: allSlides.length,
            title: file.name,
            subtitle: language === 'ru' ? 'Видео файл' : 'Видео файл',
            mediaType: 'video',
            mediaSrc: videoData,
            bg: 'from-black to-gray-950',
          });
        } else if (isImage) {
          const imageData = await readFileAsDataURL(file);
          allSlides.push({
            id: `img-${Date.now()}-${f}`,
            slideIndex: allSlides.length,
            title: file.name,
            subtitle: `${language === 'ru' ? 'Слайд' : 'Слайд'} ${allSlides.length + 1}`,
            mediaType: 'image',
            mediaSrc: imageData,
            bg: 'from-gray-950 to-black',
          });
        }
      }

      if (allSlides.length > 0) {
        setSlides(allSlides);
        setCurrentSlideIndex(0);
        onSlideChange(0);
        clearCanvas();

        // Broadcast to all participants in pure serializable JSON format
        socket.emit('presentation-update-deck', {
          presentation: {
            title: files[0].name,
            totalSlides: allSlides.length,
            currentSlide: 0,
            slides: allSlides,
          },
        });
      }
    } catch (err) {
      console.error('Failed to load slides file:', err);
      alert((language === 'ru' ? 'Ошибка загрузки файла: ' : 'Файлни юклашда хатолик: ') + (err.message || ''));
    } finally {
      setIsLoadingFile(false);
      setLoadingText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentSlide = slides[currentSlideIndex];

  // 1. If NO presentation slides uploaded yet, show clear Options Screen
  if (!slides || slides.length === 0) {
    return (
      <div className="relative w-full h-full flex flex-col bg-[#0f1115] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl p-6 select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {language === 'ru' ? 'Демонстрация Презентации и Слайдов' : 'Презентация ва Слайдлар Намойиши'}
              </h2>
              <p className="text-xs text-gray-400">
                {language === 'ru' ? 'Выберите наиболее удобный способ показа' : 'Қулай намойиш усулини танланг'}
              </p>
            </div>
          </div>

          <button
            onClick={onStopPresentation}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
            title={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presentation Launchpad Cards */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-3xl mx-auto w-full">
          {isLoadingFile ? (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-600/20 text-orange-500 flex items-center justify-center animate-spin">
                <Loader2 className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-white">{loadingText}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              {/* Option 1: Live PowerPoint Screen Share (The Gold Standard) */}
              <div className="bg-gradient-to-br from-orange-950/40 via-gray-900 to-black rounded-2xl p-5 border border-orange-500/40 hover:border-orange-500 flex flex-col justify-between shadow-xl transition group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/30">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-wider border border-orange-500/30">
                      {language === 'ru' ? 'Рекомендуется' : 'Тавсия этилади'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition">
                    {language === 'ru' ? 'Показ окна PowerPoint' : 'PowerPoint дастурини экранга узатиш'}
                  </h3>

                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    {language === 'ru'
                      ? 'Запустите показ слайдов в PowerPoint (клавиша F5) и поделитесь экраном. Сохранятся 100% все эффекты, анимации, шрифты и исходный дизайн.'
                      : 'PowerPoint дастурида F5 тугмасини босинг ва экранни намойиш қилинг. Барча анимациялар, жадваллар, шрифтлар 100% асл сифатда кўринади.'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    onStopPresentation();
                    if (onStartScreenShare) onStartScreenShare();
                  }}
                  className="mt-5 w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 transition flex items-center justify-center gap-2"
                >
                  <Monitor className="w-4 h-4" />
                  <span>{t.screenShareStart}</span>
                </button>
              </div>

              {/* Option 2: Upload Presentation or PDF/Images */}
              <div className="bg-gradient-to-br from-blue-950/40 via-gray-900 to-black rounded-2xl p-5 border border-blue-500/40 hover:border-blue-500 flex flex-col justify-between shadow-xl transition group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                      <FolderUp className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-500/30">
                      PDF • PPTX • Расм
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition">
                    {language === 'ru' ? 'Загрузить файл презентации' : 'Презентация файлини юклаш'}
                  </h3>

                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    {language === 'ru'
                      ? 'Загрузите PDF файл презентации, PowerPoint (.pptx), изображения слайдов или видео. Страницы будут переключаться синхронно для всех.'
                      : 'Презентациянинг PDF файлини, PowerPoint (.pptx), расмлари ёки видеони юкланг. Слайдлар барча учун синхрон намойиш этилади.'}
                  </p>
                </div>

                <label className="mt-5 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{language === 'ru' ? 'Выбрать файл с компьютера' : 'Компьютердан файлни танлаш'}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.pptx,.ppt,.mp4,.webm,.mov,.mkv,.avi,image/*"
                    onChange={handleUploadFiles}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Main Presentation Slides View (When slides are loaded)
  return (
    <div className="relative w-full h-full flex flex-col bg-[#0b0c0e] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl select-none">
      {/* Top Bar Info & Tools */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#141619] border-b border-gray-800/80 text-xs shrink-0">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded-lg bg-orange-600/30 text-orange-400 font-bold border border-orange-500/30">
            {isPresenter ? t.youArePresenting : t.presenterName(presentation?.presenterName || t.hostBadge)}
          </span>
          <span className="text-gray-300 font-medium truncate max-w-xs sm:max-w-md">
            {currentSlide?.title || presentation?.title || ''}
          </span>
        </div>

        {/* Presenter Toolbar */}
        <div className="flex items-center gap-2">
          {isPresenter && (
            <>
              {/* Laser Pointer Mode */}
              <button
                onClick={() => setToolMode(toolMode === 'laser' ? 'none' : 'laser')}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                  toolMode === 'laser'
                    ? 'bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                    : 'bg-[#1e2024] border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
                title={t.laserTool}
              >
                <Pointer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.laserTool}</span>
              </button>

              {/* Pen Annotation Mode */}
              <button
                onClick={() => setToolMode(toolMode === 'pen' ? 'none' : 'pen')}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                  toolMode === 'pen'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                    : 'bg-[#1e2024] border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
                title={t.penTool}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.penTool}</span>
              </button>

              {/* Color Picker for Pen */}
              {toolMode === 'pen' && (
                <div className="flex items-center gap-1 bg-[#1e2024] p-1 rounded-lg border border-gray-700">
                  {['#EF4444', '#3B82F6', '#10B981', '#FBBF24'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setPenColor(color)}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        penColor === color ? 'scale-125 ring-2 ring-white' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}

              {/* Clear Annotations */}
              <button
                onClick={clearCurrentDrawings}
                className="p-1.5 rounded-lg bg-[#1e2024] border border-gray-700 hover:bg-gray-700 text-gray-400 hover:text-white transition"
                title={t.clearDrawings}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Upload New Files */}
              <label
                className="p-1.5 rounded-lg bg-[#1e2024] border border-gray-700 hover:bg-gray-700 text-gray-300 cursor-pointer transition flex items-center gap-1.5"
                title="PDF, PowerPoint (.pptx), Расмлар юклаш"
              >
                {isLoadingFile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-orange-400" />
                )}
                <span className="hidden sm:inline font-medium">
                  {isLoadingFile ? t.uploading : (language === 'ru' ? 'Сменить файл' : 'Бошқа файл')}
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.pptx,.ppt,.mp4,.webm,.mov,.mkv,.avi,image/*"
                  onChange={handleUploadFiles}
                  disabled={isLoadingFile}
                  className="hidden"
                />
              </label>

              {/* Stop Presentation Button */}
              <button
                onClick={onStopPresentation}
                className="px-2.5 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-medium text-xs transition flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.stopPresentation}</span>
              </button>
            </>
          )}

          {!isPresenter && (
            <span className="text-gray-400 text-xs">
              {t.slideNumber} {currentSlideIndex + 1} / {slides.length}
            </span>
          )}
        </div>
      </div>

      {/* Main Slide Canvas Stage */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={startDrawing}
        onMouseUp={endDrawing}
        className={`relative flex-1 bg-gradient-to-br ${
          currentSlide?.bg || 'from-gray-950 to-black'
        } flex items-center justify-center overflow-hidden cursor-${
          toolMode === 'laser' ? 'crosshair' : toolMode === 'pen' ? 'crosshair' : 'default'
        }`}
      >
        {/* 1. Video Slide */}
        {currentSlide?.mediaType === 'video' ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black p-2 z-0">
            <video
              src={currentSlide.mediaSrc}
              controls
              autoPlay
              playsInline
              className="max-h-full max-w-full rounded-xl shadow-2xl"
            />
          </div>
        ) : currentSlide?.mediaType === 'image' || currentSlide?.mediaSrc ? (
          /* 2. Image / PDF Slide (100% Exact Replica of PowerPoint) */
          <div className="w-full h-full flex items-center justify-center p-3 select-none pointer-events-none">
            <img
              src={currentSlide.mediaSrc}
              alt={currentSlide.title}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-white/5"
            />
          </div>
        ) : (
          /* 3. Structured PPTX Slide Card */
          <div className="w-full h-full flex items-center justify-center p-6 select-none pointer-events-none">
            <div className="w-full max-w-3xl bg-white rounded-3xl p-8 sm:p-10 shadow-2xl text-gray-900 border border-gray-100 flex flex-col justify-center">
              <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">
                {currentSlide?.subtitle || ''}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-6 leading-tight">
                {currentSlide?.title || ''}
              </h2>

              {/* Embedded Slide Images if any */}
              {currentSlide?.images && currentSlide.images.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-3 justify-center">
                  {currentSlide.images.map((imgSrc, iIdx) => (
                    <img
                      key={iIdx}
                      src={imgSrc}
                      alt="Slide media"
                      className="max-h-48 rounded-xl object-contain shadow-md border border-gray-200"
                    />
                  ))}
                </div>
              )}

              {/* Bullet Lines */}
              {currentSlide?.lines && currentSlide.lines.length > 0 && (
                <div className="space-y-3">
                  {currentSlide.lines.map((line, lIdx) => (
                    <div key={lIdx} className="flex items-start gap-3 text-sm sm:text-base text-gray-700">
                      <span className="w-2 h-2 rounded-full bg-orange-600 mt-2 shrink-0" />
                      <span className="font-medium leading-relaxed">{line}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overlay Drawing Canvas */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Synced Glowing Laser Pointer */}
        {remoteLaser.active && (
          <div
            className="absolute pointer-events-none z-20 transition-all duration-75"
            style={{
              left: `${remoteLaser.x}%`,
              top: `${remoteLaser.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_15px_6px_rgba(239,68,68,0.9)] animate-ping" />
            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_4px_rgba(239,68,68,1)] -mt-3.5 ml-0.5" />
          </div>
        )}
      </div>

      {/* Bottom Slide Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#141619] border-t border-gray-800/80 shrink-0">
        {/* Slide Counter */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{t.slideNumber}:</span>
          <span className="font-bold text-white">
            {currentSlideIndex + 1} / {slides.length}
          </span>
        </div>

        {/* Navigation Buttons */}
        {isPresenter ? (
          <div className="flex items-center gap-3">
            <button
              onClick={prevSlide}
              disabled={currentSlideIndex === 0}
              className="p-1.5 rounded-lg bg-[#202327] hover:bg-[#2c3036] disabled:opacity-40 disabled:cursor-not-allowed text-white transition"
              title={t.prevSlide}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick Slide Dots */}
            <div className="flex items-center gap-1.5 max-w-xs overflow-x-auto py-1">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentSlideIndex(i);
                    onSlideChange(i);
                    clearCanvas();
                  }}
                  className={`h-2 rounded-full transition-all shrink-0 ${
                    currentSlideIndex === i ? 'w-6 bg-orange-500' : 'w-2 bg-gray-600 hover:bg-gray-500'
                  }`}
                  title={`${i + 1} - ${t.slideNumber}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              disabled={currentSlideIndex === slides.length - 1}
              className="p-1.5 rounded-lg bg-[#202327] hover:bg-[#2c3036] disabled:opacity-40 disabled:cursor-not-allowed text-white transition"
              title={t.nextSlide}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 max-w-xs overflow-x-auto">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all shrink-0 ${
                  currentSlideIndex === i ? 'w-5 bg-orange-500' : 'w-1.5 bg-gray-700'
                }`}
              />
            ))}
          </div>
        )}

        <div className="text-[11px] text-gray-500 hidden sm:block">
          {isPresenter ? t.slideNavigationTip : t.syncViewActive}
        </div>
      </div>
    </div>
  );
}
