import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Send,
  Sparkles,
  Package,
  AlertCircle,
  History,
  ChevronRight,
  Loader2,
  CheckCircle2,
  X,
  Image as ImageIcon,
  Video,
  Type,
  Palette,
  Music,
  Clock,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  HelpCircle,
  Menu,
  PanelRightClose,
} from 'lucide-react';

// ============================================
// 类型定义
// ============================================

type SessionPhase = 'idle' | 'intent_analysis' | 'collecting_info' | 'generating' | 'result';

interface Message {
  id: string;
  type: 'user' | 'agent';
  content?: string;
  image?: string;
  timestamp: Date;
  showForm?: boolean;
  isCompressed?: boolean;
  compressedSummary?: string;
  progress?: number;
  progressLabel?: string;
  progressComplete?: boolean;
  showResult?: boolean;
}

interface FormData {
  designType: string;
  styles: string[];
  colors: string[];
  promoText: string;
  videoDuration?: number;
  musicStyle?: string;
}

interface ProductInfo {
  name: string;
  category: string;
  color: string;
  material: string;
  price: string;
  description: string;
}

interface ExtractedProductInfo {
  name?: string;
  category?: string;
  color?: string;
  material?: string;
  price?: string;
}

interface DesignType {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface StyleOption {
  id: string;
  label: string;
}

interface ColorOption {
  id: string;
  hex: string;
  label: string;
}

interface CompressionRecord {
  id: string;
  summary: string;
  timestamp: Date;
  messageCount: number;
}

// ============================================
// 模拟数据
// ============================================

const DESIGN_TYPES: DesignType[] = [
  { id: 'main_image', label: '主图', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'detail_page', label: '详情页', icon: <Type className="w-4 h-4" /> },
  { id: 'banner', label: 'Banner', icon: <Palette className="w-4 h-4" /> },
  { id: 'video', label: '营销视频', icon: <Video className="w-4 h-4" /> },
];

const STYLE_OPTIONS: StyleOption[] = [
  { id: 'minimal', label: '简约' },
  { id: 'chinese', label: '国潮' },
  { id: 'tech', label: '科技感' },
  { id: 'cartoon', label: '卡通风' },
];

const COLOR_OPTIONS: ColorOption[] = [
  { id: 'red', hex: '#EF4444', label: '热情红' },
  { id: 'blue', hex: '#3B82F6', label: '天空蓝' },
  { id: 'green', hex: '#10B981', label: '清新绿' },
  { id: 'purple', hex: '#8B5CF6', label: '神秘紫' },
  { id: 'orange', hex: '#F59E0B', label: '活力橙' },
  { id: 'black', hex: '#1F2937', label: '经典黑' },
];

const MOCK_PRODUCT_INFO: ProductInfo = {
  name: '待识别',
  category: '待识别',
  color: '待识别',
  material: '待识别',
  price: '待填写',
  description: '请上传产品图片开始分析',
};

// ============================================
// 工具函数
// ============================================

const generateId = () => Math.random().toString(36).substr(2, 9);

const extractProductInfoFromImage = (): ExtractedProductInfo => {
  const mockProducts = [
    { name: '女士纯棉T恤', category: '女装', color: '红色', material: '纯棉', price: '¥129' },
    { name: '智能蓝牙耳机', category: '数码配件', color: '黑色', material: '塑料+金属', price: '¥299' },
    { name: '运动休闲鞋', category: '鞋靴', color: '白色', material: '帆布+橡胶', price: '¥259' },
    { name: '保湿护肤套装', category: '美妆护肤', color: '粉色', material: '液体', price: '¥399' },
  ];
  return mockProducts[Math.floor(Math.random() * mockProducts.length)];
};

const extractProductInfoFromText = (text: string): ExtractedProductInfo | null => {
  const patterns = {
    category: /(女装|男装|童装|数码|美妆|鞋靴|家居|食品|母婴)/i,
    color: /(红色|蓝色|绿色|紫色|橙色|黑色|白色|粉色|黄色)/i,
    material: /(纯棉|丝绸|皮革|塑料|金属|帆布|羊毛|羊绒)/i,
    price: /([¥￥]?\d+)/,
  };
  const result: ExtractedProductInfo = {};
  let found = false;
  if (patterns.category.test(text)) { result.category = text.match(patterns.category)?.[1]; found = true; }
  if (patterns.color.test(text)) { result.color = text.match(patterns.color)?.[1]; found = true; }
  if (patterns.material.test(text)) { result.material = text.match(patterns.material)?.[1]; found = true; }
  if (patterns.price.test(text)) { result.price = text.match(patterns.price)?.[1]; found = true; }
  return found ? result : null;
};

const generateCompressionSummary = (
  messagesToCompress: Message[],
  productInfo: ProductInfo,
  formData?: FormData,
): string => {
  const userMessages = messagesToCompress.filter(m => m.type === 'user');
  const designTypeLabel = formData?.designType ? DESIGN_TYPES.find(t => t.id === formData.designType)?.label : '';
  const styleLabels = formData?.styles?.map(s => STYLE_OPTIONS.find(o => o.id === s)?.label).filter(Boolean).join('、') || '';
  let summary = '';
  if (productInfo.category && productInfo.category !== '待识别') summary += `产品品类：${productInfo.category}`;
  if (productInfo.color && productInfo.color !== '待识别') summary += `，颜色：${productInfo.color}`;
  if (productInfo.material && productInfo.material !== '待识别') summary += `，材质：${productInfo.material}`;
  if (designTypeLabel) summary += `；设计类型：${designTypeLabel}`;
  if (styleLabels) summary += `，风格：${styleLabels}`;
  if (userMessages.length > 0) {
    if (userMessages[0].image) summary += '；用户曾上传产品图片';
    if (userMessages[0].content) summary += `；首条消息：${userMessages[0].content.slice(0, 20)}...`;
  }
  return summary || '历史对话已压缩';
};

// ============================================
// 组件：顶部工具栏
// ============================================

const ChatToolbar: React.FC<{
  onImageUpload: (file: File) => void;
  disabled?: boolean;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}> = ({ onImageUpload, disabled, onToggleSidebar, sidebarOpen }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-2 md:gap-3">
        {/* 移动端侧边栏切换 */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <motion.button
          whileHover={disabled ? {} : { scale: 1.05 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          onClick={() => { if (!disabled) fileInputRef.current?.click(); }}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl transition-all text-sm font-medium shadow-sm ${
            disabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-md hover:shadow-indigo-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">上传图片</span>
        </motion.button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { onImageUpload(f); e.target.value = ''; } }}
          className="hidden"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight">电商设计 Agent</h1>
      </div>

      {/* 桌面端侧边栏切换 */}
      <button
        onClick={onToggleSidebar}
        className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
      >
        <PanelRightClose className={`w-5 h-5 text-gray-500 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
      </button>

      <div className="w-8 md:hidden" />
    </div>
  );
};

// ============================================
// 组件：字段提示 Tooltip
// ============================================

const FieldTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex ml-1"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-indigo-500 transition-colors" />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none leading-relaxed"
          >
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-800 rotate-45 -mt-1" />
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

// ============================================
// 组件：骨架屏
// ============================================

const FormSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg ring-1 ring-black/5"
  >
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="space-y-2"
        >
          <div className="h-4 w-24 bg-gray-200/80 rounded-full animate-pulse" />
          <div className="h-11 w-full bg-gray-100/80 rounded-xl animate-pulse" />
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// ============================================
// 组件：压缩历史消息展示
// ============================================

const CompressedMessage: React.FC<{ summary: string }> = ({ summary }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-2xl p-3.5 border border-slate-200/60 shadow-sm"
    >
      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
        <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs text-gray-500 font-medium">历史已压缩</span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />}
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 pt-2 border-t border-slate-200/60"
          >
            <p className="text-xs text-gray-600 leading-relaxed">{summary}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================
// 组件：进度卡片
// ============================================

const ProgressCard: React.FC<{
  progress: number;
  label: string;
  isComplete?: boolean;
}> = ({ progress, label, isComplete }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 p-4 shadow-lg ring-1 ring-black/5 w-full max-w-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </motion.div>
          ) : (
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
          )}
          <span className="text-sm font-medium text-gray-800">{label}</span>
        </div>
        <motion.span
          key={progress}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className={`text-sm font-bold tabular-nums ${isComplete ? 'text-emerald-600' : 'text-indigo-600'}`}
        >
          {progress}%
        </motion.span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${animatedProgress}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className={`h-full rounded-full ${
            isComplete
              ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-sm shadow-emerald-200'
              : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-sm shadow-indigo-200'
          }`}
        />
      </div>
    </motion.div>
  );
};

// ============================================
// 组件：视频模拟弹窗
// ============================================

const VideoModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const totalDuration = 15;

  useEffect(() => { if (!isOpen) { setIsPlaying(false); setCurrentTime(0); } }, [isOpen]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= totalDuration) { setIsPlaying(false); return totalDuration; }
        return prev + 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const restart = () => { setCurrentTime(0); setIsPlaying(true); };
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video shadow-2xl ring-1 ring-white/10">
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  animate={{
                    background: isPlaying
                      ? [
                          'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #e94560 100%)',
                          'linear-gradient(225deg, #e94560 0%, #533483 25%, #0f3460 50%, #16213e 75%, #1a1a2e 100%)',
                          'linear-gradient(315deg, #1a1a2e 0%, #0f3460 25%, #533483 50%, #e94560 75%, #16213e 100%)',
                          'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #e94560 100%)',
                        ]
                      : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0"
                />
                {isPlaying && [0, 1, 2, 3, 4, 5].map(i => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -30, 0], x: [0, (i % 2 === 0 ? 15 : -15), 0], opacity: [0.3, 0.8, 0.3], scale: [1, 1.3, 1] }}
                    transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
                    className="absolute rounded-full bg-white/20"
                    style={{ width: 4 + i * 2, height: 4 + i * 2, left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
                  />
                ))}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div
                    animate={isPlaying ? { scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20"
                  >
                    {isPlaying ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex gap-1">
                        {[1, 2, 3].map(bar => (
                          <motion.div key={bar} animate={{ height: [8, 24, 12, 20, 8] }} transition={{ duration: 1.2, repeat: Infinity, delay: bar * 0.15 }} className="w-1 bg-white/80 rounded-full" />
                        ))}
                      </motion.div>
                    ) : (
                      <Sparkles className="w-8 h-8 text-white/60" />
                    )}
                  </motion.div>
                  <motion.p
                    animate={isPlaying ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0.5 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-white/60 text-sm mt-4 font-medium"
                  >
                    {isPlaying ? '视频播放中' : '视频模拟中'}
                  </motion.p>
                </div>
              </div>

              <div className="absolute top-0 left-0 right-0 px-4 py-3 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-xs font-medium">营销视频预览</span>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <X className="w-3.5 h-3.5 text-white" />
                  </motion.button>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/60 to-transparent">
                <div className="w-full h-1 bg-white/20 rounded-full mb-3 cursor-pointer">
                  <motion.div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full relative" style={{ width: `${(currentTime / totalDuration) * 100}%` }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
                  </motion.div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={togglePlay} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                      {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={restart} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                      <RotateCcw className="w-3.5 h-3.5 text-white/80" />
                    </motion.button>
                  </div>
                  <span className="text-white/70 text-xs font-mono">{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// 组件：生成结果展示
// ============================================

const ResultGallery: React.FC = () => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const resultImages = [
    { seed: 'ecommerce1', label: '主图' },
    { seed: 'ecommerce2', label: '详情页' },
    { seed: 'ecommerce3', label: 'Banner' },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-lg space-y-3"
      >
        <div className="grid grid-cols-3 gap-2.5">
          {resultImages.map((img, index) => (
            <motion.div
              key={img.seed}
              initial={{ opacity: 0, y: 20, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.15, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="relative group cursor-pointer"
            >
              <div className="aspect-square rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5">
                <img
                  src={`https://picsum.photos/seed/${img.seed}/400/400`}
                  alt={img.label}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.15 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent rounded-b-2xl px-2.5 py-2"
              >
                <span className="text-white text-xs font-semibold drop-shadow-sm">{img.label}</span>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.65, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="relative cursor-pointer group"
          onClick={() => setIsVideoOpen(true)}
        >
          <div className="aspect-video rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 bg-gray-900 relative">
            <div className="absolute inset-0">
              <motion.div
                animate={{
                  background: [
                    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    'linear-gradient(225deg, #0f3460 0%, #533483 50%, #1a1a2e 100%)',
                    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 group-hover:bg-white/30 transition-all shadow-xl"
              >
                <Play className="w-6 h-6 text-white ml-1" />
              </motion.div>
            </div>
            <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-lg font-mono">
              00:15
            </div>
            <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs px-2.5 py-1 rounded-lg font-semibold shadow-sm">
              营销视频
            </div>
          </div>
        </motion.div>
      </motion.div>
      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </>
  );
};

// ============================================
// 组件：流式表单
// ============================================

interface StreamingFormProps {
  onSubmit: (data: FormData) => void;
  onMissingFieldsChange?: (fields: string[]) => void;
  onProductInfoExtract?: (info: Partial<ProductInfo>) => void;
  userText?: string;
  initialData?: FormData;
}

const StreamingForm: React.FC<StreamingFormProps> = ({ onSubmit, onMissingFieldsChange, onProductInfoExtract, userText, initialData }) => {
  const [phase, setPhase] = useState<'skeleton' | 'title' | 'fields' | 'complete'>('skeleton');
  const [formData, setFormData] = useState<FormData>(initialData || { designType: '', styles: [], colors: [], promoText: '' });
  const [visibleFields, setVisibleFields] = useState<number>(0);
  const [showVideoFields, setShowVideoFields] = useState(false);

  useEffect(() => {
    if (userText && onProductInfoExtract) {
      const info = extractProductInfoFromText(userText);
      if (info) onProductInfoExtract(info);
    }
  }, [userText, onProductInfoExtract]);

  const calculateMissingFields = useCallback(() => {
    const missing: string[] = [];
    if (!formData.designType) missing.push('设计类型');
    if (formData.styles.length === 0) missing.push('风格偏好');
    if (!formData.promoText) missing.push('促销文案');
    if (showVideoFields && !formData.videoDuration) missing.push('视频时长');
    if (showVideoFields && !formData.musicStyle) missing.push('配乐风格');
    return missing;
  }, [formData, showVideoFields]);

  useEffect(() => {
    if (phase === 'fields' || phase === 'complete') onMissingFieldsChange?.(calculateMissingFields());
  }, [formData, phase, showVideoFields, onMissingFieldsChange, calculateMissingFields]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('title'), 800);
    const t2 = setTimeout(() => { setPhase('fields'); for (let i = 0; i <= 4; i++) setTimeout(() => setVisibleFields(i), i * 300); }, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleDesignTypeSelect = (type: string) => {
    setFormData(prev => ({ ...prev, designType: type }));
    if (type === 'video') {
      setTimeout(() => { setShowVideoFields(true); setVisibleFields(prev => prev + 2); }, 400);
    } else {
      setShowVideoFields(false);
      setFormData(prev => ({ ...prev, videoDuration: undefined, musicStyle: undefined }));
    }
  };

  const handleStyleToggle = (id: string) => setFormData(prev => ({ ...prev, styles: prev.styles.includes(id) ? prev.styles.filter(s => s !== id) : [...prev.styles, id] }));
  const handleColorToggle = (id: string) => setFormData(prev => ({ ...prev, colors: prev.colors.includes(id) ? prev.colors.filter(c => c !== id) : [...prev.colors, id] }));

  const handleSubmit = () => { setPhase('complete'); setTimeout(() => onSubmit(formData), 300); };
  const isFormValid = formData.designType && formData.styles.length > 0 && formData.promoText;

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 bg-white/80 transition-all';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-5 shadow-xl ring-1 ring-black/5 overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {phase === 'skeleton' && <FormSkeleton key="skeleton" />}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === 'title' || phase === 'fields' || phase === 'complete') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">请完善以下设计信息</h4>
            </motion.div>

            {/* 设计类型 */}
            <AnimatePresence>
              {visibleFields >= 1 && (phase === 'fields' || phase === 'complete') && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    设计类型 <span className="text-red-400">*</span>
                    <FieldTooltip text="我们根据您的图片分析出内容类型，但请确认最终需求" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DESIGN_TYPES.map((type) => (
                      <motion.button
                        key={type.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDesignTypeSelect(type.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                          formData.designType === type.id
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                            : 'border-gray-100 hover:border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {type.icon}
                        <span>{type.label}</span>
                        {formData.designType === type.id && <CheckCircle2 className="w-4 h-4 ml-auto text-indigo-500" />}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 风格选择 */}
            <AnimatePresence>
              {visibleFields >= 2 && (phase === 'fields' || phase === 'complete') && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    风格偏好 <span className="text-red-400">*</span>
                    <span className="text-gray-400 font-normal ml-1 normal-case">(可多选)</span>
                    <FieldTooltip text="帮助生成符合店铺调性的视觉设计" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map((style) => (
                      <motion.button
                        key={style.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStyleToggle(style.id)}
                        className={`px-3.5 py-1.5 rounded-full border-2 text-sm font-medium transition-all ${
                          formData.styles.includes(style.id)
                            ? 'border-indigo-500 bg-indigo-100 text-indigo-700 shadow-sm'
                            : 'border-gray-100 hover:border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {style.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 颜色选择 */}
            <AnimatePresence>
              {visibleFields >= 3 && (phase === 'fields' || phase === 'complete') && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    配色方案
                    <span className="text-gray-400 font-normal ml-1 normal-case">(可多选)</span>
                    <FieldTooltip text="将作为主色调应用于素材" />
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {COLOR_OPTIONS.map((color) => (
                      <motion.button
                        key={color.id}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleColorToggle(color.id)}
                        className={`w-10 h-10 rounded-xl border-2 transition-all relative shadow-sm ${
                          formData.colors.includes(color.id)
                            ? 'border-gray-800 scale-110 shadow-md'
                            : 'border-gray-100 hover:border-gray-300'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.label}
                      >
                        {formData.colors.includes(color.id) && (
                          <CheckCircle2 className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-lg" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 促销文案 */}
            <AnimatePresence>
              {visibleFields >= 4 && (phase === 'fields' || phase === 'complete') && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.15 }} className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    促销文案 <span className="text-red-400">*</span>
                    <FieldTooltip text="将展示在 Banner 或视频封面" />
                  </label>
                  <textarea
                    value={formData.promoText}
                    onChange={(e) => setFormData(prev => ({ ...prev, promoText: e.target.value }))}
                    placeholder="例如：限时优惠，买一送一！"
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 视频相关字段 */}
            <AnimatePresence>
              {showVideoFields && (
                <>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 视频时长 <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="5" max="120" value={formData.videoDuration || ''} onChange={(e) => setFormData(prev => ({ ...prev, videoDuration: parseInt(e.target.value) || undefined }))} placeholder="15" className={inputCls} />
                      <span className="text-sm text-gray-400 font-medium">秒</span>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                      <Music className="w-3 h-3" /> 配乐风格
                    </label>
                    <select value={formData.musicStyle || ''} onChange={(e) => setFormData(prev => ({ ...prev, musicStyle: e.target.value }))} className={`${inputCls} bg-white`}>
                      <option value="">请选择</option>
                      <option value="upbeat">欢快活泼</option>
                      <option value="calm">舒缓轻柔</option>
                      <option value="fashion">时尚动感</option>
                      <option value="elegant">优雅大气</option>
                    </select>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* 提交按钮 */}
            <AnimatePresence>
              {visibleFields >= 4 && (phase === 'fields' || phase === 'complete') && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: isFormValid ? 1.02 : 1 }}
                  whileTap={{ scale: isFormValid ? 0.98 : 1 }}
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                    isFormValid
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.98]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {phase === 'complete' ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />提交中...</span>
                  ) : (
                    '确认提交'
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================
// 组件：消息气泡
// ============================================

const MessageBubble: React.FC<{
  message: Message;
  onFormSubmit?: (data: FormData) => void;
  onMissingFieldsChange?: (fields: string[]) => void;
  onProductInfoExtract?: (info: Partial<ProductInfo>) => void;
  isThinking?: boolean;
}> = ({ message, onFormSubmit, onMissingFieldsChange, onProductInfoExtract, isThinking }) => {
  const isUser = message.type === 'user';
  const [userText, setUserText] = useState<string>('');
  useEffect(() => { if (message.type === 'user' && message.content) setUserText(message.content); }, [message.content, message.type]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5`}
    >
      <div className={`max-w-[80%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} flex items-start gap-2.5`}>
        <div className="relative flex-shrink-0">
          {isThinking && !isUser && (
            <motion.div
              animate={{ scale: [1, 1.8, 1.8], opacity: [0.5, 0, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 w-9 h-9 rounded-full bg-purple-400/60"
            />
          )}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
              isUser
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                : 'bg-gradient-to-br from-purple-500 to-indigo-600'
            }`}
          >
            {isUser ? <span className="text-white text-xs font-bold">我</span> : <Sparkles className="w-4 h-4 text-white" />}
          </motion.div>
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0`}>
          {message.isCompressed && message.compressedSummary ? (
            <CompressedMessage summary={message.compressedSummary} />
          ) : (
            <>
              {message.image && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="mb-2">
                  <img src={message.image} alt="上传的图片" className="max-w-[260px] md:max-w-[300px] max-h-[200px] rounded-2xl shadow-lg object-cover ring-1 ring-black/5" />
                </motion.div>
              )}

              {message.content && (
                <motion.div
                  initial={{ opacity: 0, x: isUser ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-md shadow-md shadow-indigo-200/50'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-tl-md shadow-sm ring-1 ring-black/5'
                  }`}
                >
                  {message.content}
                </motion.div>
              )}

              {message.showForm && message.type === 'agent' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-3 w-full max-w-md">
                  <StreamingForm onSubmit={onFormSubmit!} onMissingFieldsChange={onMissingFieldsChange} onProductInfoExtract={onProductInfoExtract} userText={userText} />
                </motion.div>
              )}

              {message.progress !== undefined && message.progressLabel && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-3">
                  <ProgressCard progress={message.progress} label={message.progressLabel} isComplete={message.progressComplete} />
                </motion.div>
              )}

              {message.showResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-3">
                  <ResultGallery />
                </motion.div>
              )}
            </>
          )}

          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[11px] text-gray-400 mt-1.5 px-1"
          >
            {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// 组件：底部输入框
// ============================================

const ChatInput: React.FC<{
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}> = ({ onSend, disabled, placeholder = '输入消息...' }) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => { if (inputValue.trim() && !disabled) { onSend(inputValue.trim()); setInputValue(''); } };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const adjustHeight = () => { const ta = textareaRef.current; if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; } };

  return (
    <div className="px-4 md:px-6 py-3 bg-white/80 backdrop-blur-md border-t border-gray-100 sticky bottom-0">
      <div className="flex items-end gap-2.5 max-w-3xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); adjustHeight(); }}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? '请稍候...' : placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 pr-10 bg-gray-50/80 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 text-sm transition-all"
          />
          {inputValue && !disabled && (
            <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} onClick={() => setInputValue('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!inputValue.trim() || disabled}
          className={`p-3 rounded-2xl transition-all flex-shrink-0 ${
            inputValue.trim() && !disabled
              ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200/60'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
};

// ============================================
// 组件：Agent 记忆侧边栏
// ============================================

interface AgentMemorySidebarProps {
  productInfo: ProductInfo;
  missingFields: string[];
  currentPhase: SessionPhase;
  formData?: FormData;
  compressionHistory: CompressionRecord[];
  hasCompleteInfo: boolean;
  totalMessageCount: number;
}

const AgentMemorySidebar: React.FC<AgentMemorySidebarProps> = ({
  productInfo, missingFields, currentPhase, formData, compressionHistory, hasCompleteInfo, totalMessageCount,
}) => {
  const phaseConfig: Record<SessionPhase, { label: string; dot: string; bg: string }> = {
    idle: { label: '等待输入', dot: 'bg-gray-400', bg: 'bg-gray-50 text-gray-600' },
    intent_analysis: { label: '意图分析中', dot: 'bg-amber-400', bg: 'bg-amber-50 text-amber-700' },
    collecting_info: { label: '信息收集中', dot: 'bg-blue-400', bg: 'bg-blue-50 text-blue-700' },
    generating: { label: '生成设计中', dot: 'bg-purple-400', bg: 'bg-purple-50 text-purple-700' },
    result: { label: '生成完成', dot: 'bg-emerald-400', bg: 'bg-emerald-50 text-emerald-700' },
  };
  const phase = phaseConfig[currentPhase];

  const cardCls = 'bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm ring-1 ring-black/5 border border-white/40';

  return (
    <div className="w-full md:w-80 lg:w-96 bg-gradient-to-b from-slate-50/90 to-white/90 backdrop-blur-xl border-l border-gray-200/60 flex flex-col">
      {/* 头部 */}
      <div className="px-5 py-4 border-b border-gray-200/60 bg-white/40 backdrop-blur-md">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <History className="w-3.5 h-3.5 text-white" />
          </div>
          Agent 记忆
        </h2>
        <div className="mt-2.5 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${phase.bg}`}>
            {currentPhase === 'generating' && <Loader2 className="w-3 h-3 animate-spin" />}
            <span className={`w-1.5 h-1.5 rounded-full ${phase.dot}`} />
            {phase.label}
          </span>
          <span className="text-[11px] text-gray-400">{totalMessageCount} 条消息</span>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 产品信息 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cardCls}>
          <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Package className="w-3.5 h-3.5 text-indigo-500" />
            产品信息
          </h3>
          <div className="space-y-2">
            {[
              { k: '名称', v: productInfo.name },
              { k: '品类', v: productInfo.category },
              { k: '颜色', v: productInfo.color },
              { k: '材质', v: productInfo.material },
              { k: '价格', v: productInfo.price },
            ].map(item => (
              <div key={item.k} className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{item.k}</span>
                <span className="text-xs font-medium text-gray-700">{item.v}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 已收集信息 */}
        <AnimatePresence>
          {formData && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cardCls}>
              <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                已收集信息
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">设计类型</span>
                  <span className="text-gray-700 font-medium">{DESIGN_TYPES.find(t => t.id === formData.designType)?.label || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">风格</span>
                  <span className="text-gray-700 font-medium">{formData.styles.map(s => STYLE_OPTIONS.find(o => o.id === s)?.label).join('、') || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">配色</span>
                  <div className="flex gap-1">
                    {formData.colors.map(c => (
                      <div key={c} className="w-4 h-4 rounded-md ring-1 ring-black/10" style={{ backgroundColor: COLOR_OPTIONS.find(o => o.id === c)?.hex }} />
                    ))}
                    {!formData.colors.length && <span className="text-gray-400">-</span>}
                  </div>
                </div>
                {formData.videoDuration && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">视频时长</span>
                    <span className="text-gray-700 font-medium">{formData.videoDuration}秒</span>
                  </div>
                )}
                {formData.musicStyle && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">配乐风格</span>
                    <span className="text-gray-700 font-medium">{{ upbeat: '欢快活泼', calm: '舒缓轻柔', fashion: '时尚动感', elegant: '优雅大气' }[formData.musicStyle] || '-'}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 待补充字段 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={cardCls}>
          <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            待补充字段
            {missingFields.length > 0 && (
              <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{missingFields.length}</span>
            )}
          </h3>
          <AnimatePresence mode="wait">
            {hasCompleteInfo ? (
              <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-2 text-emerald-600 py-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-semibold">信息已完整</span>
              </motion.div>
            ) : missingFields.length > 0 ? (
              <motion.div key="missing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
                {missingFields.map((field, i) => (
                  <motion.div key={field} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2 text-xs text-gray-500">
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                    {field}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-gray-400">暂无待补充字段</motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 压缩历史 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={cardCls}>
          <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Minimize2 className="w-3.5 h-3.5 text-gray-400" />
            压缩历史
            {compressionHistory.length > 0 && (
              <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{compressionHistory.length}次</span>
            )}
          </h3>
          {compressionHistory.length > 0 ? (
            <div className="space-y-2.5 max-h-48 overflow-y-auto">
              {compressionHistory.map((record, index) => (
                <motion.div key={record.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400">{record.timestamp.toLocaleTimeString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-[10px] text-gray-400">{record.messageCount}条</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{record.summary}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-300">
              <History className="w-5 h-5 mx-auto mb-1" />
              <p className="text-[11px]">暂无压缩记录</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

// ============================================
// 主应用组件
// ============================================

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [productInfo, setProductInfo] = useState<ProductInfo>(MOCK_PRODUCT_INFO);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<SessionPhase>('idle');
  const [currentFormData, setCurrentFormData] = useState<FormData | undefined>();
  const [compressionHistory, setCompressionHistory] = useState<CompressionRecord[]>([]);
  const [hasCompleteInfo, setHasCompleteInfo] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const updateProductInfo = useCallback((info: ExtractedProductInfo) => {
    setProductInfo(prev => ({ ...prev, name: info.name || prev.name, category: info.category || prev.category, color: info.color || prev.color, material: info.material || prev.material, price: info.price || prev.price }));
  }, []);

  const performCompression = useCallback(() => {
    if (messages.length <= 8) return false;
    const recentMessages = messages.slice(-5);
    const messagesToCompress = messages.slice(0, -5);
    if (messagesToCompress.length === 0) return false;
    const summary = generateCompressionSummary(messagesToCompress, productInfo, currentFormData);
    const record: CompressionRecord = { id: generateId(), summary, timestamp: new Date(), messageCount: messagesToCompress.length };
    setCompressionHistory(prev => [record, ...prev]);
    const compressedMsg: Message = { id: generateId(), type: 'agent', content: '历史消息已压缩', timestamp: new Date(), isCompressed: true, compressedSummary: summary };
    setMessages([compressedMsg, ...recentMessages]);
    return true;
  }, [messages, productInfo, currentFormData]);

  const handleImageUpload = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setMessages(prev => [...prev, { id: generateId(), type: 'user', image: imageUrl, timestamp: new Date() }]);
    setCurrentPhase('intent_analysis');
    setTimeout(() => {
      const info = extractProductInfoFromImage();
      updateProductInfo(info);
      setMissingFields(['设计类型', '风格偏好', '促销文案']);
      setMessages(prev => [...prev, {
        id: generateId(), type: 'agent',
        content: `已识别到产品信息：\n• 品类：${info.category}\n• 颜色：${info.color}\n• 材质：${info.material}\n• 价格：${info.price}\n\n请补充以下设计信息：`,
        timestamp: new Date(), showForm: true,
      }]);
      setCurrentPhase('collecting_info');
    }, 2000);
  };

  const handleFormSubmit = useCallback((data: FormData) => {
    setCurrentFormData(data);
    setHasCompleteInfo(true);
    setMissingFields([]);
    setMessages(prev => [...prev, { id: generateId(), type: 'user', content: '已提交设计需求', timestamp: new Date() }]);
    setTimeout(() => {
      setCurrentPhase('generating');
      performCompression();
      const steps = [
        { label: '正在生成主图...', progress: 30 },
        { label: '主图完成，正在排版详情页...', progress: 60 },
        { label: '正在合成 Banner...', progress: 90 },
      ];
      setMessages(prev => [...prev, { id: generateId(), type: 'agent', content: '开始生成...', timestamp: new Date() }]);
      steps.forEach((step, i) => {
        setTimeout(() => {
          setMessages(prev => [...prev, { id: generateId(), type: 'agent', timestamp: new Date(), progress: step.progress, progressLabel: step.label, progressComplete: false }]);
        }, (i + 1) * 1000);
      });
      setTimeout(() => {
        setMessages(prev => [...prev, { id: generateId(), type: 'agent', content: '全部完成！你的电商物料已就绪 🎉', timestamp: new Date(), progress: 100, progressLabel: '全部完成！你的电商物料已就绪 🎉', progressComplete: true }]);
        setTimeout(() => {
          setMessages(prev => [...prev, { id: generateId(), type: 'agent', content: '✨ 设计方案已生成！请查看预览：', timestamp: new Date(), showResult: true }]);
          setCurrentPhase('result');
        }, 600);
      }, (steps.length + 1) * 1000);
    }, 500);
  }, [performCompression]);

  const handleMissingFieldsChange = useCallback((fields: string[]) => {
    setMissingFields(fields);
    setHasCompleteInfo(fields.length === 0);
  }, []);

  const handleProductInfoExtract = useCallback((info: Partial<ProductInfo>) => {
    setProductInfo(prev => ({ ...prev, category: info.category || prev.category, color: info.color || prev.color, material: info.material || prev.material, price: info.price || prev.price }));
  }, []);

  const handleSendMessage = (text: string) => {
    setMessages(prev => [...prev, { id: generateId(), type: 'user', content: text, timestamp: new Date() }]);
    const info = extractProductInfoFromText(text);
    if (info) updateProductInfo(info);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: generateId(), type: 'agent',
        content: `收到您的消息："${text}"。${currentPhase === 'idle' ? '请上传产品图片开始设计，或详细描述您的需求。' : '我正在处理您的请求...'}`,
        timestamp: new Date(), showForm: currentPhase === 'idle' ? true : undefined,
      }]);
      if (currentPhase === 'idle') { setMissingFields(['设计类型', '风格偏好', '促销文案']); setCurrentPhase('collecting_info'); }
    }, 1000);
  };

  const placeholder = currentPhase === 'collecting_info' ? '正在等待您填写表单...' : currentPhase === 'generating' ? '正在生成中，请稍候...' : currentPhase === 'result' ? '设计已完成，可以继续对话或上传新图片' : '输入消息或上传图片...';
  const isInputDisabled = ['intent_analysis', 'generating'].includes(currentPhase);
  const totalMessageCount = messages.length + compressionHistory.reduce((s, r) => s + r.messageCount, 0);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
      {/* 聊天区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatToolbar onImageUpload={handleImageUpload} disabled={isInputDisabled} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-8 shadow-2xl shadow-indigo-300/40 ring-1 ring-white/20"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">欢迎使用电商设计助手</h2>
                <p className="text-gray-400 mb-10 max-w-sm text-sm leading-relaxed">
                  上传产品图片，AI 将自动识别并为您生成专业的电商设计物料
                </p>
                <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-xs text-gray-400">
                  {[
                    { icon: <ImageIcon className="w-4 h-4" />, label: '主图设计' },
                    { icon: <Type className="w-4 h-4" />, label: '详情页' },
                    { icon: <Video className="w-4 h-4" />, label: '营销视频' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 border border-gray-100 shadow-sm">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onFormSubmit={handleFormSubmit}
                  onMissingFieldsChange={handleMissingFieldsChange}
                  onProductInfoExtract={handleProductInfoExtract}
                  isThinking={currentPhase === 'intent_analysis'}
                />
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        <ChatInput onSend={handleSendMessage} disabled={isInputDisabled} placeholder={placeholder} />
      </div>

      {/* 侧边栏 - 桌面端固定 / 移动端底部抽屉 */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* 移动端遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
              onClick={() => setSidebarOpen(false)}
            />
            {/* 侧边栏本体 */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed md:static right-0 top-0 bottom-0 z-40 md:z-auto"
            >
              <AgentMemorySidebar
                productInfo={productInfo}
                missingFields={missingFields}
                currentPhase={currentPhase}
                formData={currentFormData}
                compressionHistory={compressionHistory}
                hasCompleteInfo={hasCompleteInfo}
                totalMessageCount={totalMessageCount}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
